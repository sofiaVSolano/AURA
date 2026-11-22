import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { crearApp, VERSION_CONSENTIMIENTO } from '../src/app.ts';
import { leerConfig } from '../src/config.ts';

const ORIGEN = 'http://localhost:4046';
let servidor: Server;
let base = '';
let app: ReturnType<typeof crearApp>;

before(async () => {
  app = crearApp(leerConfig({ RUTA_BD: ':memory:', ORIGENES_PERMITIDOS: ORIGEN, COOKIE_SEGURA: 'false', LIMITE_REGISTRO: '1000' } as NodeJS.ProcessEnv));
  servidor = createServer((req, res) => void app.manejar(req, res));
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  const dir = servidor.address();
  base = `http://127.0.0.1:${typeof dir === 'object' && dir ? dir.port : 0}`;
});
after(() => {
  servidor.close();
  app.cerrar();
});

interface Opciones {
  cookie?: string;
  csrf?: string;
  origen?: string | null;
  tipo?: string;
  crudo?: string;
}
async function pedir(metodo: string, ruta: string, cuerpo?: unknown, o: Opciones = {}) {
  const h: Record<string, string> = {};
  if (o.origen !== null) h.Origin = o.origen ?? ORIGEN;
  if (o.cookie) h.Cookie = o.cookie;
  if (o.csrf) h['X-CSRF-Token'] = o.csrf;
  if (cuerpo !== undefined || o.crudo) h['Content-Type'] = o.tipo ?? 'application/json';
  const r = await fetch(base + ruta, { method: metodo, headers: h, body: o.crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)) });
  const texto = await r.text();
  return { estado: r.status, cuerpo: texto ? JSON.parse(texto) : null, cabeceras: r.headers };
}

const registro = (correo: string, contrasena = 'una-clave-larga-123') =>
  pedir('POST', '/api/auth/registro', { correo, contrasena, consentimiento: true, versionConsentimiento: VERSION_CONSENTIMIENTO });
async function cuenta(correo: string) {
  const r = await registro(correo);
  assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
  const cookie = (r.cabeceras.get('set-cookie') ?? '').split(';')[0]!;
  return { cookie, csrf: r.cuerpo.csrf as string };
}

test('salud y cabeceras seguras', async () => {
  const r = await pedir('GET', '/api/salud');
  assert.equal(r.estado, 200);
  assert.equal(r.cabeceras.get('x-content-type-options'), 'nosniff');
  assert.equal(r.cabeceras.get('cache-control'), 'no-store');
  assert.match(r.cabeceras.get('content-security-policy') ?? '', /default-src 'none'/);
  assert.equal((await pedir('GET', '/api/nada')).estado, 404);
  assert.equal((await pedir('DELETE', '/api/salud')).estado, 405);
});

test('registro: validaciones, consentimiento, cookie segura y correo único', async () => {
  assert.equal((await registro('no-es-correo')).estado, 422);
  assert.equal((await registro('a@b.co', 'corta')).estado, 422);
  const sinConsentimiento = await pedir('POST', '/api/auth/registro', { correo: 'x@aura.test', contrasena: 'una-clave-larga-123', consentimiento: false });
  assert.equal(sinConsentimiento.estado, 422);
  const r = await registro('Ana@Aura.test');
  assert.equal(r.estado, 201);
  const sc = r.cabeceras.get('set-cookie') ?? '';
  assert.match(sc, /HttpOnly/);
  assert.match(sc, /SameSite=Lax/);
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /hash|scrypt/);
  assert.equal((await registro('ana@aura.test')).estado, 409, 'el correo no distingue mayúsculas');
  assert.equal((await registro("x' OR 1=1 --@a.co")).estado, 422, 'entradas maliciosas se rechazan por validación');
});

test('sesión: yo, CSRF y origen', async () => {
  const { cookie, csrf } = await cuenta('sesion@aura.test');
  assert.equal((await pedir('GET', '/api/auth/yo', undefined, { cookie })).estado, 200);
  const anonimo = await pedir('GET', '/api/auth/yo');
  assert.equal(anonimo.estado, 200);
  assert.equal(anonimo.cuerpo.usuario, null, 'sin sesión: usuario null (no es un error)');
  const estado = { version: 1, guardados: [], vistos: {}, aprendizajes: [] };
  assert.equal((await pedir('PUT', '/api/datos/emocional', { estado }, { cookie })).estado, 403, 'sin token CSRF');
  assert.equal((await pedir('PUT', '/api/datos/emocional', { estado }, { cookie, csrf, origen: 'https://malicioso.example' })).estado, 403, 'origen ajeno');
  assert.equal((await pedir('PUT', '/api/datos/emocional', { estado }, { cookie, csrf, origen: null })).estado, 403, 'sin origen');
  assert.equal((await pedir('PUT', '/api/datos/emocional', { estado }, { cookie, csrf })).estado, 204);
});

test('datos: validación por módulo y Mi AURA sin experiencias del cliente', async () => {
  const { cookie, csrf } = await cuenta('datos@aura.test');
  assert.equal((await pedir('PUT', '/api/datos/emocional', { estado: { version: 9 } }, { cookie, csrf })).estado, 422);
  assert.equal((await pedir('PUT', '/api/datos/otro', { estado: {} }, { cookie, csrf })).estado, 404);
  const tramposo = {
    version: 1,
    preferencias: { nombre: 'Lumi', colorPrincipal: 'rosa', colorComplementario: 'menta', forma: 'nube', expresion: 'alegre', decoraciones: [] },
    onboarding: { completado: true, momentoProyecto: null, fechaInicio: '2026-11-01T10:00:00.000Z' },
    experiencias: Array.from({ length: 20 }, (_, i) => ({ id: `exp-trampa-${String(i).padStart(4, '0')}`, tipo: 'ejercicio-completado', dimension: 'academica', refId: `lab:x/${i}`, fecha: '2026-11-02T10:00:00.000Z' })),
    ultimaEtapaVista: 'origen',
  };
  assert.equal((await pedir('PUT', '/api/datos/mi-aura', { estado: tramposo }, { cookie, csrf })).estado, 204);
  const g = await pedir('GET', '/api/datos', undefined, { cookie });
  assert.equal(g.cuerpo['mi-aura'].preferencias.nombre, 'Lumi');
  assert.equal(g.cuerpo['mi-aura'].experiencias.length, 0, 'el cliente no puede concederse progreso');
});

test('experiencias: solo cuentan si apuntan a contenido real, una vez, con dimensión calculada en el servidor', async () => {
  const { cookie, csrf } = await cuenta('progreso@aura.test');
  const exp = (tipo: string, refId: string, dimension = 'emocional') => pedir('POST', '/api/experiencias', { tipo, refId, dimension }, { cookie, csrf });
  assert.equal((await exp('ejercicio-completado', 'lab:no-existe/x')).estado, 422);
  assert.equal((await exp('contenido-explorado', 'video:emocional.tengo-miedo.hablar-en-publico')).estado, 422, 'un video no publicado no se puede haber visto');
  assert.equal((await exp('experiencia-compartida', 'algo')).estado, 422);
  assert.equal((await exp('clics', 'x')).estado, 422);
  const ok = await exp('ejercicio-completado', 'lab:resumen/ordenar-fragmentos');
  assert.equal(ok.estado, 201);
  assert.equal(ok.cuerpo.experiencias[0].dimension, 'academica', 'ignora la dimensión que envía el cliente');
  const repetida = await exp('ejercicio-completado', 'lab:resumen/ordenar-fragmentos');
  assert.equal(repetida.estado, 200);
  assert.equal(repetida.cuerpo.registrada, false);
  assert.equal((await exp('sustentacion-practicada', 'sim:metodo')).estado, 201);
  assert.equal((await exp('avance-academico', 'avance:resumen')).estado, 201);
  const r = await exp('reflexion-registrada', 'aprendizaje:emocional.tengo-miedo.hablar-en-publico');
  assert.equal(r.estado, 201);
  assert.equal(r.cuerpo.etapa, 'descubrimiento', 'la etapa la calcula el servidor');
});

test('cuerpos: tipo, tamaño y JSON inválido', async () => {
  const { cookie, csrf } = await cuenta('cuerpo@aura.test');
  assert.equal((await pedir('PUT', '/api/datos/emocional', undefined, { cookie, csrf, crudo: 'x', tipo: 'text/plain' })).estado, 415);
  assert.equal((await pedir('PUT', '/api/datos/emocional', undefined, { cookie, csrf, crudo: '{malo' })).estado, 400);
  const grande = JSON.stringify({ estado: { relleno: 'x'.repeat(300 * 1024) } });
  assert.equal((await pedir('PUT', '/api/datos/emocional', undefined, { cookie, csrf, crudo: grande })).estado, 413);
});

test('ingreso: mensaje genérico y límite de intentos', async () => {
  await cuenta('ingreso@aura.test');
  const mal = await pedir('POST', '/api/auth/ingreso', { correo: 'ingreso@aura.test', contrasena: 'equivocada-123' });
  const inexistente = await pedir('POST', '/api/auth/ingreso', { correo: 'nadie@aura.test', contrasena: 'equivocada-123' });
  assert.equal(mal.estado, 401);
  assert.equal(mal.cuerpo.mensaje, inexistente.cuerpo.mensaje, 'no revela si la cuenta existe');
  assert.equal((await pedir('POST', '/api/auth/ingreso', { correo: 'ingreso@aura.test', contrasena: 'una-clave-larga-123' })).estado, 200);
  let ultimo = 0;
  for (let i = 0; i < 9; i++) ultimo = (await pedir('POST', '/api/auth/ingreso', { correo: 'bloqueo@aura.test', contrasena: 'x-intento-' + i })).estado;
  assert.equal(ultimo, 429);
});

test('exportar, cerrar sesión y borrar cuenta (con todos sus datos)', async () => {
  const { cookie, csrf } = await cuenta('borrar@aura.test');
  await pedir('POST', '/api/experiencias', { tipo: 'avance-academico', refId: 'avance:objetivos' }, { cookie, csrf });
  const ex = await pedir('GET', '/api/cuenta/exportar', undefined, { cookie });
  assert.equal(ex.estado, 200);
  assert.match(ex.cabeceras.get('content-disposition') ?? '', /attachment/);
  assert.equal(ex.cuerpo.datos['mi-aura'].experiencias.length, 1, 'exporta las experiencias aunque aún no haya preferencias guardadas');
  assert.doesNotMatch(JSON.stringify(ex.cuerpo), /scrypt/);
  assert.equal((await pedir('DELETE', '/api/cuenta', { contrasena: 'no-es-esta-123' }, { cookie, csrf })).estado, 401);
  assert.equal((await pedir('DELETE', '/api/cuenta', { contrasena: 'una-clave-larga-123' }, { cookie, csrf })).estado, 204);
  assert.equal((await pedir('GET', '/api/auth/yo', undefined, { cookie })).cuerpo.usuario, null);
  assert.equal((await pedir('POST', '/api/auth/ingreso', { correo: 'borrar@aura.test', contrasena: 'una-clave-larga-123' })).estado, 401);
  const restos = app.db.prepare("SELECT (SELECT COUNT(*) FROM experiencias e JOIN usuarios u ON u.id = e.usuario_id WHERE u.correo = 'borrar@aura.test') n").get() as { n: number };
  assert.equal(restos.n, 0);

  const otra = await cuenta('salida@aura.test');
  assert.equal((await pedir('POST', '/api/auth/salida', undefined, otra)).estado, 204);
  assert.equal((await pedir('GET', '/api/auth/yo', undefined, { cookie: otra.cookie })).cuerpo.usuario, null, 'la sesión cerrada ya no sirve');
});

test('límite de registros por IP (frena la creación masiva de cuentas)', async () => {
  const limitada = crearApp(leerConfig({ RUTA_BD: ':memory:', ORIGENES_PERMITIDOS: ORIGEN, COOKIE_SEGURA: 'false', LIMITE_REGISTRO: '2' } as NodeJS.ProcessEnv));
  const s = createServer((req, res) => void limitada.manejar(req, res));
  await new Promise<void>((ok) => s.listen(0, '127.0.0.1', ok));
  const dir = s.address();
  const url = `http://127.0.0.1:${typeof dir === 'object' && dir ? dir.port : 0}/api/auth/registro`;
  const estados: number[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { method: 'POST', headers: { Origin: ORIGEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: `masivo${i}@aura.test`, contrasena: 'una-clave-larga-123', consentimiento: true, versionConsentimiento: VERSION_CONSENTIMIENTO }) });
    estados.push(r.status);
  }
  s.close();
  limitada.cerrar();
  assert.deepEqual(estados, [201, 201, 429]);
});

test('CORS solo para el origen del frontend', async () => {
  const ok = await fetch(base + '/api/datos', { method: 'OPTIONS', headers: { Origin: ORIGEN } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), ORIGEN);
  const no = await fetch(base + '/api/datos', { method: 'OPTIONS', headers: { Origin: 'https://otro.example' } });
  assert.equal(no.status, 403);
  assert.equal(no.headers.get('access-control-allow-origin'), null);
});

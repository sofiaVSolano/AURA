// API de AURA. Sin frameworks: un enrutador mínimo sobre node:http.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { calcularEvolucion } from '../../frontend/src/features/mi-aura/dominio/evolucion.ts';
import { ESTADO_INICIAL, LISTA_TIPOS, type EstadoAura, type Experiencia, type TipoExperiencia } from '../../frontend/src/features/mi-aura/dominio/modelo.ts';
import { esExperienciaValida, validarEstadoAura } from '../../frontend/src/features/mi-aura/dominio/validar.ts';
import { validarEstadoEmocional } from '../../frontend/src/features/emocional/dominio/estadoEmocional.ts';
import { validarEstadoAcademico } from '../../frontend/src/features/academica/dominio/estadoAcademico.ts';
import {
  buscarSesion,
  cerrarSesion,
  crearSesion,
  hashContrasena,
  hashRelleno,
  limpiarSesionesVencidas,
  nuevoId,
  validarContrasena,
  validarCorreo,
  verificarContrasena,
  type Sesion,
} from './auth.ts';
import { abrirBd } from './bd.ts';
import type { Config } from './config.ts';
import { cargarContenido, referenciaValida } from './contenido.ts';
import { cookie, ErrorHttp, leerCookies, leerJson, responder } from './http.ts';
import { aplicarCors, crearLimitador, ipCliente, verificarOrigen } from './seguridad.ts';

/** Versión del consentimiento: fuente única compartida con el formulario del frontend. */
export { VERSION_CONSENTIMIENTO } from '../../frontend/src/lib/consentimiento.ts';
import { VERSION_CONSENTIMIENTO } from '../../frontend/src/lib/consentimiento.ts';
const MODULOS = ['mi-aura', 'emocional', 'academica'] as const;
type Modulo = (typeof MODULOS)[number];
const VALIDADORES: Record<Modulo, (d: unknown) => { ok: boolean; errores?: string[]; valor?: unknown }> = {
  'mi-aura': (d) => {
    const r = validarEstadoAura(d);
    return r.ok ? { ok: true, valor: r.valor.estado } : r;
  },
  emocional: validarEstadoEmocional,
  academica: validarEstadoAcademico,
};

interface Contexto {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  ip: string;
}
type Manejador = (c: Contexto) => Promise<void>;

export function crearApp(config: Config) {
  const db = abrirBd(config.rutaBd);
  const contenido = cargarContenido(config.rutaContenido);
  const nombreCookie = config.cookieSegura ? '__Host-aura_sesion' : 'aura_sesion';
  const limiteGeneral = crearLimitador(300, 60_000);
  const limiteIngreso = crearLimitador(8, 15 * 60_000);
  const limiteRegistro = crearLimitador(config.limiteRegistro, 60 * 60_000);
  const limiteExperiencias = crearLimitador(120, 60 * 60_000);
  const limpieza = setInterval(() => limpiarSesionesVencidas(db), 60 * 60_000);
  limpieza.unref();

  const sesionDe = (req: IncomingMessage) => buscarSesion(db, leerCookies(req)[nombreCookie]);
  const exigirSesion = (req: IncomingMessage, conCsrf = true): Sesion => {
    const s = sesionDe(req);
    if (!s) throw new ErrorHttp(401, 'sin_sesion', 'Inicia sesión para continuar.');
    if (conCsrf && req.headers['x-csrf-token'] !== s.csrf) throw new ErrorHttp(403, 'csrf', 'La sesión no es válida. Recarga la página.');
    return s;
  };
  const fijarCookie = (res: ServerResponse, token: string) =>
    res.setHeader('Set-Cookie', cookie(nombreCookie, token, { maxAge: config.diasSesion * 86_400, segura: config.cookieSegura }));
  const borrarCookie = (res: ServerResponse) => res.setHeader('Set-Cookie', cookie(nombreCookie, '', { maxAge: 0, segura: config.cookieSegura }));

  const experienciasDe = (usuarioId: string): Experiencia[] =>
    (
      db.prepare('SELECT id, tipo, dimension, ref_id, fecha FROM experiencias WHERE usuario_id = ? ORDER BY fecha, id').all(usuarioId) as Array<{
        id: string;
        tipo: TipoExperiencia;
        dimension: 'emocional' | 'academica';
        ref_id: string;
        fecha: string;
      }>
    ).map((e) => ({ id: e.id, tipo: e.tipo, dimension: e.dimension, refId: e.ref_id, fecha: e.fecha }));

  /** El estado de Mi AURA siempre lleva las experiencias del servidor (nunca las del cliente). */
  const leerModulo = (usuarioId: string, modulo: Modulo): unknown => {
    const fila = db.prepare('SELECT estado FROM datos WHERE usuario_id = ? AND modulo = ?').get(usuarioId, modulo) as { estado: string } | undefined;
    if (modulo === 'mi-aura') {
      const experiencias = experienciasDe(usuarioId);
      if (!fila && experiencias.length === 0) return null;
      // Si aún no guardó preferencias pero ya tiene experiencias (p. ej. hizo un laboratorio antes del onboarding).
      const base = fila ? (JSON.parse(fila.estado) as EstadoAura) : ESTADO_INICIAL;
      return { ...base, experiencias };
    }
    return fila ? JSON.parse(fila.estado) : null;
  };

  const rutas: Array<[string, RegExp, Manejador]> = [];
  const ruta = (metodo: string, patron: string, m: Manejador) =>
    rutas.push([metodo, new RegExp(`^${patron.replace(/:(\w+)/g, '(?<$1>[a-z0-9-]+)')}$`), m]);

  ruta('GET', '/api/salud', async ({ res }) => responder(res, 200, { ok: true }));

  // — Cuentas —
  ruta('POST', '/api/auth/registro', async ({ req, res, ip }) => {
    limiteRegistro.consumir(ip);
    const d = (await leerJson(req, 4096)) as Record<string, unknown>;
    const correo = typeof d.correo === 'string' ? d.correo.trim().toLowerCase() : '';
    if (!validarCorreo(correo)) throw new ErrorHttp(422, 'correo_invalido', 'Escribe un correo válido.');
    const errorClave = validarContrasena(d.contrasena);
    if (errorClave) throw new ErrorHttp(422, 'contrasena_invalida', errorClave);
    if (d.consentimiento !== true || d.versionConsentimiento !== VERSION_CONSENTIMIENTO) {
      throw new ErrorHttp(422, 'sin_consentimiento', 'Para crear la cuenta necesitamos tu consentimiento.');
    }
    if (db.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo)) {
      throw new ErrorHttp(409, 'correo_en_uso', 'Ya existe una cuenta con ese correo. Inicia sesión.');
    }
    const id = nuevoId();
    const ahora = new Date().toISOString();
    db.prepare('INSERT INTO usuarios (id, correo, hash, creado, consentimiento_version, consentimiento_fecha) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      correo,
      await hashContrasena(d.contrasena as string),
      ahora,
      VERSION_CONSENTIMIENTO,
      ahora,
    );
    const s = crearSesion(db, id, config.diasSesion);
    fijarCookie(res, s.token);
    responder(res, 201, { usuario: { correo }, csrf: s.csrf }, { 'Set-Cookie': res.getHeader('Set-Cookie') as string });
  });

  ruta('POST', '/api/auth/ingreso', async ({ req, res, ip }) => {
    const d = (await leerJson(req, 4096)) as Record<string, unknown>;
    const correo = typeof d.correo === 'string' ? d.correo.trim().toLowerCase() : '';
    limiteIngreso.consumir(`${ip}|${correo}`);
    const fila = validarCorreo(correo)
      ? (db.prepare('SELECT id, hash FROM usuarios WHERE correo = ?').get(correo) as { id: string; hash: string } | undefined)
      : undefined;
    const clave = typeof d.contrasena === 'string' ? d.contrasena.slice(0, 128) : '';
    // Siempre se verifica un hash (real o de relleno): mismo tiempo exista o no la cuenta.
    const valida = await verificarContrasena(clave, fila?.hash ?? (await hashRelleno()));
    if (!fila || !valida) throw new ErrorHttp(401, 'credenciales', 'El correo o la contraseña no coinciden.');
    limiteIngreso.reiniciar(`${ip}|${correo}`);
    const s = crearSesion(db, fila.id, config.diasSesion);
    fijarCookie(res, s.token);
    responder(res, 200, { usuario: { correo }, csrf: s.csrf }, { 'Set-Cookie': res.getHeader('Set-Cookie') as string });
  });

  ruta('POST', '/api/auth/salida', async ({ req, res }) => {
    const s = exigirSesion(req);
    cerrarSesion(db, s.tokenHash);
    borrarCookie(res);
    responder(res, 204, undefined, { 'Set-Cookie': res.getHeader('Set-Cookie') as string });
  });

  // Sin sesión responde 200 con usuario null: visitar AURA sin cuenta es lo normal, no un error.
  ruta('GET', '/api/auth/yo', async ({ req, res }) => {
    const s = sesionDe(req);
    responder(res, 200, s ? { usuario: { correo: s.correo }, csrf: s.csrf } : { usuario: null });
  });

  // — Datos personales (sincronización) —
  ruta('GET', '/api/datos', async ({ req, res }) => {
    const s = exigirSesion(req, false);
    const datos = Object.fromEntries(MODULOS.map((m) => [m, leerModulo(s.usuarioId, m)]));
    responder(res, 200, datos);
  });

  ruta('PUT', '/api/datos/:modulo', async ({ req, res, params }) => {
    const s = exigirSesion(req);
    const modulo = params.modulo as Modulo;
    if (!MODULOS.includes(modulo)) throw new ErrorHttp(404, 'no_encontrado', 'Módulo desconocido.');
    const d = (await leerJson(req)) as { estado?: unknown };
    const v = VALIDADORES[modulo](d.estado);
    if (!v.ok) throw new ErrorHttp(422, 'datos_invalidos', 'Los datos enviados no son válidos.');
    // Las experiencias de Mi AURA no se aceptan aquí: solo por /api/experiencias (validadas).
    const estado = modulo === 'mi-aura' ? { ...(v.valor as EstadoAura), experiencias: [] } : v.valor;
    db.prepare(
      `INSERT INTO datos (usuario_id, modulo, estado, actualizado) VALUES (?, ?, ?, ?)
       ON CONFLICT (usuario_id, modulo) DO UPDATE SET estado = excluded.estado, actualizado = excluded.actualizado`,
    ).run(s.usuarioId, modulo, JSON.stringify(estado), new Date().toISOString());
    responder(res, 204);
  });

  ruta('DELETE', '/api/datos/:modulo', async ({ req, res, params }) => {
    const s = exigirSesion(req);
    const modulo = params.modulo as Modulo;
    if (!MODULOS.includes(modulo)) throw new ErrorHttp(404, 'no_encontrado', 'Módulo desconocido.');
    db.prepare('DELETE FROM datos WHERE usuario_id = ? AND modulo = ?').run(s.usuarioId, modulo);
    if (modulo === 'mi-aura') db.prepare('DELETE FROM experiencias WHERE usuario_id = ?').run(s.usuarioId);
    responder(res, 204);
  });

  // — Progreso: el servidor decide si una experiencia cuenta —
  ruta('POST', '/api/experiencias', async ({ req, res }) => {
    const s = exigirSesion(req);
    limiteExperiencias.consumir(s.usuarioId);
    const d = (await leerJson(req, 2048)) as Record<string, unknown>;
    const tipo = d.tipo as TipoExperiencia;
    const refId = typeof d.refId === 'string' ? d.refId : '';
    if (!LISTA_TIPOS.includes(tipo)) throw new ErrorHttp(422, 'experiencia_invalida', 'Tipo de experiencia desconocido.');
    const dimension = referenciaValida(contenido, tipo, refId);
    if (!dimension) throw new ErrorHttp(422, 'experiencia_invalida', 'La experiencia no corresponde a un contenido disponible.');
    const nueva: Experiencia = { id: nuevoId(), tipo, dimension, refId, fecha: new Date().toISOString() };
    if (!esExperienciaValida(nueva)) throw new ErrorHttp(422, 'experiencia_invalida', 'La experiencia no es válida.');
    const r = db
      .prepare('INSERT OR IGNORE INTO experiencias (id, usuario_id, tipo, dimension, ref_id, fecha) VALUES (?, ?, ?, ?, ?, ?)')
      .run(nueva.id, s.usuarioId, tipo, dimension, refId, nueva.fecha);
    const experiencias = experienciasDe(s.usuarioId);
    const ev = calcularEvolucion(experiencias);
    responder(res, r.changes === 0 ? 200 : 201, { registrada: r.changes > 0, experiencias, etapa: ev.etapa.id });
  });

  // — Derechos sobre los datos —
  ruta('GET', '/api/cuenta/exportar', async ({ req, res }) => {
    const s = exigirSesion(req, false);
    const u = db.prepare('SELECT correo, creado, consentimiento_version, consentimiento_fecha FROM usuarios WHERE id = ?').get(s.usuarioId);
    const datos = Object.fromEntries(MODULOS.map((m) => [m, leerModulo(s.usuarioId, m)]));
    responder(res, 200, { exportado: new Date().toISOString(), cuenta: u, datos }, {
      'Content-Disposition': 'attachment; filename="mis-datos-aura.json"',
    });
  });

  ruta('DELETE', '/api/cuenta', async ({ req, res, ip }) => {
    const s = exigirSesion(req);
    limiteIngreso.consumir(`${ip}|borrar|${s.usuarioId}`);
    const d = (await leerJson(req, 1024)) as Record<string, unknown>;
    const fila = db.prepare('SELECT hash FROM usuarios WHERE id = ?').get(s.usuarioId) as { hash: string };
    if (typeof d.contrasena !== 'string' || !(await verificarContrasena(d.contrasena.slice(0, 128), fila.hash))) {
      throw new ErrorHttp(401, 'credenciales', 'La contraseña no coincide.');
    }
    // ON DELETE CASCADE elimina sesiones, datos y experiencias.
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(s.usuarioId);
    borrarCookie(res);
    responder(res, 204, undefined, { 'Set-Cookie': res.getHeader('Set-Cookie') as string });
  });

  async function manejar(req: IncomingMessage, res: ServerResponse) {
    const ip = ipCliente(req, config.confiarProxy);
    try {
      if (aplicarCors(req, res, config.origenesPermitidos)) return;
      limiteGeneral.consumir(ip);
      const ruta = (req.url ?? '/').split('?')[0] ?? '/';
      const candidatas = rutas.filter(([, re]) => re.test(ruta));
      if (candidatas.length === 0) throw new ErrorHttp(404, 'no_encontrado', 'Recurso no encontrado.');
      const coincide = candidatas.find(([m]) => m === req.method);
      if (!coincide) throw new ErrorHttp(405, 'metodo_no_permitido', 'Método no permitido.');
      verificarOrigen(req, config.origenesPermitidos);
      const params = coincide[1].exec(ruta)?.groups ?? {};
      await coincide[2]({ req, res, params, ip });
    } catch (e) {
      if (e instanceof ErrorHttp) {
        if (!res.headersSent) responder(res, e.estado, { codigo: e.codigo, mensaje: e.message });
      } else {
        // Sin detalles internos ni datos personales en la respuesta ni en el registro.
        console.error(`[api] error interno en ${req.method} ${(req.url ?? '').split('?')[0]}:`, e instanceof Error ? e.message : e);
        if (!res.headersSent) responder(res, 500, { codigo: 'interno', mensaje: 'Algo salió mal. Inténtalo de nuevo.' });
      }
    }
  }

  return {
    manejar,
    db,
    cerrar: () => {
      clearInterval(limpieza);
      db.close();
    },
  };
}

// Cuenta de prueba compartida: se crea al arrancar, sus credenciales se publican solo si
// el servidor las configuró, permite entrar y nadie puede eliminarla desde la app.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { crearApp } from '../src/app.ts';
import { leerConfig } from '../src/config.ts';

const ORIGEN = 'http://localhost:4046';
const CORREO = 'prueba@aura.test';
const CLAVE = 'clave-de-prueba-123';

interface Instancia {
  servidor: Server;
  app: ReturnType<typeof crearApp>;
  base: string;
}
const instancias: Instancia[] = [];

async function levantar(env: Record<string, string>): Promise<Instancia> {
  const app = crearApp(leerConfig({ RUTA_BD: ':memory:', ORIGENES_PERMITIDOS: ORIGEN, COOKIE_SEGURA: 'false', ...env } as NodeJS.ProcessEnv));
  const servidor = createServer((req, res) => void app.manejar(req, res));
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  const dir = servidor.address();
  const i = { servidor, app, base: `http://127.0.0.1:${typeof dir === 'object' && dir ? dir.port : 0}` };
  instancias.push(i);
  return i;
}

let conPrueba: Instancia;
let sinPrueba: Instancia;
before(async () => {
  conPrueba = await levantar({ CUENTA_PRUEBA_CORREO: CORREO, CUENTA_PRUEBA_CLAVE: CLAVE });
  sinPrueba = await levantar({});
});
after(() => {
  for (const i of instancias) {
    i.servidor.close();
    i.app.cerrar();
  }
});

const pedir = async (i: Instancia, metodo: string, ruta: string, cuerpo?: unknown, h: Record<string, string> = {}) => {
  const r = await fetch(i.base + ruta, {
    method: metodo,
    headers: { Origin: ORIGEN, ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }), ...h },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, cuerpo: texto ? JSON.parse(texto) : null, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0]! };
};

test('sin configurar no hay cuenta de prueba', async () => {
  const r = await pedir(sinPrueba, 'GET', '/api/auth/prueba');
  assert.equal(r.estado, 200);
  assert.deepEqual(r.cuerpo, { disponible: false });
});

test('configurada: publica sus credenciales y permite entrar', async () => {
  const p = await pedir(conPrueba, 'GET', '/api/auth/prueba');
  assert.equal(p.estado, 200);
  assert.deepEqual(p.cuerpo, { disponible: true, correo: CORREO, contrasena: CLAVE });
  const ingreso = await pedir(conPrueba, 'POST', '/api/auth/ingreso', { correo: p.cuerpo.correo, contrasena: p.cuerpo.contrasena });
  assert.equal(ingreso.estado, 200);
  assert.equal(ingreso.cuerpo.usuario.correo, CORREO);
});

test('la cuenta de prueba no se puede eliminar', async () => {
  const ingreso = await pedir(conPrueba, 'POST', '/api/auth/ingreso', { correo: CORREO, contrasena: CLAVE });
  const borrar = await pedir(conPrueba, 'DELETE', '/api/cuenta', { contrasena: CLAVE }, { Cookie: ingreso.cookie, 'X-CSRF-Token': ingreso.cuerpo.csrf });
  assert.equal(borrar.estado, 403);
  assert.equal(borrar.cuerpo.error ?? borrar.cuerpo.codigo, 'cuenta_prueba');
  assert.equal((await pedir(conPrueba, 'POST', '/api/auth/ingreso', { correo: CORREO, contrasena: CLAVE })).estado, 200, 'sigue existiendo');
});

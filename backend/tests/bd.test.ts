// Base de datos: migraciones desde el esquema más viejo, llaves incrementales,
// ida y vuelta estado ⇄ tablas, restricciones y borrado en cascada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBd, VERSION_ESQUEMA } from '../src/bd.ts';
import { borrarModulo, escribirModulo, leerModulo } from '../src/almacen.ts';

const AURA = {
  version: 1,
  preferencias: { nombre: 'Nube', colorPrincipal: 'menta', colorComplementario: 'coral', forma: 'nube', expresion: 'alegre', decoraciones: [] },
  onboarding: { completado: true, momentoProyecto: null, fechaInicio: '2026-11-01T10:00:00.000Z' },
  experiencias: [],
  ultimaEtapaVista: 'origen',
};
const EMOCIONAL = {
  version: 1,
  guardados: ['emocional.tengo-miedo.hablar-en-publico', 'emocional.estoy-agotado.necesito-descansar'],
  vistos: { 'emocional.tengo-miedo.hablar-en-publico': { fraccion: 0.5, completado: false } },
  aprendizajes: [{ id: 'aprendizaje-0001', videoId: 'emocional.tengo-miedo.hablar-en-publico', texto: 'Los nervios no significan que no esté listo.', fecha: '2026-11-02T10:00:00.000Z' }],
};
const ACADEMICA = {
  version: 1,
  temas: { objetivos: 'explorado', resumen: 'en-curso' },
  avances: [{ id: 'avance-00000001', temaId: 'objetivos', texto: 'Reformulé mis objetivos.', fecha: '2026-11-03T10:00:00.000Z' }],
  actividades: { 'objetivos/verbos': '2026-11-03T11:00:00.000Z' },
};

/** Crea una cuenta con el esquema actual y devuelve su id entero. */
const usuario = (db: DatabaseSync, correo: string) =>
  (
    db
      .prepare("INSERT INTO usuarios (correo, hash, creado, consentimiento_version, consentimiento_fecha) VALUES (?, 'scrypt$x', '2026-11-01', 'v', '2026-11-01') RETURNING id")
      .get(correo) as { id: number }
  ).id;
const contar = (db: DatabaseSync, tabla: string, usuarioId: number) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${tabla} WHERE usuario_id = ?`).get(usuarioId) as { n: number }).n;
const idDe = (db: DatabaseSync, correo: string) => (db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(correo) as { id: number }).id;

test('migraciones: de un JSON por módulo (v2) a tablas STRICT con llaves incrementales, sin perder nada', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aura-bd-'));
  const ruta = join(dir, 'vieja.db');
  try {
    // Esquema de la versión 2: cuentas con UUID y un JSON por módulo
    const vieja = abrirBd(ruta, 2);
    const cuenta = vieja.prepare("INSERT INTO usuarios VALUES (?, ?, 'scrypt$x', ?, 'v', '2026-11-01')");
    cuenta.run('b7c3-uuid-ana', 'ana@aura.test', '2026-11-01T00:00:00.000Z');
    cuenta.run('0a11-uuid-beto', 'beto@aura.test', '2026-11-02T00:00:00.000Z');
    vieja
      .prepare("INSERT INTO experiencias VALUES ('exp-0001', 'b7c3-uuid-ana', 'ejercicio-completado', 'academica', 'lab:objetivos/verbos', '2026-11-03T11:00:00.000Z')")
      .run();
    const guardar = vieja.prepare('INSERT INTO datos (usuario_id, modulo, estado, actualizado) VALUES (?, ?, ?, ?)');
    guardar.run('b7c3-uuid-ana', 'mi-aura', JSON.stringify(AURA), '2026-11-05T00:00:00.000Z');
    guardar.run('b7c3-uuid-ana', 'emocional', JSON.stringify(EMOCIONAL), '2026-11-05T00:00:00.000Z');
    guardar.run('b7c3-uuid-ana', 'academica', JSON.stringify(ACADEMICA), '2026-11-05T00:00:00.000Z');
    guardar.run('0a11-uuid-beto', 'emocional', '{json roto', '2026-11-05T00:00:00.000Z');
    vieja.close();

    const db = abrirBd(ruta);
    assert.equal((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, VERSION_ESQUEMA);
    assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name LIKE '%_v3' OR name = 'datos'").get(), undefined, 'no quedan tablas viejas');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys, 1, 'claves foráneas activas al terminar');

    // Las cuentas reciben ids enteros en orden de creación
    const ana = idDe(db, 'ana@aura.test');
    const beto = idDe(db, 'beto@aura.test');
    assert.equal(typeof ana, 'number');
    assert.ok(ana < beto, 'ids incrementales por orden de creación');

    const { experiencias, ...aura } = leerModulo(db, ana, 'mi-aura') as typeof AURA & { experiencias: unknown };
    assert.deepEqual({ ...aura, experiencias: [] }, AURA);
    assert.equal((experiencias as Array<{ id: string }>)[0]?.id, 'exp-0001', 'el id público de la experiencia se conserva');
    assert.deepEqual(leerModulo(db, ana, 'emocional'), EMOCIONAL);
    assert.deepEqual(leerModulo(db, ana, 'academica'), ACADEMICA);
    assert.equal(leerModulo(db, beto, 'emocional'), null, 'un JSON corrupto no entra a las tablas');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('esquema: toda tabla tiene llave INTEGER PRIMARY KEY AUTOINCREMENT y es STRICT', () => {
  const db = abrirBd(':memory:');
  const tablas = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string; sql: string }>;
  assert.equal(tablas.length, 13);
  for (const t of tablas) {
    assert.match(t.sql, /\bid INTEGER PRIMARY KEY AUTOINCREMENT\b/, `${t.name}: llave incremental`);
    assert.match(t.sql, /\)\s*STRICT\s*$/, `${t.name}: STRICT`);
  }
  db.close();
});

test('módulo vacío ≠ nunca guardado; borrar un módulo y borrar la cuenta limpian todas sus filas', () => {
  const db = abrirBd(':memory:');
  const u = usuario(db, 'ana@aura.test');
  assert.equal(leerModulo(db, u, 'academica'), null);
  escribirModulo(db, u, 'academica', { version: 1, temas: {}, avances: [], actividades: {} });
  assert.deepEqual(leerModulo(db, u, 'academica'), { version: 1, temas: {}, avances: [], actividades: {} });

  escribirModulo(db, u, 'emocional', EMOCIONAL);
  escribirModulo(db, u, 'academica', ACADEMICA);
  assert.deepEqual(leerModulo(db, u, 'academica'), ACADEMICA);
  borrarModulo(db, u, 'emocional');
  assert.equal(leerModulo(db, u, 'emocional'), null);
  assert.equal(contar(db, 'emocional_aprendizajes', u), 0);

  db.prepare('DELETE FROM usuarios WHERE id = ?').run(u);
  for (const t of ['academica_temas', 'academica_avances', 'academica_actividades', 'modulos_guardados']) assert.equal(contar(db, t, u), 0, t);
  db.close();
});

test('restricciones: la base rechaza datos imposibles aunque el código fallara', () => {
  const db = abrirBd(':memory:');
  const u = usuario(db, 'ana@aura.test');
  const intenta = (sql: string, ...v: Array<string | number>) => () => db.prepare(sql).run(...v);
  assert.throws(intenta('INSERT INTO emocional_vistos (usuario_id, video_id, fraccion, completado) VALUES (?, ?, 1.5, 0)', u, 'v'), /CHECK/);
  assert.throws(intenta("INSERT INTO academica_temas (usuario_id, tema_id, estado) VALUES (?, 't', 'reprobado')", u), /CHECK/);
  assert.throws(intenta("INSERT INTO academica_temas (usuario_id, tema_id, estado) VALUES (999, 't', 'explorado')"), /FOREIGN KEY/);
  assert.throws(intenta("INSERT INTO academica_avances (uid, usuario_id, tema_id, texto, fecha) VALUES ('a', ?, 't', 'x', 'ayer')", u), /CHECK/, 'fecha no ISO');
  assert.throws(intenta("INSERT INTO experiencias (uid, usuario_id, tipo, dimension, ref_id, fecha) VALUES ('e', ?, 'clic', 'academica', 'x', '2026-11-01')", u), /CHECK/);
  assert.throws(intenta("INSERT INTO academica_temas (usuario_id, tema_id, estado) VALUES ('uno', 't', 'explorado')"), /cannot store TEXT value in INTEGER column/, 'STRICT');
  db.close();
});

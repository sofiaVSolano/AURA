// Base de datos SQLite (node:sqlite, sin dependencias). Consultas siempre preparadas
// (sin concatenar texto del usuario) y migraciones versionadas con PRAGMA user_version.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRACIONES: string[] = [
  `CREATE TABLE usuarios (
     id TEXT PRIMARY KEY,
     correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
     hash TEXT NOT NULL,
     creado TEXT NOT NULL,
     consentimiento_version TEXT NOT NULL,
     consentimiento_fecha TEXT NOT NULL
   );
   CREATE TABLE sesiones (
     token_hash TEXT PRIMARY KEY,
     usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
     csrf TEXT NOT NULL,
     creada TEXT NOT NULL,
     expira TEXT NOT NULL
   );
   CREATE INDEX sesiones_usuario ON sesiones(usuario_id);
   CREATE TABLE datos (
     usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
     modulo TEXT NOT NULL CHECK (modulo IN ('mi-aura', 'emocional', 'academica')),
     estado TEXT NOT NULL,
     actualizado TEXT NOT NULL,
     PRIMARY KEY (usuario_id, modulo)
   );
   CREATE TABLE experiencias (
     id TEXT PRIMARY KEY,
     usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
     tipo TEXT NOT NULL,
     dimension TEXT NOT NULL,
     ref_id TEXT NOT NULL,
     fecha TEXT NOT NULL,
     UNIQUE (usuario_id, tipo, ref_id)
   );`,
];

export function abrirBd(ruta: string): DatabaseSync {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const version = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  for (let v = version; v < MIGRACIONES.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRACIONES[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

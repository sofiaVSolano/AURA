// Base de datos SQLite (node:sqlite, sin dependencias). Consultas siempre preparadas
// (sin concatenar texto del usuario) y migraciones versionadas con PRAGMA user_version.
// Diccionario de datos: docs/16-base-de-datos.md
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { validarEstadoAura } from '../../frontend/src/features/mi-aura/dominio/validar.ts';
import { validarEstadoEmocional } from '../../frontend/src/features/emocional/dominio/estadoEmocional.ts';
import { validarEstadoAcademico } from '../../frontend/src/features/academica/dominio/estadoAcademico.ts';

/** Una migración es SQL o una función (cuando hay que transformar datos existentes). */
type Migracion = string | ((db: DatabaseSync) => void);

/** Una tabla por tipo de dato personal (antes, un JSON por módulo en la tabla `datos`). */
const TABLAS_NORMALIZADAS = `
  -- Qué módulos guardó cada persona (distingue «vacío» de «nunca guardado»)
  CREATE TABLE modulos_guardados (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo TEXT NOT NULL CHECK (modulo IN ('mi-aura', 'emocional', 'academica')),
    actualizado TEXT NOT NULL,
    PRIMARY KEY (usuario_id, modulo)
  );

  -- Mi AURA: el personaje
  CREATE TABLE aura_perfiles (
    usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 24),
    color_principal TEXT NOT NULL,
    color_complementario TEXT NOT NULL,
    forma TEXT NOT NULL,
    expresion TEXT NOT NULL,
    onboarding_completado INTEGER NOT NULL CHECK (onboarding_completado IN (0, 1)),
    momento_proyecto TEXT,
    fecha_inicio TEXT,
    ultima_etapa_vista TEXT NOT NULL
  );
  CREATE TABLE aura_decoraciones (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    decoracion TEXT NOT NULL,
    orden INTEGER NOT NULL,
    PRIMARY KEY (usuario_id, decoracion)
  );

  -- AURA emocional
  CREATE TABLE emocional_guardados (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    orden INTEGER NOT NULL,
    PRIMARY KEY (usuario_id, video_id)
  );
  CREATE TABLE emocional_vistos (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    fraccion REAL NOT NULL CHECK (fraccion BETWEEN 0 AND 1),
    completado INTEGER NOT NULL CHECK (completado IN (0, 1)),
    PRIMARY KEY (usuario_id, video_id)
  );
  CREATE TABLE emocional_aprendizajes (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    texto TEXT NOT NULL CHECK (length(texto) <= 1000),
    fecha TEXT NOT NULL,
    PRIMARY KEY (usuario_id, id)
  );

  -- AURA académica
  CREATE TABLE academica_temas (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tema_id TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('en-curso', 'explorado')),
    PRIMARY KEY (usuario_id, tema_id)
  );
  CREATE TABLE academica_avances (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    tema_id TEXT NOT NULL,
    texto TEXT NOT NULL CHECK (length(texto) <= 1500),
    fecha TEXT NOT NULL,
    PRIMARY KEY (usuario_id, id)
  );
  CREATE TABLE academica_actividades (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    clave TEXT NOT NULL,
    fecha TEXT NOT NULL,
    PRIMARY KEY (usuario_id, clave)
  );

  CREATE INDEX experiencias_usuario ON experiencias(usuario_id, fecha);

  -- Vista de revisión: cuántos datos tiene cada cuenta (sin contenido personal ni correo)
  CREATE VIEW resumen_cuentas AS
  SELECT u.id, u.creado,
    (SELECT COUNT(*) FROM experiencias e WHERE e.usuario_id = u.id) AS experiencias,
    (SELECT COUNT(*) FROM emocional_guardados g WHERE g.usuario_id = u.id) AS guardados,
    (SELECT COUNT(*) FROM emocional_vistos v WHERE v.usuario_id = u.id) AS videos_vistos,
    (SELECT COUNT(*) FROM emocional_aprendizajes a WHERE a.usuario_id = u.id) AS aprendizajes,
    (SELECT COUNT(*) FROM academica_temas t WHERE t.usuario_id = u.id) AS temas_marcados,
    (SELECT COUNT(*) FROM academica_avances a WHERE a.usuario_id = u.id) AS avances,
    (SELECT COUNT(*) FROM academica_actividades a WHERE a.usuario_id = u.id) AS actividades,
    (SELECT COUNT(*) FROM evaluaciones_ia i WHERE i.usuario_id = u.id) AS evaluaciones_ia
  FROM usuarios u;
`;

type Modulo = 'mi-aura' | 'emocional' | 'academica';
const MODULOS_V3: readonly Modulo[] = ['mi-aura', 'emocional', 'academica'];

const VALIDAR: Record<Modulo, (d: unknown) => { ok: boolean; valor?: unknown }> = {
  'mi-aura': (d) => {
    const r = validarEstadoAura(d);
    return r.ok ? { ok: true, valor: { ...r.valor.estado, experiencias: [] } } : { ok: false };
  },
  emocional: validarEstadoEmocional,
  academica: validarEstadoAcademico,
};

/**
 * Migración 3: pasa los estados JSON de la tabla `datos` a las tablas normalizadas y la
 * elimina. Es autocontenida (escribe con el esquema de la versión 3): las migraciones
 * son historia y no deben depender del código actual, que puede cambiar.
 */
function normalizarDatos(db: DatabaseSync) {
  db.exec(TABLAS_NORMALIZADAS);
  const filas = db.prepare('SELECT usuario_id, modulo, estado, actualizado FROM datos').all() as Array<{
    usuario_id: string;
    modulo: Modulo;
    estado: string;
    actualizado: string;
  }>;
  const ins = (sql: string) => db.prepare(sql);
  for (const f of filas) {
    if (!MODULOS_V3.includes(f.modulo)) continue;
    let crudo: unknown;
    try {
      crudo = JSON.parse(f.estado);
    } catch {
      continue;
    }
    // Se vuelve a validar: a las tablas solo entra lo que cumple el modelo
    const v = VALIDAR[f.modulo](crudo);
    if (!v.ok) continue;
    const u = f.usuario_id;
    if (f.modulo === 'mi-aura') {
      const e = v.valor as { preferencias: { nombre: string; colorPrincipal: string; colorComplementario: string; forma: string; expresion: string; decoraciones: string[] }; onboarding: { completado: boolean; momentoProyecto: string | null; fechaInicio: string | null }; ultimaEtapaVista: string };
      const p = e.preferencias;
      ins('INSERT INTO aura_perfiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(u, p.nombre, p.colorPrincipal, p.colorComplementario, p.forma, p.expresion, e.onboarding.completado ? 1 : 0, e.onboarding.momentoProyecto, e.onboarding.fechaInicio, e.ultimaEtapaVista);
      p.decoraciones.forEach((d, k) => ins('INSERT OR IGNORE INTO aura_decoraciones VALUES (?, ?, ?)').run(u, d, k));
    } else if (f.modulo === 'emocional') {
      const e = v.valor as { guardados: string[]; vistos: Record<string, { fraccion: number; completado: boolean }>; aprendizajes: Array<{ id: string; videoId: string; texto: string; fecha: string }> };
      e.guardados.forEach((g, k) => ins('INSERT OR IGNORE INTO emocional_guardados VALUES (?, ?, ?)').run(u, g, k));
      for (const [id, a] of Object.entries(e.vistos)) ins('INSERT OR IGNORE INTO emocional_vistos VALUES (?, ?, ?, ?)').run(u, id, a.fraccion, a.completado ? 1 : 0);
      for (const a of e.aprendizajes) ins('INSERT OR IGNORE INTO emocional_aprendizajes VALUES (?, ?, ?, ?, ?)').run(u, a.id, a.videoId, a.texto, a.fecha);
    } else {
      const e = v.valor as { temas: Record<string, string>; avances: Array<{ id: string; temaId: string; texto: string; fecha: string }>; actividades: Record<string, string> };
      for (const [id, estado] of Object.entries(e.temas)) ins('INSERT OR IGNORE INTO academica_temas VALUES (?, ?, ?)').run(u, id, estado);
      for (const a of e.avances) ins('INSERT OR IGNORE INTO academica_avances VALUES (?, ?, ?, ?, ?)').run(u, a.id, a.temaId, a.texto, a.fecha);
      for (const [clave, fecha] of Object.entries(e.actividades)) ins('INSERT OR IGNORE INTO academica_actividades VALUES (?, ?, ?)').run(u, clave, fecha);
    }
    ins('INSERT INTO modulos_guardados VALUES (?, ?, ?)').run(u, f.modulo, f.actualizado);
  }
  db.exec('DROP TABLE datos');
}

// — Versión 4: llaves primarias enteras e incrementales, tablas STRICT y más restricciones —

/** Fecha ISO 8601 (AAAA-MM-DD…): evita guardar cualquier texto como fecha. */
const FECHA = (c: string) => `${c} TEXT NOT NULL CHECK (${c} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]*')`;
const FECHA_OPCIONAL = (c: string) => `${c} TEXT CHECK (${c} IS NULL OR ${c} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]*')`;
const ID = 'id INTEGER PRIMARY KEY AUTOINCREMENT';
const USUARIO = 'usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE';
const TIPOS_EXPERIENCIA_V4 = "'contenido-explorado', 'reflexion-registrada', 'experiencia-compartida', 'ejercicio-completado', 'sustentacion-practicada', 'avance-academico'";

export const ESQUEMA_V4 = `
  CREATE TABLE usuarios (
    ${ID},
    correo TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(correo) BETWEEN 3 AND 254),
    hash TEXT NOT NULL CHECK (hash LIKE 'scrypt$%'),
    ${FECHA('creado')},
    consentimiento_version TEXT NOT NULL,
    ${FECHA('consentimiento_fecha')}
  ) STRICT;

  CREATE TABLE sesiones (
    ${ID},
    token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
    ${USUARIO},
    csrf TEXT NOT NULL,
    ${FECHA('creada')},
    ${FECHA('expira')}
  ) STRICT;
  CREATE INDEX sesiones_usuario ON sesiones(usuario_id);
  CREATE INDEX sesiones_expira ON sesiones(expira);

  CREATE TABLE experiencias (
    ${ID},
    uid TEXT NOT NULL UNIQUE,
    ${USUARIO},
    tipo TEXT NOT NULL CHECK (tipo IN (${TIPOS_EXPERIENCIA_V4})),
    dimension TEXT NOT NULL CHECK (dimension IN ('emocional', 'academica')),
    ref_id TEXT NOT NULL CHECK (length(ref_id) BETWEEN 1 AND 121),
    ${FECHA('fecha')},
    UNIQUE (usuario_id, tipo, ref_id)
  ) STRICT;
  CREATE INDEX experiencias_usuario ON experiencias(usuario_id, fecha);

  CREATE TABLE evaluaciones_ia (
    ${ID},
    ${USUARIO},
    clave TEXT NOT NULL CHECK (clave = 'tesis' OR clave LIKE 'redaccion:%'),
    ${FECHA('fecha')}
  ) STRICT;
  CREATE INDEX evaluaciones_ia_usuario ON evaluaciones_ia(usuario_id, clave);

  CREATE TABLE modulos_guardados (
    ${ID},
    ${USUARIO},
    modulo TEXT NOT NULL CHECK (modulo IN ('mi-aura', 'emocional', 'academica')),
    ${FECHA('actualizado')},
    UNIQUE (usuario_id, modulo)
  ) STRICT;

  CREATE TABLE aura_perfiles (
    ${ID},
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 24),
    color_principal TEXT NOT NULL,
    color_complementario TEXT NOT NULL,
    forma TEXT NOT NULL,
    expresion TEXT NOT NULL,
    onboarding_completado INTEGER NOT NULL CHECK (onboarding_completado IN (0, 1)),
    momento_proyecto TEXT,
    ${FECHA_OPCIONAL('fecha_inicio')},
    ultima_etapa_vista TEXT NOT NULL
  ) STRICT;

  CREATE TABLE aura_decoraciones (
    ${ID},
    ${USUARIO},
    decoracion TEXT NOT NULL,
    orden INTEGER NOT NULL CHECK (orden >= 0),
    UNIQUE (usuario_id, decoracion)
  ) STRICT;

  CREATE TABLE emocional_guardados (
    ${ID},
    ${USUARIO},
    video_id TEXT NOT NULL,
    orden INTEGER NOT NULL CHECK (orden >= 0),
    UNIQUE (usuario_id, video_id)
  ) STRICT;

  CREATE TABLE emocional_vistos (
    ${ID},
    ${USUARIO},
    video_id TEXT NOT NULL,
    fraccion REAL NOT NULL CHECK (fraccion BETWEEN 0 AND 1),
    completado INTEGER NOT NULL CHECK (completado IN (0, 1)),
    UNIQUE (usuario_id, video_id)
  ) STRICT;

  CREATE TABLE emocional_aprendizajes (
    ${ID},
    uid TEXT NOT NULL,
    ${USUARIO},
    video_id TEXT NOT NULL,
    texto TEXT NOT NULL CHECK (length(texto) BETWEEN 1 AND 1000),
    ${FECHA('fecha')},
    UNIQUE (usuario_id, uid)
  ) STRICT;

  CREATE TABLE academica_temas (
    ${ID},
    ${USUARIO},
    tema_id TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('en-curso', 'explorado')),
    UNIQUE (usuario_id, tema_id)
  ) STRICT;

  CREATE TABLE academica_avances (
    ${ID},
    uid TEXT NOT NULL,
    ${USUARIO},
    tema_id TEXT NOT NULL,
    texto TEXT NOT NULL CHECK (length(texto) BETWEEN 1 AND 1500),
    ${FECHA('fecha')},
    UNIQUE (usuario_id, uid)
  ) STRICT;

  CREATE TABLE academica_actividades (
    ${ID},
    ${USUARIO},
    clave TEXT NOT NULL CHECK (clave LIKE '%/%'),
    ${FECHA('fecha')},
    UNIQUE (usuario_id, clave)
  ) STRICT;

  -- Vista de revisión: cuántos datos tiene cada cuenta (sin correo ni contenido)
  CREATE VIEW resumen_cuentas AS
  SELECT u.id, u.creado,
    (SELECT COUNT(*) FROM experiencias e WHERE e.usuario_id = u.id) AS experiencias,
    (SELECT COUNT(*) FROM emocional_guardados g WHERE g.usuario_id = u.id) AS guardados,
    (SELECT COUNT(*) FROM emocional_vistos v WHERE v.usuario_id = u.id) AS videos_vistos,
    (SELECT COUNT(*) FROM emocional_aprendizajes a WHERE a.usuario_id = u.id) AS aprendizajes,
    (SELECT COUNT(*) FROM academica_temas t WHERE t.usuario_id = u.id) AS temas_marcados,
    (SELECT COUNT(*) FROM academica_avances a WHERE a.usuario_id = u.id) AS avances,
    (SELECT COUNT(*) FROM academica_actividades a WHERE a.usuario_id = u.id) AS actividades,
    (SELECT COUNT(*) FROM evaluaciones_ia i WHERE i.usuario_id = u.id) AS evaluaciones_ia
  FROM usuarios u;
`;

const TABLAS_V3 = [
  'usuarios', 'sesiones', 'experiencias', 'evaluaciones_ia', 'modulos_guardados', 'aura_perfiles', 'aura_decoraciones',
  'emocional_guardados', 'emocional_vistos', 'emocional_aprendizajes', 'academica_temas', 'academica_avances', 'academica_actividades',
];

/**
 * Migración 4: reconstruye cada tabla con llave primaria INTEGER AUTOINCREMENT (las cuentas
 * pasan de UUID a un id entero) y STRICT. Los ids que vienen del navegador se conservan en
 * `uid`. Corre con las claves foráneas desactivadas (lo hace abrirBd) y se verifica al final.
 */
function llavesIncrementales(db: DatabaseSync) {
  db.exec('DROP VIEW IF EXISTS resumen_cuentas');
  for (const t of TABLAS_V3) db.exec(`ALTER TABLE ${t} RENAME TO ${t}_v3`);
  db.exec('DROP INDEX IF EXISTS sesiones_usuario; DROP INDEX IF EXISTS experiencias_usuario; DROP INDEX IF EXISTS evaluaciones_ia_usuario;');
  db.exec(ESQUEMA_V4);
  db.exec(`
    INSERT INTO usuarios (correo, hash, creado, consentimiento_version, consentimiento_fecha)
      SELECT correo, hash, creado, consentimiento_version, consentimiento_fecha FROM usuarios_v3 ORDER BY creado, id;
    CREATE TEMP TABLE mapa AS SELECT o.id AS viejo, n.id AS nuevo FROM usuarios_v3 o JOIN usuarios n ON n.correo = o.correo;

    INSERT INTO sesiones (token_hash, usuario_id, csrf, creada, expira)
      SELECT t.token_hash, m.nuevo, t.csrf, t.creada, t.expira FROM sesiones_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.creada;
    INSERT INTO experiencias (uid, usuario_id, tipo, dimension, ref_id, fecha)
      SELECT t.id, m.nuevo, t.tipo, t.dimension, t.ref_id, t.fecha FROM experiencias_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.fecha, t.id;
    INSERT INTO evaluaciones_ia (usuario_id, clave, fecha)
      SELECT m.nuevo, t.clave, t.fecha FROM evaluaciones_ia_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.fecha;
    INSERT INTO modulos_guardados (usuario_id, modulo, actualizado)
      SELECT m.nuevo, t.modulo, t.actualizado FROM modulos_guardados_v3 t JOIN mapa m ON m.viejo = t.usuario_id;
    INSERT INTO aura_perfiles (usuario_id, nombre, color_principal, color_complementario, forma, expresion, onboarding_completado, momento_proyecto, fecha_inicio, ultima_etapa_vista)
      SELECT m.nuevo, t.nombre, t.color_principal, t.color_complementario, t.forma, t.expresion, t.onboarding_completado, t.momento_proyecto, t.fecha_inicio, t.ultima_etapa_vista
      FROM aura_perfiles_v3 t JOIN mapa m ON m.viejo = t.usuario_id;
    INSERT INTO aura_decoraciones (usuario_id, decoracion, orden)
      SELECT m.nuevo, t.decoracion, t.orden FROM aura_decoraciones_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.orden;
    INSERT INTO emocional_guardados (usuario_id, video_id, orden)
      SELECT m.nuevo, t.video_id, t.orden FROM emocional_guardados_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.orden;
    INSERT INTO emocional_vistos (usuario_id, video_id, fraccion, completado)
      SELECT m.nuevo, t.video_id, t.fraccion, t.completado FROM emocional_vistos_v3 t JOIN mapa m ON m.viejo = t.usuario_id;
    INSERT INTO emocional_aprendizajes (uid, usuario_id, video_id, texto, fecha)
      SELECT t.id, m.nuevo, t.video_id, t.texto, t.fecha FROM emocional_aprendizajes_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.fecha, t.id;
    INSERT INTO academica_temas (usuario_id, tema_id, estado)
      SELECT m.nuevo, t.tema_id, t.estado FROM academica_temas_v3 t JOIN mapa m ON m.viejo = t.usuario_id;
    INSERT INTO academica_avances (uid, usuario_id, tema_id, texto, fecha)
      SELECT t.id, m.nuevo, t.tema_id, t.texto, t.fecha FROM academica_avances_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.fecha, t.id;
    INSERT INTO academica_actividades (usuario_id, clave, fecha)
      SELECT m.nuevo, t.clave, t.fecha FROM academica_actividades_v3 t JOIN mapa m ON m.viejo = t.usuario_id ORDER BY t.fecha;
    DROP TABLE mapa;
  `);
  for (const t of [...TABLAS_V3].reverse()) db.exec(`DROP TABLE ${t}_v3`);
}

const MIGRACIONES: Migracion[] = [
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
  // Evaluaciones con IA: se cuenta cuántas usó cada persona (el texto nunca se guarda).
  `CREATE TABLE evaluaciones_ia (
     id TEXT PRIMARY KEY,
     usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
     clave TEXT NOT NULL,
     fecha TEXT NOT NULL
   );
   CREATE INDEX evaluaciones_ia_usuario ON evaluaciones_ia(usuario_id, clave);`,
  // Los datos de cada módulo dejan de ser un JSON: una tabla por tipo de dato.
  normalizarDatos,
  // Llaves primarias enteras e incrementales, tablas STRICT y más restricciones.
  llavesIncrementales,
];

/** Versión del esquema que deja este código (para diagnósticos y pruebas). */
export const VERSION_ESQUEMA = MIGRACIONES.length;

/** Abre (y migra) la base. `hasta` solo existe para probar migraciones desde versiones viejas. */
export function abrirBd(ruta: string, hasta: number = MIGRACIONES.length): DatabaseSync {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  // WAL + synchronous NORMAL: escrituras rápidas y seguras ante caídas del proceso
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
  const version = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  const objetivo = Math.min(hasta, MIGRACIONES.length);
  // Las migraciones reconstruyen tablas: las claves foráneas se apagan mientras tanto
  // (no se puede cambiar dentro de una transacción) y se verifican antes de confirmar.
  db.exec('PRAGMA foreign_keys = OFF');
  for (let v = version; v < objetivo; v++) {
    db.exec('BEGIN');
    try {
      const m = MIGRACIONES[v]!;
      if (typeof m === 'string') db.exec(m);
      else m(db);
      const rotas = db.prepare('PRAGMA foreign_key_check').all();
      if (rotas.length) throw new Error(`Migración ${v + 1}: ${rotas.length} referencias rotas`);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

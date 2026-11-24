// Datos personales en tablas normalizadas (una fila por dato, con sus restricciones).
// El API sigue intercambiando el «estado» de cada módulo como antes (mismo contrato
// con el frontend): aquí se traduce estado ⇄ tablas. Los estados ya llegan validados.
import type { DatabaseSync } from 'node:sqlite';
import type { EstadoAura } from '../../frontend/src/features/mi-aura/dominio/modelo.ts';
import type { EstadoEmocional } from '../../frontend/src/features/emocional/dominio/estadoEmocional.ts';
import type { EstadoAcademico } from '../../frontend/src/features/academica/dominio/estadoAcademico.ts';

export const MODULOS = ['mi-aura', 'emocional', 'academica'] as const;
export type Modulo = (typeof MODULOS)[number];

/** Tablas de cada módulo (las experiencias de Mi AURA viven aparte: solo las escribe el servidor). */
const TABLAS: Record<Modulo, string[]> = {
  'mi-aura': ['aura_perfiles', 'aura_decoraciones'],
  emocional: ['emocional_guardados', 'emocional_vistos', 'emocional_aprendizajes'],
  academica: ['academica_temas', 'academica_avances', 'academica_actividades'],
};

/** ¿La persona ya guardó este módulo alguna vez? (distingue «vacío» de «nunca guardado»). */
export function existeModulo(db: DatabaseSync, usuarioId: number, modulo: Modulo): boolean {
  return Boolean(db.prepare('SELECT 1 FROM modulos_guardados WHERE usuario_id = ? AND modulo = ?').get(usuarioId, modulo));
}

export function leerModulo(db: DatabaseSync, usuarioId: number, modulo: Modulo): EstadoAura | EstadoEmocional | EstadoAcademico | null {
  if (modulo === 'mi-aura') return leerAura(db, usuarioId);
  if (!existeModulo(db, usuarioId, modulo)) return null;
  return modulo === 'emocional' ? leerEmocional(db, usuarioId) : leerAcademica(db, usuarioId);
}

/** Reemplaza el módulo completo de la persona (en una transacción: todo o nada). */
export function escribirModulo(
  db: DatabaseSync,
  usuarioId: number,
  modulo: Modulo,
  estado: unknown,
  { dentroDeTransaccion = false, actualizado = new Date().toISOString() }: { dentroDeTransaccion?: boolean; actualizado?: string } = {},
): void {
  const hacer = dentroDeTransaccion ? (f: () => void) => f() : (f: () => void) => transaccion(db, f);
  hacer(() => {
    borrarTablas(db, usuarioId, modulo);
    if (modulo === 'mi-aura') escribirAura(db, usuarioId, estado as EstadoAura);
    else if (modulo === 'emocional') escribirEmocional(db, usuarioId, estado as EstadoEmocional);
    else escribirAcademica(db, usuarioId, estado as EstadoAcademico);
    db.prepare(
      `INSERT INTO modulos_guardados (usuario_id, modulo, actualizado) VALUES (?, ?, ?)
       ON CONFLICT (usuario_id, modulo) DO UPDATE SET actualizado = excluded.actualizado`,
    ).run(usuarioId, modulo, actualizado);
  });
}

export function borrarModulo(db: DatabaseSync, usuarioId: number, modulo: Modulo): void {
  transaccion(db, () => {
    borrarTablas(db, usuarioId, modulo);
    db.prepare('DELETE FROM modulos_guardados WHERE usuario_id = ? AND modulo = ?').run(usuarioId, modulo);
    if (modulo === 'mi-aura') db.prepare('DELETE FROM experiencias WHERE usuario_id = ?').run(usuarioId);
  });
}

function borrarTablas(db: DatabaseSync, usuarioId: number, modulo: Modulo) {
  // Los nombres de tabla vienen de la constante TABLAS (nunca del usuario)
  for (const t of TABLAS[modulo]) db.prepare(`DELETE FROM ${t} WHERE usuario_id = ?`).run(usuarioId);
}

export function transaccion(db: DatabaseSync, f: () => void) {
  db.exec('BEGIN');
  try {
    f();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// — Mi AURA —
function leerAura(db: DatabaseSync, usuarioId: number): EstadoAura | null {
  const p = db.prepare('SELECT * FROM aura_perfiles WHERE usuario_id = ?').get(usuarioId) as
    | {
        nombre: string;
        color_principal: string;
        color_complementario: string;
        forma: string;
        expresion: string;
        onboarding_completado: number;
        momento_proyecto: string | null;
        fecha_inicio: string | null;
        ultima_etapa_vista: string;
      }
    | undefined;
  const experiencias = (
    db.prepare('SELECT uid, tipo, dimension, ref_id, fecha FROM experiencias WHERE usuario_id = ? ORDER BY fecha, id').all(usuarioId) as Array<{
      uid: string;
      tipo: string;
      dimension: string;
      ref_id: string;
      fecha: string;
    }>
  ).map((e) => ({ id: e.uid, tipo: e.tipo, dimension: e.dimension, refId: e.ref_id, fecha: e.fecha }));
  // Sin perfil pero con experiencias (p. ej. hizo un laboratorio antes de dar vida a su AURA)
  if (!p && experiencias.length === 0) return null;
  const decoraciones = (db.prepare('SELECT decoracion FROM aura_decoraciones WHERE usuario_id = ? ORDER BY orden').all(usuarioId) as Array<{ decoracion: string }>).map(
    (d) => d.decoracion,
  );
  return {
    version: 1,
    preferencias: {
      nombre: p?.nombre ?? 'Aura',
      colorPrincipal: (p?.color_principal ?? 'morado') as EstadoAura['preferencias']['colorPrincipal'],
      colorComplementario: (p?.color_complementario ?? 'cielo') as EstadoAura['preferencias']['colorComplementario'],
      forma: (p?.forma ?? 'gota') as EstadoAura['preferencias']['forma'],
      expresion: (p?.expresion ?? 'serena') as EstadoAura['preferencias']['expresion'],
      decoraciones: decoraciones as EstadoAura['preferencias']['decoraciones'],
    },
    onboarding: { completado: Boolean(p?.onboarding_completado), momentoProyecto: p?.momento_proyecto ?? null, fechaInicio: p?.fecha_inicio ?? null },
    experiencias: experiencias as EstadoAura['experiencias'],
    ultimaEtapaVista: (p?.ultima_etapa_vista ?? 'origen') as EstadoAura['ultimaEtapaVista'],
  };
}

function escribirAura(db: DatabaseSync, usuarioId: number, e: EstadoAura) {
  const p = e.preferencias;
  db.prepare(
    `INSERT INTO aura_perfiles (usuario_id, nombre, color_principal, color_complementario, forma, expresion,
       onboarding_completado, momento_proyecto, fecha_inicio, ultima_etapa_vista)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    usuarioId,
    p.nombre,
    p.colorPrincipal,
    p.colorComplementario,
    p.forma,
    p.expresion,
    e.onboarding.completado ? 1 : 0,
    e.onboarding.momentoProyecto,
    e.onboarding.fechaInicio,
    e.ultimaEtapaVista,
  );
  const deco = db.prepare('INSERT OR IGNORE INTO aura_decoraciones (usuario_id, decoracion, orden) VALUES (?, ?, ?)');
  p.decoraciones.forEach((d, i) => deco.run(usuarioId, d, i));
}

// — AURA emocional —
function leerEmocional(db: DatabaseSync, usuarioId: number): EstadoEmocional {
  const guardados = (db.prepare('SELECT video_id FROM emocional_guardados WHERE usuario_id = ? ORDER BY orden').all(usuarioId) as Array<{ video_id: string }>).map(
    (g) => g.video_id,
  );
  const vistos: EstadoEmocional['vistos'] = {};
  for (const v of db.prepare('SELECT video_id, fraccion, completado FROM emocional_vistos WHERE usuario_id = ?').all(usuarioId) as Array<{
    video_id: string;
    fraccion: number;
    completado: number;
  }>) {
    vistos[v.video_id] = { fraccion: v.fraccion, completado: Boolean(v.completado) };
  }
  const aprendizajes = (
    db.prepare('SELECT uid, video_id, texto, fecha FROM emocional_aprendizajes WHERE usuario_id = ? ORDER BY fecha, id').all(usuarioId) as Array<{
      uid: string;
      video_id: string;
      texto: string;
      fecha: string;
    }>
  ).map((a) => ({ id: a.uid, videoId: a.video_id, texto: a.texto, fecha: a.fecha }));
  return { version: 1, guardados, vistos, aprendizajes };
}

function escribirEmocional(db: DatabaseSync, usuarioId: number, e: EstadoEmocional) {
  const g = db.prepare('INSERT OR IGNORE INTO emocional_guardados (usuario_id, video_id, orden) VALUES (?, ?, ?)');
  e.guardados.forEach((v, i) => g.run(usuarioId, v, i));
  const v = db.prepare('INSERT OR IGNORE INTO emocional_vistos (usuario_id, video_id, fraccion, completado) VALUES (?, ?, ?, ?)');
  for (const [id, a] of Object.entries(e.vistos)) v.run(usuarioId, id, a.fraccion, a.completado ? 1 : 0);
  const a = db.prepare('INSERT OR IGNORE INTO emocional_aprendizajes (uid, usuario_id, video_id, texto, fecha) VALUES (?, ?, ?, ?, ?)');
  for (const x of e.aprendizajes) a.run(x.id, usuarioId, x.videoId, x.texto, x.fecha); // x.id → uid
}

// — AURA académica —
function leerAcademica(db: DatabaseSync, usuarioId: number): EstadoAcademico {
  const temas: EstadoAcademico['temas'] = {};
  for (const t of db.prepare('SELECT tema_id, estado FROM academica_temas WHERE usuario_id = ?').all(usuarioId) as Array<{ tema_id: string; estado: string }>) {
    temas[t.tema_id] = t.estado as EstadoAcademico['temas'][string];
  }
  const avances = (
    db.prepare('SELECT uid, tema_id, texto, fecha FROM academica_avances WHERE usuario_id = ? ORDER BY fecha, id').all(usuarioId) as Array<{
      uid: string;
      tema_id: string;
      texto: string;
      fecha: string;
    }>
  ).map((a) => ({ id: a.uid, temaId: a.tema_id, texto: a.texto, fecha: a.fecha }));
  const actividades: EstadoAcademico['actividades'] = {};
  for (const a of db.prepare('SELECT clave, fecha FROM academica_actividades WHERE usuario_id = ?').all(usuarioId) as Array<{ clave: string; fecha: string }>) {
    actividades[a.clave] = a.fecha;
  }
  return { version: 1, temas, avances, actividades };
}

function escribirAcademica(db: DatabaseSync, usuarioId: number, e: EstadoAcademico) {
  const t = db.prepare('INSERT OR IGNORE INTO academica_temas (usuario_id, tema_id, estado) VALUES (?, ?, ?)');
  for (const [id, estado] of Object.entries(e.temas)) t.run(usuarioId, id, estado);
  const a = db.prepare('INSERT OR IGNORE INTO academica_avances (uid, usuario_id, tema_id, texto, fecha) VALUES (?, ?, ?, ?, ?)');
  for (const x of e.avances) a.run(x.id, usuarioId, x.temaId, x.texto, x.fecha);
  const c = db.prepare('INSERT OR IGNORE INTO academica_actividades (usuario_id, clave, fecha) VALUES (?, ?, ?)');
  for (const [clave, fecha] of Object.entries(e.actividades)) c.run(usuarioId, clave, fecha);
}

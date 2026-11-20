// Validadores mínimos y puros, sin dependencias. Usados por el contenido
// (videos, perfiles institucionales) y probados con node:test.

export type Registro = Record<string, unknown>;

export const esRegistro = (v: unknown): v is Registro =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const esTexto = (v: unknown, max = Infinity): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const esTextoONulo = (v: unknown, max = Infinity): v is string | null => v === null || esTexto(v, max);

/** kebab-case ASCII: minúsculas, números y guiones. Seguro para rutas y URLs. */
export const esSlug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

/** Nombre de archivo simple: sin separadores ni "..", con extensión. Evita rutas arbitrarias. */
export const esNombreArchivo = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i.test(v) && !v.includes('..');

export const esFechaIso = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export const esUrlSegura = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};

export const esListaDe = <T>(v: unknown, pred: (x: unknown) => x is T): v is T[] =>
  Array.isArray(v) && v.every(pred);

export const esUno = <T extends string>(v: unknown, opciones: readonly T[]): v is T =>
  typeof v === 'string' && (opciones as readonly string[]).includes(v);

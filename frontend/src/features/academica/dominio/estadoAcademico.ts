// Estado personal de AURA académica (solo en el dispositivo, borrable).
// La ruta es flexible: cada tema se marca libremente; no hay orden obligatorio
// ni estados negativos. Las respuestas del simulador NO se guardan.
import { exito, fallo, type Result } from '../../../lib/result.ts';
import { esRegistro, esSlug, esUno } from '../../../lib/validacion.ts';

export const ESTADOS_TEMA = ['en-curso', 'explorado'] as const;
export type EstadoTema = (typeof ESTADOS_TEMA)[number];
export const LARGO_MAXIMO_AVANCE = 1500;

export interface Avance {
  id: string;
  temaId: string;
  texto: string;
  fecha: string;
}

export interface EstadoAcademico {
  version: 1;
  temas: Record<string, EstadoTema>;
  avances: Avance[];
  /** Actividades completadas: clave "<laboratorio>/<actividad>" → fecha ISO. */
  actividades: Record<string, string>;
}

export const ESTADO_ACADEMICO_INICIAL: EstadoAcademico = { version: 1, temas: {}, avances: [], actividades: {} };

const esClave = (k: string) => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(k);

/** null quita la marca: volver a "sin empezar" no es retroceder, es reorganizarse. */
export function marcarTema(e: EstadoAcademico, temaId: string, estado: EstadoTema | null): EstadoAcademico {
  if (!esSlug(temaId)) return e;
  const temas = { ...e.temas };
  if (estado === null) delete temas[temaId];
  else temas[temaId] = estado;
  return { ...e, temas };
}

export function completarActividad(e: EstadoAcademico, clave: string, fecha: string): { estado: EstadoAcademico; nueva: boolean } {
  if (!esClave(clave) || e.actividades[clave]) return { estado: e, nueva: false };
  return { estado: { ...e, actividades: { ...e.actividades, [clave]: fecha } }, nueva: true };
}

export function validarTextoAvance(t: string): string | null {
  const s = t.trim();
  if (!s) return 'Escribe tu avance antes de guardarlo.';
  if (s.length > LARGO_MAXIMO_AVANCE) return `Usa como máximo ${LARGO_MAXIMO_AVANCE} caracteres.`;
  return null;
}

export function agregarAvance(e: EstadoAcademico, a: Avance): Result<EstadoAcademico> {
  const err = validarTextoAvance(a.texto);
  if (err) return fallo([err]);
  if (!esSlug(a.temaId)) return fallo(['Tema no reconocido.']);
  return exito({ ...e, avances: [...e.avances, { ...a, texto: a.texto.trim() }] });
}

export const borrarAvance = (e: EstadoAcademico, id: string): EstadoAcademico => ({ ...e, avances: e.avances.filter((a) => a.id !== id) });

export function validarEstadoAcademico(d: unknown): Result<EstadoAcademico> {
  if (!esRegistro(d) || d.version !== 1) return fallo(['Datos de AURA académica no reconocidos.']);
  const temas: Record<string, EstadoTema> = {};
  if (esRegistro(d.temas)) for (const [k, v] of Object.entries(d.temas)) if (esSlug(k) && esUno(v, ESTADOS_TEMA)) temas[k] = v;
  const actividades: Record<string, string> = {};
  if (esRegistro(d.actividades)) {
    for (const [k, v] of Object.entries(d.actividades)) if (esClave(k) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) actividades[k] = v;
  }
  const avances = Array.isArray(d.avances)
    ? d.avances.filter(
        (a): a is Avance =>
          esRegistro(a) &&
          typeof a.id === 'string' &&
          /^[\w-]{8,64}$/.test(a.id) &&
          esSlug(a.temaId) &&
          typeof a.texto === 'string' &&
          validarTextoAvance(a.texto) === null &&
          typeof a.fecha === 'string' &&
          !Number.isNaN(Date.parse(a.fecha)),
      )
    : [];
  return exito({ version: 1, temas, avances, actividades });
}

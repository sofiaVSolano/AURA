// Estado personal de AURA emocional: guardados, progreso visto y aprendizajes.
// Voluntario, privado (solo en el dispositivo) y eliminable. Sin datos emocionales
// innecesarios: no se guarda "cómo te sientes", solo lo que la persona decide guardar.
import { exito, fallo, type Result } from '../../../lib/result.ts';
import { esRegistro } from '../../../lib/validacion.ts';

export const UMBRAL_VISTO = 0.9;
export const LARGO_MAXIMO_APRENDIZAJE = 1000;

export interface Avance {
  /** Mayor fracción vista (0–1): retroceder no reduce el progreso. */
  fraccion: number;
  completado: boolean;
}

export interface Aprendizaje {
  id: string;
  videoId: string;
  texto: string;
  /** ISO 8601. */
  fecha: string;
}

export interface EstadoEmocional {
  version: 1;
  guardados: string[];
  vistos: Record<string, Avance>;
  aprendizajes: Aprendizaje[];
}

export const ESTADO_EMOCIONAL_INICIAL: EstadoEmocional = { version: 1, guardados: [], vistos: {}, aprendizajes: [] };

const esIdVideo = (v: unknown): v is string => typeof v === 'string' && /^(emocional|academico)\.[a-z0-9-]+\.[a-z0-9-]+$/.test(v);

export function alternarGuardado(e: EstadoEmocional, videoId: string): EstadoEmocional {
  if (!esIdVideo(videoId)) return e;
  const guardados = e.guardados.includes(videoId) ? e.guardados.filter((g) => g !== videoId) : [...e.guardados, videoId];
  return { ...e, guardados };
}

/** Registra cuánto se vio. Devuelve también si acaba de completarse (para Mi AURA). */
export function registrarAvance(e: EstadoEmocional, videoId: string, fraccion: number): { estado: EstadoEmocional; recienCompletado: boolean } {
  if (!esIdVideo(videoId) || !Number.isFinite(fraccion)) return { estado: e, recienCompletado: false };
  const previo = e.vistos[videoId] ?? { fraccion: 0, completado: false };
  const f = Math.min(1, Math.max(previo.fraccion, fraccion));
  const completado = previo.completado || f >= UMBRAL_VISTO;
  if (f === previo.fraccion && completado === previo.completado) return { estado: e, recienCompletado: false };
  return { estado: { ...e, vistos: { ...e.vistos, [videoId]: { fraccion: f, completado } } }, recienCompletado: completado && !previo.completado };
}

export function validarTextoAprendizaje(texto: string): string | null {
  const t = texto.trim();
  if (t.length === 0) return 'Escribe tu aprendizaje antes de guardarlo.';
  if (t.length > LARGO_MAXIMO_APRENDIZAJE) return `Usa como máximo ${LARGO_MAXIMO_APRENDIZAJE} caracteres.`;
  return null;
}

export function agregarAprendizaje(e: EstadoEmocional, a: Aprendizaje): Result<EstadoEmocional> {
  const error = validarTextoAprendizaje(a.texto);
  if (error) return fallo([error]);
  if (!esIdVideo(a.videoId)) return fallo(['Contenido no reconocido.']);
  return exito({ ...e, aprendizajes: [...e.aprendizajes, { ...a, texto: a.texto.trim() }] });
}

export function borrarAprendizaje(e: EstadoEmocional, id: string): EstadoEmocional {
  return { ...e, aprendizajes: e.aprendizajes.filter((a) => a.id !== id) };
}

/** Normaliza datos guardados (no confiables). */
export function validarEstadoEmocional(datos: unknown): Result<EstadoEmocional> {
  if (!esRegistro(datos) || datos.version !== 1) return fallo(['Datos de AURA emocional no reconocidos.']);
  const guardados = Array.isArray(datos.guardados) ? [...new Set(datos.guardados.filter(esIdVideo))] : [];
  const vistos: Record<string, Avance> = {};
  if (esRegistro(datos.vistos)) {
    for (const [id, v] of Object.entries(datos.vistos)) {
      if (esIdVideo(id) && esRegistro(v) && typeof v.fraccion === 'number' && v.fraccion >= 0 && v.fraccion <= 1) {
        vistos[id] = { fraccion: v.fraccion, completado: v.completado === true || v.fraccion >= UMBRAL_VISTO };
      }
    }
  }
  const aprendizajes = Array.isArray(datos.aprendizajes)
    ? datos.aprendizajes.filter(
        (a): a is Aprendizaje =>
          esRegistro(a) &&
          typeof a.id === 'string' &&
          /^[\w-]{8,64}$/.test(a.id) &&
          esIdVideo(a.videoId) &&
          typeof a.texto === 'string' &&
          validarTextoAprendizaje(a.texto) === null &&
          typeof a.fecha === 'string' &&
          !Number.isNaN(Date.parse(a.fecha)),
      )
    : [];
  return exito({ version: 1, guardados, vistos, aprendizajes });
}

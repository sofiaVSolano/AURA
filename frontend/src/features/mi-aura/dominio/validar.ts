// Validación del estado guardado en el dispositivo. Los datos del cliente no son
// confiables: se normalizan, se descartan entradas inválidas y nunca se asume su forma.
import { exito, fallo, type Result } from '../../../lib/result.ts';
import { esFechaIso, esRegistro, esUno } from '../../../lib/validacion.ts';
import {
  COLORES,
  DECORACIONES,
  ESTADO_INICIAL,
  ETAPAS,
  EXPRESIONES,
  FORMAS,
  LARGO_MAXIMO_NOMBRE,
  LISTA_TIPOS,
  PREFERENCIAS_INICIALES,
  TIPOS_EXPERIENCIA,
  type EstadoAura,
  type Experiencia,
  type PreferenciasAvatar,
} from './modelo.ts';

const ids = <T extends { id: string }>(xs: readonly T[]) => xs.map((x) => x.id) as T['id'][];
export const MAXIMO_EXPERIENCIAS = 5000;

/** Letras (cualquier idioma), números, espacios, apóstrofos y guiones. */
export function validarNombre(nombre: string): string | null {
  const t = nombre.trim();
  if (t.length === 0) return 'Escribe un nombre o deja el que viene por defecto.';
  if (t.length > LARGO_MAXIMO_NOMBRE) return `Usa como máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(t)) return 'Usa solo letras, números, espacios o guiones.';
  return null;
}

const esIsoCompleta = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v) && !Number.isNaN(Date.parse(v));

export function esExperienciaValida(e: unknown): e is Experiencia {
  if (!esRegistro(e)) return false;
  if (typeof e.id !== 'string' || !/^[\w-]{8,64}$/.test(e.id)) return false;
  if (!esUno(e.tipo, LISTA_TIPOS)) return false;
  if (!esUno(e.dimension, ['emocional', 'academica'] as const)) return false;
  const fija = TIPOS_EXPERIENCIA[e.tipo].dimension;
  if (fija !== null && fija !== e.dimension) return false;
  if (typeof e.refId !== 'string' || !/^[a-z0-9][a-z0-9:._/-]{0,120}$/i.test(e.refId)) return false;
  return esIsoCompleta(e.fecha);
}

function normalizarPreferencias(p: unknown): PreferenciasAvatar {
  if (!esRegistro(p)) return PREFERENCIAS_INICIALES;
  const nombre = typeof p.nombre === 'string' && validarNombre(p.nombre) === null ? p.nombre.trim() : PREFERENCIAS_INICIALES.nombre;
  const decoraciones = Array.isArray(p.decoraciones)
    ? [...new Set(p.decoraciones.filter((d): d is PreferenciasAvatar['decoraciones'][number] => esUno(d, ids(DECORACIONES))))]
    : [];
  return {
    nombre,
    colorPrincipal: esUno(p.colorPrincipal, ids(COLORES)) ? p.colorPrincipal : PREFERENCIAS_INICIALES.colorPrincipal,
    colorComplementario: esUno(p.colorComplementario, ids(COLORES))
      ? p.colorComplementario
      : PREFERENCIAS_INICIALES.colorComplementario,
    forma: esUno(p.forma, ids(FORMAS)) ? p.forma : PREFERENCIAS_INICIALES.forma,
    expresion: esUno(p.expresion, ids(EXPRESIONES)) ? p.expresion : PREFERENCIAS_INICIALES.expresion,
    decoraciones,
  };
}

export interface EstadoValidado {
  estado: EstadoAura;
  /** Experiencias descartadas por no ser válidas. */
  descartadas: number;
}

export function validarEstadoAura(datos: unknown): Result<EstadoValidado> {
  if (!esRegistro(datos)) return fallo(['Los datos guardados no tienen un formato reconocible.']);
  if (datos.version !== 1) return fallo([`Versión de datos no compatible: ${String(datos.version)}.`]);

  const crudas = Array.isArray(datos.experiencias) ? datos.experiencias.slice(0, MAXIMO_EXPERIENCIAS) : [];
  const experiencias = crudas.filter(esExperienciaValida);
  const o = esRegistro(datos.onboarding) ? datos.onboarding : {};

  return exito({
    descartadas: (Array.isArray(datos.experiencias) ? datos.experiencias.length : 0) - experiencias.length,
    estado: {
      version: 1,
      preferencias: normalizarPreferencias(datos.preferencias),
      onboarding: {
        completado: o.completado === true,
        momentoProyecto: typeof o.momentoProyecto === 'string' && /^[a-z0-9-]{1,60}$/.test(o.momentoProyecto) ? o.momentoProyecto : null,
        fechaInicio: esIsoCompleta(o.fechaInicio) || esFechaIso(o.fechaInicio) ? (o.fechaInicio as string) : null,
      },
      experiencias,
      ultimaEtapaVista: esUno(datos.ultimaEtapaVista, ids(ETAPAS)) ? datos.ultimaEtapaVista : ESTADO_INICIAL.ultimaEtapaVista,
    },
  });
}

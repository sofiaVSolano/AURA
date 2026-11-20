// Reglas de evolución de Mi AURA. Función pura del historial de experiencias:
// reproducible, explicable y sin estados "peores". Ver docs/11-mi-aura.md.
import {
  DECORACIONES,
  ETAPAS,
  type Dimension,
  type Etapa,
  type Experiencia,
  type IdDecoracion,
  type IdEtapa,
  type TipoExperiencia,
} from './modelo.ts';

/** Días sin experiencias tras los cuales tu AURA "descansa contigo" (solo visual). */
export const DIAS_REPOSO = 7;

interface Resumen {
  total: number;
  tipos: Set<TipoExperiencia>;
  dimensiones: Set<Dimension>;
  porTipo: Map<TipoExperiencia, number>;
}

export type Hito =
  | { tipo: 'etapa'; etapa: IdEtapa; fecha: string; contribuciones: Experiencia[] }
  | { tipo: 'decoracion'; decoracion: IdDecoracion; fecha: string; contribucion: Experiencia };

export interface ProgresoSiguiente {
  siguiente: Etapa;
  total: number;
  requerido: number;
  tipos: number;
  tiposRequeridos: number;
  /** Dimensión aún no explorada, si la siguiente etapa pide ambas. */
  dimensionPendiente: Dimension | null;
}

export interface Evolucion {
  etapa: Etapa;
  indice: number;
  progreso: ProgresoSiguiente | null;
  significativas: Experiencia[];
  desbloqueadas: IdDecoracion[];
  hitos: Hito[];
  reposo: boolean;
}

/**
 * Experiencias que cuentan: una por cada par (tipo, refId), la más antigua.
 * Repetir lo mismo no suma: AURA no premia clics ni insistencia.
 */
export function experienciasSignificativas(experiencias: readonly Experiencia[]): Experiencia[] {
  const vistas = new Map<string, Experiencia>();
  const ordenadas = [...experiencias].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  for (const e of ordenadas) {
    const clave = `${e.tipo}|${e.refId}`;
    if (!vistas.has(clave)) vistas.set(clave, e);
  }
  return [...vistas.values()];
}

function cumple(etapa: Etapa, r: Resumen): boolean {
  return (
    r.total >= etapa.minimo &&
    r.tipos.size >= etapa.tiposDistintos &&
    (!etapa.ambasDimensiones || (r.dimensiones.has('emocional') && r.dimensiones.has('academica')))
  );
}

function decoracionCumplida(id: IdDecoracion, r: Resumen, indiceEtapa: number): boolean {
  const d = DECORACIONES.find((x) => x.id === id)!;
  const c = d.condicion;
  if ('etapa' in c) return indiceEtapa >= ETAPAS.findIndex((e) => e.id === c.etapa);
  return (r.porTipo.get(c.tipo) ?? 0) >= c.cantidad;
}

export function calcularEvolucion(experiencias: readonly Experiencia[], ahora: Date = new Date()): Evolucion {
  const significativas = experienciasSignificativas(experiencias);
  const r: Resumen = { total: 0, tipos: new Set(), dimensiones: new Set(), porTipo: new Map() };
  const hitos: Hito[] = [];
  const desbloqueadas: IdDecoracion[] = [];
  let indice = 0;
  let desdeUltimaEtapa: Experiencia[] = [];

  // Se reproduce el historial en orden: así cada hito conoce su fecha y qué lo hizo posible.
  for (const e of significativas) {
    r.total++;
    r.tipos.add(e.tipo);
    r.dimensiones.add(e.dimension);
    r.porTipo.set(e.tipo, (r.porTipo.get(e.tipo) ?? 0) + 1);
    desdeUltimaEtapa.push(e);

    // Las etapas solo avanzan: el recuento nunca disminuye al reproducir.
    while (indice + 1 < ETAPAS.length && cumple(ETAPAS[indice + 1]!, r)) {
      indice++;
      hitos.push({ tipo: 'etapa', etapa: ETAPAS[indice]!.id, fecha: e.fecha, contribuciones: desdeUltimaEtapa });
      desdeUltimaEtapa = [];
    }
    for (const d of DECORACIONES) {
      if (!desbloqueadas.includes(d.id) && decoracionCumplida(d.id, r, indice)) {
        desbloqueadas.push(d.id);
        hitos.push({ tipo: 'decoracion', decoracion: d.id, fecha: e.fecha, contribucion: e });
      }
    }
  }

  const etapa = ETAPAS[indice]!;
  const siguiente = ETAPAS[indice + 1];
  const progreso: ProgresoSiguiente | null = siguiente
    ? {
        siguiente,
        total: r.total,
        requerido: siguiente.minimo,
        tipos: r.tipos.size,
        tiposRequeridos: siguiente.tiposDistintos,
        dimensionPendiente: siguiente.ambasDimensiones
          ? !r.dimensiones.has('emocional')
            ? 'emocional'
            : !r.dimensiones.has('academica')
              ? 'academica'
              : null
          : null,
      }
    : null;

  const ultima = significativas.at(-1);
  const reposo = ultima !== undefined && (ahora.getTime() - Date.parse(ultima.fecha)) / 86_400_000 >= DIAS_REPOSO;

  return { etapa, indice, progreso, significativas, desbloqueadas, hitos, reposo };
}

export const indiceDeEtapa = (id: IdEtapa): number => ETAPAS.findIndex((e) => e.id === id);

// Modelo de AURA académica. Puro (sin React/Vite): se valida en la app, en las
// pruebas y podrá reutilizarse en el backend. Docs: docs/13-aura-academica.md.

// — Ruta (content/academica/rutas/<id>.json): orientativa y configurable —
export interface TemaEnRuta {
  id: string;
  titulo: string;
  resumen: string;
}
export interface EtapaRuta {
  id: string;
  titulo: string;
  descripcion: string;
  temas: TemaEnRuta[];
}
export interface Ruta {
  version: 1;
  id: string;
  nombre: string;
  /** Aclara que la ruta es orientativa y no lineal. */
  nota: string;
  etapas: EtapaRuta[];
}

// — Guía de un tema (content/academica/temas/<tema>.json) —
export interface Guia {
  version: 1;
  id: string;
  titulo: string;
  queEs: string;
  paraQueSirve: string;
  queDebeIncluir: Array<{ elemento: string; descripcion: string }>;
  comoSeOrganiza: Array<{ paso: string; descripcion: string }>;
  ejemplo: { contexto: string; fragmentos: Array<{ elemento: string; texto: string; explicacion: string }> };
  erroresFrecuentes: Array<{ enLugarDe: string; prueba: string; porque: string }>;
  recomendaciones: string[];
  /** Normas que cambian según institución, disciplina o estilo de citación (nunca universales). */
  dependeDe: string[];
  /** Datos orientativos (p. ej. extensión), siempre con su advertencia. */
  orientativo: Array<{ dato: string; valor: string }>;
  laboratorio: string | null;
  relacionados: string[];
}

// — Laboratorios (content/academica/laboratorios/<id>.json) —
export type Actividad =
  | {
      tipo: 'ordenar';
      id: string;
      titulo: string;
      consigna: string;
      items: Array<{ id: string; texto: string; pista: string }>;
      ordenEsperado: string[];
      nota?: string;
    }
  | {
      tipo: 'clasificar';
      id: string;
      titulo: string;
      consigna: string;
      categorias: Array<{ id: string; nombre: string }>;
      items: Array<{ id: string; texto: string; categoria: string; explicacion: string }>;
    }
  | {
      tipo: 'elegir';
      id: string;
      titulo: string;
      consigna: string;
      preguntas: Array<{ id: string; enunciado: string; opciones: Array<{ id: string; texto: string; adecuada: boolean; explicacion: string }> }>;
    }
  | {
      tipo: 'marcar';
      id: string;
      titulo: string;
      consigna: string;
      items: Array<{ id: string; texto: string; marcar: boolean; explicacion: string }>;
    }
  | {
      /** Escribir un elemento de tu tesis y recibir una evaluación con IA (intentos limitados). */
      tipo: 'redactar';
      id: string;
      titulo: string;
      consigna: string;
      /** Qué se escribe (p. ej. «resumen»). */
      elemento: string;
      /** Extensión recomendada, en palabras. */
      palabrasMin: number;
      palabrasMax: number;
    }
  | {
      tipo: 'simulador';
      id: string;
      titulo: string;
      consigna: string;
      tiempoSugeridoSegundos: number;
      preguntas: Array<{
        id: string;
        categoria: string;
        texto: string;
        claves: Array<{ descripcion: string; sugerencia: string; palabras: string[] }>;
      }>;
    };

export type TipoActividad = Actividad['tipo'];
export const TIPOS_ACTIVIDAD: readonly TipoActividad[] = ['ordenar', 'clasificar', 'elegir', 'marcar', 'redactar', 'simulador'];

/** Evaluaciones con IA disponibles por cada actividad de redacción (y para la tesis completa). */
export const INTENTOS_IA = 2;
/** Límite de caracteres que se envían a evaluar en una redacción. */
export const LARGO_MAXIMO_REDACCION = 10_000;

export interface Laboratorio {
  version: 1;
  id: string;
  titulo: string;
  descripcion: string;
  /** Tema de la ruta al que acompaña (o null si es transversal). */
  tema: string | null;
  actividades: Actividad[];
}

// — Retroalimentación formativa: explica cómo mejorar, sin veredictos —
export type EstadoItem = 'bien' | 'revisar';
export interface Retroalimentacion {
  /** Elementos bien encaminados (no es una nota). */
  logrados: number;
  total: number;
  items: Array<{ id: string; estado: EstadoItem; mensaje: string }>;
  /** Siguiente paso sugerido. */
  sugerencia: string;
}

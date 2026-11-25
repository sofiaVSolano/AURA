// Modelo de Mi AURA. Puro: sin React, DOM ni Vite (se usa en pruebas y podrá
// usarse en un futuro servidor para validar el progreso).

// — Variantes controladas de personalización —
export const COLORES = [
  { id: 'morado', nombre: 'Morado', matiz: 272 },
  { id: 'violeta', nombre: 'Violeta', matiz: 250 },
  { id: 'indigo', nombre: 'Índigo', matiz: 232 },
  { id: 'rosa', nombre: 'Rosa', matiz: 322 },
  { id: 'coral', nombre: 'Coral', matiz: 12 },
  { id: 'ambar', nombre: 'Ámbar', matiz: 40 },
  { id: 'menta', nombre: 'Menta', matiz: 160 },
  { id: 'cielo', nombre: 'Cielo', matiz: 200 },
] as const;
export type IdColor = (typeof COLORES)[number]['id'];

export const FORMAS = [
  { id: 'gota', nombre: 'Gota' },
  { id: 'nube', nombre: 'Nube' },
  { id: 'brote', nombre: 'Brote' },
  { id: 'piedra', nombre: 'Canto rodado' },
] as const;
export type IdForma = (typeof FORMAS)[number]['id'];

export const EXPRESIONES = [
  { id: 'serena', nombre: 'Serena' },
  { id: 'curiosa', nombre: 'Curiosa' },
  { id: 'alegre', nombre: 'Alegre' },
  { id: 'pensativa', nombre: 'Pensativa' },
  { id: 'tierna', nombre: 'Tierna' },
  { id: 'decidida', nombre: 'Decidida' },
] as const;
export type IdExpresion = (typeof EXPRESIONES)[number]['id'];

/** Índices que entiende el personaje 3D (mismo orden que FORMAS y EXPRESIONES). */
export const indiceForma = (id: IdForma) => Math.max(0, FORMAS.findIndex((f) => f.id === id));
export const indiceExpresion = (id: IdExpresion) => Math.max(0, EXPRESIONES.findIndex((e) => e.id === id));

// — Experiencias significativas (nunca clics ni tiempo conectado) —
export type Dimension = 'emocional' | 'academica';

export const TIPOS_EXPERIENCIA = {
  'contenido-explorado': {
    nombre: 'Explorar un contenido',
    descripcion: 'Ver un video de acompañamiento o leer una guía completa.',
    dimension: null,
  },
  'reflexion-registrada': {
    nombre: 'Escribir una reflexión',
    descripcion: 'Registrar una reflexión privada sobre cómo te sientes o qué aprendiste.',
    dimension: 'emocional',
  },
  'experiencia-compartida': {
    nombre: 'Compartir una experiencia',
    descripcion: 'Contar una experiencia que pueda acompañar a otras personas.',
    dimension: 'emocional',
  },
  'ejercicio-completado': {
    nombre: 'Completar un ejercicio',
    descripcion: 'Terminar un ejercicio interactivo de AURA académica.',
    dimension: 'academica',
  },
  'sustentacion-practicada': {
    nombre: 'Practicar tu sustentación',
    descripcion: 'Hacer una práctica de presentación o sustentación.',
    dimension: 'academica',
  },
  'avance-academico': {
    nombre: 'Registrar un avance',
    descripcion: 'Marcar un avance real en una actividad de tu proyecto.',
    dimension: 'academica',
  },
} as const satisfies Record<string, { nombre: string; descripcion: string; dimension: Dimension | null }>;
export type TipoExperiencia = keyof typeof TIPOS_EXPERIENCIA;
export const LISTA_TIPOS = Object.keys(TIPOS_EXPERIENCIA) as TipoExperiencia[];

export interface Experiencia {
  id: string;
  tipo: TipoExperiencia;
  dimension: Dimension;
  /** Qué se exploró/completó (id del contenido o actividad). Repetirlo no suma de nuevo. */
  refId: string;
  /** ISO 8601 (UTC). */
  fecha: string;
}

// — Etapas de evolución —
export const ETAPAS = [
  {
    id: 'origen',
    nombre: 'Origen',
    descripcion: 'Una esfera orgánica y difuminada: todo lo que puede llegar a ser.',
    comoSeObtiene: 'Tu AURA nace contigo, sin requisitos.',
    minimo: 0,
    tiposDistintos: 0,
    ambasDimensiones: false,
  },
  {
    id: 'descubrimiento',
    nombre: 'Descubrimiento',
    descripcion: 'Aparecen formas y una silueta propia.',
    comoSeObtiene: 'Vive 2 experiencias significativas de cualquier tipo.',
    minimo: 2,
    tiposDistintos: 1,
    ambasDimensiones: false,
  },
  {
    id: 'reconocimiento',
    nombre: 'Reconocimiento',
    descripcion: 'Surgen rasgos: tu AURA te mira y te reconoce.',
    comoSeObtiene: 'Llega a 5 experiencias significativas de al menos 2 tipos distintos.',
    minimo: 5,
    tiposDistintos: 2,
    ambasDimensiones: false,
  },
  {
    id: 'transformacion',
    nombre: 'Transformación',
    descripcion: 'Gana personalidad y detalles que la hacen única.',
    comoSeObtiene: 'Llega a 9 experiencias significativas de al menos 3 tipos distintos.',
    minimo: 9,
    tiposDistintos: 3,
    ambasDimensiones: false,
  },
  {
    id: 'mi-aura',
    nombre: 'Mi AURA',
    descripcion: 'Un personaje definido, con tu sello, que reúne todo tu recorrido.',
    comoSeObtiene: 'Llega a 14 experiencias significativas, de 3 tipos o más, en lo emocional y en lo académico.',
    minimo: 14,
    tiposDistintos: 3,
    ambasDimensiones: true,
  },
] as const;
/** Lo que dice tu AURA al llegar a cada etapa (mismo orden que ETAPAS). */
export const FRASES_ETAPA = [
  'Todavía soy una luz: cada experiencia me da forma.',
  '¡Mira! Ya tengo una silueta propia.',
  'Ahora puedo verte: tengo ojos y bracitos.',
  'Ya soy yo, con mi forma y mi expresión.',
  'Llegamos juntos hasta aquí. Soy tu AURA completa.',
] as const;

export type Etapa = (typeof ETAPAS)[number];
export type IdEtapa = Etapa['id'];

// — Elementos decorativos desbloqueables —
export type CondicionDecoracion = { tipo: TipoExperiencia; cantidad: number } | { etapa: IdEtapa };

export const DECORACIONES = [
  { id: 'estrellas', nombre: 'Estrellas', condicion: { tipo: 'sustentacion-practicada', cantidad: 1 } },
  { id: 'luciernagas', nombre: 'Luciérnagas', condicion: { tipo: 'reflexion-registrada', cantidad: 2 } },
  { id: 'hojas', nombre: 'Hojas', condicion: { tipo: 'avance-academico', cantidad: 2 } },
  { id: 'anillo', nombre: 'Anillo orbital', condicion: { tipo: 'ejercicio-completado', cantidad: 3 } },
  { id: 'flor', nombre: 'Flor', condicion: { tipo: 'experiencia-compartida', cantidad: 1 } },
  { id: 'aurora', nombre: 'Aurora', condicion: { etapa: 'mi-aura' } },
] as const satisfies ReadonlyArray<{ id: string; nombre: string; condicion: CondicionDecoracion }>;
export type IdDecoracion = (typeof DECORACIONES)[number]['id'];

export function comoSeDesbloquea(condicion: CondicionDecoracion): string {
  if ('etapa' in condicion) {
    return `Se obtiene al alcanzar la etapa ${ETAPAS.find((e) => e.id === condicion.etapa)?.nombre ?? condicion.etapa}.`;
  }
  const tipo = TIPOS_EXPERIENCIA[condicion.tipo].nombre.toLowerCase();
  return condicion.cantidad === 1 ? `Se obtiene al ${tipo} por primera vez.` : `Se obtiene al ${tipo} ${condicion.cantidad} veces.`;
}

// — Estado guardado —
export interface PreferenciasAvatar {
  nombre: string;
  colorPrincipal: IdColor;
  colorComplementario: IdColor;
  forma: IdForma;
  expresion: IdExpresion;
  /** Decoraciones que el usuario eligió mostrar (solo cuentan si están desbloqueadas). */
  decoraciones: IdDecoracion[];
}

export const PREFERENCIAS_INICIALES: PreferenciasAvatar = {
  nombre: 'Aura',
  colorPrincipal: 'morado',
  colorComplementario: 'cielo',
  forma: 'gota',
  expresion: 'serena',
  decoraciones: [],
};

export const LARGO_MAXIMO_NOMBRE = 24;

/** Momentos del proyecto para elegir al crear tu AURA cuando no hay ruta académica cargada. */
export const MOMENTOS_GENERALES = [
  { valor: 'eligiendo-tema', etiqueta: 'Eligiendo o definiendo mi tema' },
  { valor: 'construyendo', etiqueta: 'Construyendo mi proyecto' },
  { valor: 'escribiendo', etiqueta: 'Escribiendo o analizando resultados' },
  { valor: 'cerrando', etiqueta: 'Preparando la entrega o la sustentación' },
];


export interface EstadoAura {
  version: 1;
  preferencias: PreferenciasAvatar;
  onboarding: {
    completado: boolean;
    /** Momento del proyecto elegido (opcional). */
    momentoProyecto: string | null;
    /** Nacimiento de tu AURA (ISO). */
    fechaInicio: string | null;
  };
  experiencias: Experiencia[];
  /** Última etapa que el usuario ya vio celebrada (para anunciar transformaciones una sola vez). */
  ultimaEtapaVista: IdEtapa;
}

export const ESTADO_INICIAL: EstadoAura = {
  version: 1,
  preferencias: PREFERENCIAS_INICIALES,
  onboarding: { completado: false, momentoProyecto: null, fechaInicio: null },
  experiencias: [],
  ultimaEtapaVista: 'origen',
};

export const matizDe = (id: IdColor): number => COLORES.find((c) => c.id === id)?.matiz ?? 272;

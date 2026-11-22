// Esquema de metadatos de los videos (content/videos/<area>/<categoria>/<subtema>/metadata.json).
// Un video por subtema: una sola idea principal. Documentado en docs/10-contenidos.md. Versión 2.

export const AREAS = ['emocional', 'academico'] as const;
export type AreaVideo = (typeof AREAS)[number];

/** Flujo de producción. Solo "publicado" se muestra como disponible. */
export const ESTADOS = ['idea', 'guion', 'storyboard', 'animacion', 'revision', 'publicado'] as const;
export type EstadoVideo = (typeof ESTADOS)[number];

/** Duración: entre 30 s y 6 min (los videos de acompañamiento rondan 3–5 min); máximo absoluto 360 s. */
export const DURACION_MINIMA_OBJETIVO = 30;
export const DURACION_MAXIMA_SEGUNDOS = 360;

export interface ArchivosVideo {
  /** Ruta del recurso: archivo final MP4 (H.264/AAC, compatible) dentro de la carpeta; null si no existe. */
  video: string | null;
  /** Formato optimizado opcional (WebM AV1/VP9), servido primero si existe. */
  videoAlterno: string | null;
  /** Portada (WebP/AVIF). */
  poster: string | null;
  /** Subtítulos WebVTT por idioma: { "es": "subtitulos.es.vtt" }. */
  subtitulos: Record<string, string>;
  /** Transcripción en texto plano o Markdown. */
  transcripcion: string | null;
}

export interface MetadatosVideo {
  version: 2;
  /** "<area>.<categoria>.<subtema>". */
  id: string;
  area: AreaVideo;
  categoria: string;
  subtema: string;
  titulo: string;
  /** Idea principal del video (una sola). */
  descripcion: string;
  estado: EstadoVideo;
  /** Duración a la que se ajusta el guion (30–360 s). */
  duracionObjetivoSegundos: number;
  /** Duración real del archivo final (≤ 360 s); null mientras no exista. */
  duracionSegundos: number | null;
  archivos: ArchivosVideo;
  /** Perfiles institucionales donde aplica; ["*"] = todos. */
  perfiles: string[];
  etiquetas: string[];
  creditos: string[];
  /** Última actualización (AAAA-MM-DD). */
  actualizado: string;
}

/** Entrada del catálogo: metadatos validados + carpeta relativa a content/videos. */
export interface EntradaVideo extends MetadatosVideo {
  carpeta: string;
}

/** Archivos que deben existir en disco si el video está publicado. */
export function archivosRequeridos(v: MetadatosVideo): string[] {
  const a = v.archivos;
  return [a.video, a.videoAlterno, a.poster, a.transcripcion, ...Object.values(a.subtitulos)].filter(
    (x): x is string => x !== null,
  );
}

// Catálogo central de videos. Lee todos los metadata.json de content/videos en
// tiempo de compilación (Vite), los valida y expone solo lo que es seguro mostrar.
import { config, mediaUrl } from '../../config/env.ts';
import type { FuentesVideo } from '../../design-system/components/ReproductorVideo/ReproductorVideo.tsx';
import type { AreaVideo, EntradaVideo } from './esquema.ts';
import { estaPublicado, validarMetadatosVideo } from './validar.ts';

const modulos = import.meta.glob<unknown>('../../../../content/videos/{emocional,academico}/**/metadata.json', {
  eager: true,
  import: 'default',
});

const todos: EntradaVideo[] = [];
const errores: string[] = [];

for (const [ruta, datos] of Object.entries(modulos)) {
  const carpeta = /\/content\/videos\/(.+)\/metadata\.json$/.exec(ruta)?.[1] ?? ruta;
  const r = validarMetadatosVideo(datos, carpeta);
  if (r.ok) todos.push(r.valor);
  else errores.push(...r.errores);
}

if (import.meta.env.DEV && errores.length > 0) {
  console.warn(`[AURA] ${errores.length} problema(s) en metadatos de video:\n- ${errores.join('\n- ')}`);
}

todos.sort((a, b) => a.id.localeCompare(b.id, 'es'));

export const catalogoVideos = {
  /** Todos los videos válidos, en cualquier estado (uso interno/editorial). */
  todos: todos as readonly EntradaVideo[],
  /** Errores de validación (videos excluidos del catálogo). */
  errores: errores as readonly string[],
  /** Videos publicados para el perfil institucional activo. */
  publicados(area?: AreaVideo): EntradaVideo[] {
    return todos.filter((v) => estaPublicado(v, config.contentProfile) && (!area || v.area === area));
  },
};

/** URL pública de un archivo del video (servida desde el origen de medios). */
export function urlArchivoVideo(video: EntradaVideo, archivo: string): string {
  return mediaUrl(`videos/${video.carpeta}/${archivo}`);
}

const NOMBRES_IDIOMA: Record<string, string> = { es: 'Español', en: 'English' };

/** Fuentes del reproductor para un video publicado; null si no se puede reproducir. */
export function fuentesDe(video: EntradaVideo): FuentesVideo | null {
  const a = video.archivos;
  if (video.estado !== 'publicado' || !a.video) return null;
  const url = (f: string | null) => (f ? urlArchivoVideo(video, f) : undefined);
  return {
    video: urlArchivoVideo(video, a.video),
    videoAlterno: url(a.videoAlterno),
    poster: url(a.poster),
    transcripcion: url(a.transcripcion),
    subtitulos: Object.entries(a.subtitulos).map(([idioma, f]) => ({ idioma, etiqueta: NOMBRES_IDIOMA[idioma] ?? idioma, src: urlArchivoVideo(video, f) })),
  };
}

// Único punto de lectura de la configuración pública (variables VITE_*).
// No contiene secretos: todo lo que se lea aquí termina en el bundle del navegador.

const withSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);

export const config = {
  /** Ruta base con la que se publicó la app (siempre termina en "/"). */
  basePath: import.meta.env.BASE_URL,
  /** URL base de videos y otros medios. Por defecto, "<base>media/". */
  mediaBaseUrl: withSlash(import.meta.env.VITE_MEDIA_BASE_URL || `${import.meta.env.BASE_URL}media/`),
  /** Perfil de contenido institucional (universidad / metodología). */
  contentProfile: import.meta.env.VITE_CONTENT_PROFILE || 'default',
  isProduction: import.meta.env.PROD,
} as const;

/** Resuelve la URL de un recurso audiovisual a partir de su ruta relativa (p. ej. "videos/emocional/x.mp4"). */
export function mediaUrl(relativePath: string): string {
  return config.mediaBaseUrl + relativePath.replace(/^\/+/, '');
}

// Validación pura de metadatos de video. Sin dependencias de Vite ni del DOM:
// se ejecuta en la app, en las pruebas y en el script de publicación de medios.
import { exito, fallo, type Result } from '../../lib/result.ts';
import { esFechaIso, esListaDe, esNombreArchivo, esRegistro, esSlug, esTexto, esUno } from '../../lib/validacion.ts';
import {
  AREAS,
  DURACION_MAXIMA_SEGUNDOS,
  DURACION_MINIMA_OBJETIVO,
  ESTADOS,
  type EntradaVideo,
  type MetadatosVideo,
} from './esquema.ts';

const esTextoSimple = (v: unknown): v is string => esTexto(v, 60);
const esPerfil = (v: unknown): v is string => v === '*' || esSlug(v);
const esEnteroEntre = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Valida un metadata.json.
 * @param carpeta ruta de la carpeta relativa a content/videos ("emocional/tengo-miedo/hablar-en-publico").
 */
export function validarMetadatosVideo(datos: unknown, carpeta: string): Result<EntradaVideo> {
  const e: string[] = [];
  if (!esRegistro(datos)) return fallo([`${carpeta}: metadata.json debe ser un objeto`]);
  const d = datos;

  if (d.version !== 2) e.push('version debe ser 2');
  if (!esUno(d.area, AREAS)) e.push(`area debe ser una de: ${AREAS.join(', ')}`);
  for (const campo of ['categoria', 'subtema'] as const) {
    if (!esSlug(d[campo])) e.push(`${campo} debe estar en kebab-case ASCII (p. ej. "hablar-en-publico")`);
  }
  const esperado = `${String(d.area)}/${String(d.categoria)}/${String(d.subtema)}`;
  if (carpeta !== esperado) e.push(`la carpeta "${carpeta}" no coincide con area/categoria/subtema ("${esperado}")`);
  if (d.id !== esperado.replaceAll('/', '.')) e.push(`id debe ser "${esperado.replaceAll('/', '.')}"`);
  if (!esTexto(d.titulo, 90)) e.push('titulo es obligatorio (máx. 90 caracteres)');
  if (!esTexto(d.descripcion, 280)) e.push('descripcion (idea principal) es obligatoria (máx. 280 caracteres)');
  if (!esUno(d.estado, ESTADOS)) e.push(`estado debe ser uno de: ${ESTADOS.join(', ')}`);

  if (!esEnteroEntre(d.duracionObjetivoSegundos, DURACION_MINIMA_OBJETIVO, DURACION_MAXIMA_SEGUNDOS)) {
    e.push(`duracionObjetivoSegundos debe estar entre ${DURACION_MINIMA_OBJETIVO} y ${DURACION_MAXIMA_SEGUNDOS}`);
  }
  const duracion = d.duracionSegundos;
  if (duracion !== null && !esEnteroEntre(duracion, 1, DURACION_MAXIMA_SEGUNDOS)) {
    e.push(`duracionSegundos debe ser null o un entero entre 1 y ${DURACION_MAXIMA_SEGUNDOS} (máximo absoluto)`);
  }

  const a = d.archivos;
  if (!esRegistro(a)) {
    e.push('archivos debe ser un objeto');
  } else {
    for (const campo of ['video', 'videoAlterno', 'poster', 'transcripcion'] as const) {
      if (a[campo] !== null && !esNombreArchivo(a[campo])) {
        e.push(`archivos.${campo} debe ser null o un nombre de archivo simple (sin carpetas)`);
      }
    }
    if (typeof a.video === 'string' && !/\.mp4$/i.test(a.video)) e.push('archivos.video debe ser .mp4 (H.264/AAC)');
    if (typeof a.videoAlterno === 'string' && !/\.webm$/i.test(a.videoAlterno)) e.push('archivos.videoAlterno debe ser .webm');
    if (typeof a.poster === 'string' && !/\.(webp|avif|jpg)$/i.test(a.poster)) e.push('archivos.poster debe ser .webp, .avif o .jpg');
    if (
      !esRegistro(a.subtitulos) ||
      !Object.entries(a.subtitulos).every(([k, v]) => esSlug(k) && esNombreArchivo(v) && /\.vtt$/i.test(v))
    ) {
      e.push('archivos.subtitulos debe ser { "<idioma>": "<archivo.vtt>" }');
    }
  }

  if (!esListaDe(d.perfiles, esPerfil) || d.perfiles.length === 0) {
    e.push('perfiles debe ser una lista no vacía de slugs o ["*"]');
  }
  if (!esListaDe(d.etiquetas, esTextoSimple)) e.push('etiquetas debe ser una lista de textos');
  if (!esListaDe(d.creditos, esTextoSimple)) e.push('creditos debe ser una lista de textos');
  if (!esFechaIso(d.actualizado)) e.push('actualizado debe ser una fecha AAAA-MM-DD');

  // Un video solo puede publicarse completo, accesible y dentro de la duración.
  if (d.estado === 'publicado' && esRegistro(a)) {
    if (a.video === null) e.push('publicado: falta archivos.video');
    if (a.poster === null) e.push('publicado: falta archivos.poster');
    if (a.transcripcion === null) e.push('publicado: falta archivos.transcripcion');
    if (!esRegistro(a.subtitulos) || !('es' in a.subtitulos)) e.push('publicado: faltan subtítulos en español');
    if (duracion === null) e.push('publicado: falta duracionSegundos');
  }

  if (e.length > 0) return fallo(e.map((m) => `${carpeta}: ${m}`));
  return exito({ ...(d as unknown as MetadatosVideo), carpeta });
}

/** ¿El video se puede mostrar como disponible para este perfil institucional? */
export function estaPublicado(video: EntradaVideo, perfil: string): boolean {
  return video.estado === 'publicado' && (video.perfiles.includes('*') || video.perfiles.includes(perfil));
}

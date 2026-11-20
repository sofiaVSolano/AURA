// Catálogo emocional (content/emocional/categorias.json): categorías y subtemas.
// Puro: validación y unión con los videos sin depender de Vite.
import { exito, fallo, type Result } from '../../../lib/result.ts';
import { esListaDe, esRegistro, esSlug, esTexto } from '../../../lib/validacion.ts';
import type { EntradaVideo } from '../../../content/videos/esquema.ts';

export interface Subtema {
  id: string;
  titulo: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  /** Matiz del color de la categoría (grados). Ninguna emoción usa rojo de alarma. */
  matiz: number;
  relacionadas: string[];
  subtemas: Subtema[];
}

export interface CatalogoEmocional {
  pregunta: string;
  categorias: Categoria[];
}

const esSubtema = (v: unknown): v is Subtema => esRegistro(v) && esSlug(v.id) && esTexto(v.titulo, 80);

export function validarCategorias(datos: unknown): Result<CatalogoEmocional> {
  if (!esRegistro(datos) || datos.version !== 1) return fallo(['categorias.json: versión no reconocida (se espera 1)']);
  if (!esTexto(datos.pregunta, 80)) return fallo(['categorias.json: falta la pregunta de entrada']);
  if (!Array.isArray(datos.categorias) || datos.categorias.length === 0) return fallo(['categorias.json: sin categorías']);
  const e: string[] = [];
  const ids = new Set<string>();
  datos.categorias.forEach((c, i) => {
    const pre = `categorias[${i}]`;
    if (!esRegistro(c)) return void e.push(`${pre} debe ser un objeto`);
    if (!esSlug(c.id)) e.push(`${pre}.id debe ser kebab-case`);
    if (ids.has(String(c.id))) e.push(`${pre}.id repetido: ${String(c.id)}`);
    ids.add(String(c.id));
    if (!esTexto(c.nombre, 40)) e.push(`${pre}.nombre es obligatorio`);
    if (!esTexto(c.descripcion, 200)) e.push(`${pre}.descripcion es obligatoria`);
    if (typeof c.matiz !== 'number' || c.matiz < 0 || c.matiz > 360) e.push(`${pre}.matiz debe estar entre 0 y 360`);
    if (!esListaDe(c.relacionadas, esSlug)) e.push(`${pre}.relacionadas debe ser una lista de ids`);
    if (!esListaDe(c.subtemas, esSubtema) || c.subtemas.length === 0) e.push(`${pre}.subtemas debe ser una lista de { id, titulo }`);
    else if (new Set(c.subtemas.map((s) => s.id)).size !== c.subtemas.length) e.push(`${pre}: subtemas repetidos`);
  });
  for (const c of datos.categorias) {
    if (esRegistro(c) && Array.isArray(c.relacionadas)) {
      for (const r of c.relacionadas) if (!ids.has(String(r))) e.push(`${String(c.id)}: relacionada inexistente "${String(r)}"`);
    }
  }
  if (e.length) return fallo(e);
  return exito({ pregunta: datos.pregunta, categorias: datos.categorias as Categoria[] });
}

/** Id del video que corresponde a un subtema (un video por subtema). */
export const idVideo = (categoria: string, subtema: string) => `emocional.${categoria}.${subtema}`;

export interface SubtemaConVideo extends Subtema {
  categoria: Categoria;
  /** Metadatos del video si existen (en cualquier estado). */
  video: EntradaVideo | undefined;
  /** true solo si el video está publicado para el perfil activo. */
  disponible: boolean;
}

export function unirConVideos(
  catalogo: CatalogoEmocional,
  videos: readonly EntradaVideo[],
  disponible: (v: EntradaVideo) => boolean,
): Map<string, SubtemaConVideo[]> {
  const porId = new Map(videos.map((v) => [v.id, v]));
  return new Map(
    catalogo.categorias.map((c) => [
      c.id,
      c.subtemas.map((s) => {
        const video = porId.get(idVideo(c.id, s.id));
        return { ...s, categoria: c, video, disponible: video ? disponible(video) : false };
      }),
    ]),
  );
}

/** Siguiente subtema dentro de la categoría (circular). */
export function siguienteSubtema<T extends { id: string }>(lista: readonly T[], actual: string): T | undefined {
  const i = lista.findIndex((s) => s.id === actual);
  if (i < 0 || lista.length < 2) return undefined;
  return lista[(i + 1) % lista.length];
}

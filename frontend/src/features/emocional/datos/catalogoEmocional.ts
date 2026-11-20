// Carga (en compilación) el catálogo emocional y lo une con los videos.
import { config } from '../../../config/env.ts';
import { catalogoVideos } from '../../../content/videos/catalogo.ts';
import { estaPublicado } from '../../../content/videos/validar.ts';
import { siguienteSubtema, unirConVideos, validarCategorias, type CatalogoEmocional, type Categoria, type SubtemaConVideo } from '../dominio/categorias.ts';

const archivo = Object.values(import.meta.glob<unknown>('../../../../../content/emocional/categorias.json', { eager: true, import: 'default' }))[0];
const r = validarCategorias(archivo);
if (!r.ok) throw new Error(`[AURA] content/emocional/categorias.json no es válido:\n- ${r.errores.join('\n- ')}`);

export const catalogoEmocional: CatalogoEmocional = r.valor;

const porCategoria = unirConVideos(
  catalogoEmocional,
  catalogoVideos.todos.filter((v) => v.area === 'emocional'),
  (v) => estaPublicado(v, config.contentProfile),
);

export const buscarCategoria = (id: string | undefined): Categoria | undefined =>
  catalogoEmocional.categorias.find((c) => c.id === id);

export const subtemasDe = (categoria: string): SubtemaConVideo[] => porCategoria.get(categoria) ?? [];

export const buscarSubtema = (categoria: string | undefined, subtema: string | undefined): SubtemaConVideo | undefined =>
  categoria ? subtemasDe(categoria).find((s) => s.id === subtema) : undefined;

export const siguienteDe = (s: SubtemaConVideo) => siguienteSubtema(subtemasDe(s.categoria.id), s.id);

export const todosLosSubtemas = (): SubtemaConVideo[] => [...porCategoria.values()].flat();

export const rutaSubtema = (s: { id: string; categoria: { id: string } }) => `/emocional/${s.categoria.id}/${s.id}`;

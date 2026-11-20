// Carga (en compilación) la ruta académica del perfil activo, las guías y los
// laboratorios. Todo es contenido declarativo: agregar temas no requiere código.
import { config } from '../../../config/env.ts';
import { perfilActivo } from '../../../content/perfiles/perfil.ts';
import { catalogoVideos } from '../../../content/videos/catalogo.ts';
import type { EntradaVideo } from '../../../content/videos/esquema.ts';
import { estaPublicado } from '../../../content/videos/validar.ts';
import type { EtapaRuta, Guia, Laboratorio, Ruta, TemaEnRuta } from '../dominio/modelo.ts';
import { validarGuia, validarLaboratorio, validarRuta } from '../dominio/validar.ts';

const rutas = import.meta.glob<unknown>('../../../../../content/academica/rutas/*.json', { eager: true, import: 'default' });
const temas = import.meta.glob<unknown>('../../../../../content/academica/temas/*.json', { eager: true, import: 'default' });
const labs = import.meta.glob<unknown>('../../../../../content/academica/laboratorios/*.json', { eager: true, import: 'default' });

const idDe = (ruta: string) => /\/([a-z0-9-]+)\.json$/.exec(ruta)?.[1] ?? ruta;
const errores: string[] = [];

function cargar<T>(modulos: Record<string, unknown>, validar: (d: unknown, id: string) => { ok: true; valor: T } | { ok: false; errores: string[] }) {
  const mapa = new Map<string, T>();
  for (const [ruta, datos] of Object.entries(modulos)) {
    const r = validar(datos, idDe(ruta));
    if (r.ok) mapa.set(idDe(ruta), r.valor);
    else errores.push(...r.errores);
  }
  return mapa;
}

const todasLasRutas = cargar<Ruta>(rutas, validarRuta);
const guias = cargar<Guia>(temas, validarGuia);
const laboratorios = cargar<Laboratorio>(labs, validarLaboratorio);

if (import.meta.env.DEV && errores.length) console.warn(`[AURA] Contenido académico con problemas:\n- ${errores.join('\n- ')}`);

/** Ruta del perfil institucional activo (o la general como respaldo). */
export const ruta: Ruta = (() => {
  const r = todasLasRutas.get(perfilActivo.proyecto.ruta) ?? todasLasRutas.get('general');
  if (!r) throw new Error('[AURA] No hay una ruta académica válida (content/academica/rutas/general.json).');
  if (import.meta.env.DEV && r.id !== perfilActivo.proyecto.ruta) {
    console.warn(`[AURA] Ruta "${perfilActivo.proyecto.ruta}" (perfil ${config.contentProfile}) no disponible; se usa "${r.id}".`);
  }
  return r;
})();

export interface TemaResuelto {
  etapa: EtapaRuta;
  tema: TemaEnRuta;
  /** Guía completa, si ya existe. */
  guia: Guia | undefined;
  video: EntradaVideo | undefined;
  videoDisponible: boolean;
}

const indice = new Map<string, TemaResuelto>();
for (const etapa of ruta.etapas) {
  for (const tema of etapa.temas) {
    const video = catalogoVideos.todos.find((v) => v.id === `academico.${etapa.id}.${tema.id}`);
    indice.set(tema.id, {
      etapa,
      tema,
      guia: guias.get(tema.id),
      video,
      videoDisponible: video ? estaPublicado(video, config.contentProfile) : false,
    });
  }
}

export const temaPorId = (id: string | undefined): TemaResuelto | undefined => (id ? indice.get(id) : undefined);
export const rutaTema = (t: { etapa: { id: string }; tema: { id: string } }) => `/academica/${t.etapa.id}/${t.tema.id}`;
export const rutaLaboratorio = (id: string) => `/academica/laboratorios/${id}`;
export const laboratorioPorId = (id: string | undefined) => (id ? laboratorios.get(id) : undefined);
const ordenTemas = ruta.etapas.flatMap((e) => e.temas.map((t) => t.id));
/** Laboratorios en el orden de la ruta (los transversales, al final). */
export const listaLaboratorios = (): Laboratorio[] =>
  [...laboratorios.values()].sort((a, b) => {
    const pos = (l: Laboratorio) => (l.tema ? ordenTemas.indexOf(l.tema) : Infinity);
    return pos(a) - pos(b);
  });

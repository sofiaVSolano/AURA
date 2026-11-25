// Cómo se llaman, para una persona, los contenidos guardados en la exportación.
// Se carga solo al descargar los datos (trae los catálogos de contenido).
import { catalogoVideos } from '../../content/videos/catalogo.ts';
import { laboratorioPorId, ruta, temaPorId } from '../academica/datos/catalogoAcademico.ts';
import { buscarCategoria } from '../emocional/datos/catalogoEmocional.ts';
import { calcularEvolucion } from '../mi-aura/dominio/evolucion.ts';
import { COLORES, EXPRESIONES, FORMAS, MOMENTOS_GENERALES, TIPOS_EXPERIENCIA, type Experiencia } from '../mi-aura/dominio/modelo.ts';
import type { Nombres } from './informeDatos.ts';

const nombreEn = (lista: ReadonlyArray<{ id: string; nombre: string }>, id: string) => lista.find((x) => x.id === id)?.nombre;

export function nombresParaInforme(exportado: unknown): Nombres {
  const experiencias = (exportado as { datos?: { 'mi-aura'?: { experiencias?: Experiencia[] } } })?.datos?.['mi-aura']?.experiencias;
  let etapa: string | undefined;
  try {
    etapa = Array.isArray(experiencias) ? calcularEvolucion(experiencias).etapa.nombre : undefined;
  } catch {
    etapa = undefined;
  }
  return {
    video: (id) => {
      const v = catalogoVideos.todos.find((x) => x.id === id);
      if (!v) return undefined;
      const [area, grupo] = id.split('.');
      const seccion = area === 'emocional' ? buscarCategoria(grupo)?.nombre : temaPorId(id.split('.')[2])?.etapa.titulo;
      return seccion ? `${v.titulo} (${seccion})` : v.titulo;
    },
    tema: (id) => temaPorId(id)?.tema.titulo,
    actividad: (clave) => {
      const [labId, actId] = clave.split('/');
      const lab = laboratorioPorId(labId);
      const act = lab?.actividades.find((a) => a.id === actId);
      return lab ? (act ? `${act.titulo} · ${lab.titulo}` : lab.titulo) : undefined;
    },
    etapa,
    opcion: (grupo, id) => {
      if (grupo === 'color') return nombreEn(COLORES, id);
      if (grupo === 'forma') return nombreEn(FORMAS, id);
      if (grupo === 'expresion') return nombreEn(EXPRESIONES, id);
      if (grupo === 'experiencia') return id in TIPOS_EXPERIENCIA ? TIPOS_EXPERIENCIA[id as keyof typeof TIPOS_EXPERIENCIA].nombre : undefined;
      return ruta.etapas.find((e) => e.id === id)?.titulo ?? MOMENTOS_GENERALES.find((m) => m.valor === id)?.etiqueta;
    },
  };
}

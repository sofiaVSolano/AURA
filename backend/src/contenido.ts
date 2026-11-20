// Contenido compartido (content/) para validar en el servidor que una experiencia
// hace referencia a algo que existe. Reutiliza los validadores puros del frontend.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validarMetadatosVideo } from '../../frontend/src/content/videos/validar.ts';
import { validarLaboratorio, validarRuta } from '../../frontend/src/features/academica/dominio/validar.ts';
import type { TipoExperiencia } from '../../frontend/src/features/mi-aura/dominio/modelo.ts';

export interface IndiceContenido {
  videos: Map<string, { area: 'emocional' | 'academico'; publicado: boolean }>;
  temas: Set<string>;
  actividades: Set<string>;
  preguntasSimulador: Set<string>;
}

const json = (ruta: string): unknown => JSON.parse(readFileSync(ruta, 'utf8'));
const jsonEn = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []);

export function cargarContenido(raiz: string): IndiceContenido {
  const i: IndiceContenido = { videos: new Map(), temas: new Set(), actividades: new Set(), preguntasSimulador: new Set() };

  const dirVideos = join(raiz, 'videos');
  for (const r of readdirSync(dirVideos, { recursive: true, encoding: 'utf8' })) {
    const rel = r.replaceAll('\\', '/');
    if (!rel.endsWith('/metadata.json') || rel.startsWith('_plantilla/')) continue;
    const carpeta = rel.replace(/\/metadata\.json$/, '');
    const v = validarMetadatosVideo(json(join(dirVideos, rel)), carpeta);
    if (v.ok) i.videos.set(v.valor.id, { area: v.valor.area, publicado: v.valor.estado === 'publicado' });
  }
  for (const f of jsonEn(join(raiz, 'academica/rutas'))) {
    const r = validarRuta(json(join(raiz, 'academica/rutas', f)), f.replace(/\.json$/, ''));
    if (r.ok) r.valor.etapas.forEach((e) => e.temas.forEach((t) => i.temas.add(t.id)));
  }
  for (const f of jsonEn(join(raiz, 'academica/laboratorios'))) {
    const l = validarLaboratorio(json(join(raiz, 'academica/laboratorios', f)), f.replace(/\.json$/, ''));
    if (!l.ok) continue;
    for (const a of l.valor.actividades) {
      i.actividades.add(`${l.valor.id}/${a.id}`);
      if (a.tipo === 'simulador') a.preguntas.forEach((p) => i.preguntasSimulador.add(p.id));
    }
  }
  return i;
}

/**
 * ¿La experiencia apunta a contenido real? Devuelve la dimensión que corresponde
 * (calculada aquí, nunca la que diga el cliente) o null si no es válida.
 */
export function referenciaValida(c: IndiceContenido, tipo: TipoExperiencia, refId: string): 'emocional' | 'academica' | null {
  const [prefijo, ...resto] = refId.split(':');
  const valor = resto.join(':');
  switch (tipo) {
    case 'contenido-explorado': {
      // Solo cuenta un video PUBLICADO (no se puede "ver" uno en preparación).
      const v = prefijo === 'video' ? c.videos.get(valor) : undefined;
      return v?.publicado ? (v.area === 'academico' ? 'academica' : 'emocional') : null;
    }
    case 'reflexion-registrada':
      return prefijo === 'aprendizaje' && c.videos.has(valor) ? 'emocional' : null;
    case 'avance-academico':
      return prefijo === 'avance' && c.temas.has(valor) ? 'academica' : null;
    case 'ejercicio-completado':
      return prefijo === 'lab' && c.actividades.has(valor) ? 'academica' : null;
    case 'sustentacion-practicada':
      return prefijo === 'sim' && c.preguntasSimulador.has(valor) ? 'academica' : null;
    case 'experiencia-compartida':
      // La función de compartir aún no existe: no hay nada real a lo que referirse.
      return null;
  }
}

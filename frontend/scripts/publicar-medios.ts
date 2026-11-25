// Copia a dist/media/videos SOLO los archivos de videos publicados y válidos.
// Se ejecuta tras `vite build`. Falla si un video publicado no tiene sus archivos.
// Si los medios se alojan aparte (VITE_MEDIA_BASE_URL), sube dist/media/videos a ese origen.
// MEDIOS_MODO=enlace (Docker): en lugar de copiar, crea enlaces simbólicos a content/, que se
// monta como volumen. Es instantáneo y no duplica los videos dentro del contenedor.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { archivosRequeridos } from '../src/content/videos/esquema.ts';
import { validarMetadatosVideo } from '../src/content/videos/validar.ts';

const ORIGEN = '../content/videos';
const DESTINO = 'dist/media/videos';
const ENLAZAR = process.env.MEDIOS_MODO === 'enlace';

if (!existsSync('dist')) {
  console.error('[medios] No existe dist/. Ejecuta primero vite build.');
  process.exit(1);
}

// Al enlazar se rehace todo: así no quedan enlaces de videos que dejaron de publicarse
if (ENLAZAR) rmSync(DESTINO, { recursive: true, force: true });

const carpetas = readdirSync(ORIGEN, { recursive: true, encoding: 'utf8' })
  .map((r) => r.replaceAll('\\', '/'))
  .filter((r) => r.endsWith('/metadata.json') && !r.startsWith('_plantilla/'))
  .map((r) => r.replace(/\/metadata\.json$/, ''));

const errores: string[] = [];
let publicados = 0;
let copiados = 0;

for (const carpeta of carpetas) {
  const r = validarMetadatosVideo(JSON.parse(readFileSync(join(ORIGEN, carpeta, 'metadata.json'), 'utf8')), carpeta);
  if (!r.ok) {
    errores.push(...r.errores);
    continue;
  }
  if (r.valor.estado !== 'publicado') continue;
  publicados++;
  for (const archivo of archivosRequeridos(r.valor)) {
    const de = join(ORIGEN, carpeta, archivo);
    if (!existsSync(de)) {
      errores.push(`${carpeta}: falta ${archivo}`);
      continue;
    }
    const a = join(DESTINO, carpeta, archivo);
    mkdirSync(dirname(a), { recursive: true });
    if (ENLAZAR) symlinkSync(resolve(de), a);
    else copyFileSync(de, a);
    copiados++;
  }
}

if (errores.length) {
  console.error(`[medios] ${errores.length} problema(s):\n- ${errores.join('\n- ')}`);
  process.exit(1);
}
console.log(`[medios] ${carpetas.length} videos en el catálogo · ${publicados} publicados · ${copiados} archivos ${ENLAZAR ? 'enlazados' : 'copiados'} a ${DESTINO}`);

// Optimiza los videos publicados para el teléfono (requiere ffmpeg y ffprobe en el PATH).
// Para cada video publicado:
//   1. Si el índice (moov) está al final, lo mueve al inicio sin recodificar ("faststart"):
//      el navegador puede empezar a reproducir sin pedir antes el final del archivo.
//   2. Genera video-720.mp4 (H.264 720p, ~1/3 de los datos) si no existe.
//   3. Lo registra en metadata.json como archivos.videoMovil.
// Es idempotente: lo ya hecho se salta. Uso: npm run medios:movil
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarMetadatosVideo } from '../src/content/videos/validar.ts';

const RAIZ = fileURLToPath(new URL('../../content/videos/', import.meta.url));
const MOVIL = 'video-720.mp4';

/** ¿El índice del MP4 está antes de los datos? (lee solo las cajas de primer nivel) */
function indiceAlInicio(ruta: string): boolean {
  const fd = openSync(ruta, 'r');
  try {
    const cabecera = Buffer.alloc(8);
    let pos = 0;
    for (let k = 0; k < 20; k++) {
      if (readSync(fd, cabecera, 0, 8, pos) < 8) return false;
      let tam = cabecera.readUInt32BE(0);
      const tipo = cabecera.toString('latin1', 4, 8);
      if (tipo === 'moov') return true;
      if (tipo === 'mdat') return false;
      if (tam === 1) {
        const grande = Buffer.alloc(8);
        readSync(fd, grande, 0, 8, pos + 8);
        tam = Number(grande.readBigUInt64BE(0));
      }
      if (tam < 8) return false;
      pos += tam;
    }
    return false;
  } finally {
    closeSync(fd);
  }
}

const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

let movidos = 0;
let generados = 0;
let registrados = 0;
for (const r of readdirSync(RAIZ, { recursive: true, encoding: 'utf8' })) {
  const rel = r.replaceAll('\\', '/');
  if (!rel.endsWith('/metadata.json') || rel.startsWith('_plantilla/')) continue;
  const carpeta = rel.replace(/\/metadata\.json$/, '');
  const rutaMeta = join(RAIZ, rel);
  const crudo = JSON.parse(readFileSync(rutaMeta, 'utf8')) as Record<string, unknown> & { archivos: Record<string, unknown> };
  const v = validarMetadatosVideo(crudo, carpeta);
  if (!v.ok || v.valor.estado !== 'publicado' || !v.valor.archivos.video) continue;
  const original = join(RAIZ, carpeta, v.valor.archivos.video);
  if (!existsSync(original)) {
    console.warn(`[movil] ${carpeta}: falta ${v.valor.archivos.video}; se omite`);
    continue;
  }

  // 1 · Índice al inicio, sin recodificar
  if (!indiceAlInicio(original)) {
    const temporal = `${original}.faststart.mp4`;
    ffmpeg(['-i', original, '-c', 'copy', '-map', '0', '-movflags', '+faststart', temporal]);
    renameSync(temporal, original);
    movidos++;
    console.log(`[movil] ${carpeta}: índice movido al inicio`);
  }

  // 2 · Versión 720p para teléfonos (CRF con tope de tasa: animación nítida y liviana)
  const movil = join(RAIZ, carpeta, MOVIL);
  if (!existsSync(movil)) {
    const temporal = `${movil}.parcial.mp4`;
    try {
      ffmpeg([
        '-i', original,
        '-vf', 'scale=-2:720:flags=lanczos',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-maxrate', '1600k', '-bufsize', '3200k',
        '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        temporal,
      ]);
      renameSync(temporal, movil);
    } catch (e) {
      rmSync(temporal, { force: true });
      throw e;
    }
    generados++;
    console.log(`[movil] ${carpeta}: ${MOVIL} generado`);
  }

  // 3 · Registro en metadata.json (después de videoAlterno, conservando el orden de claves)
  if (crudo.archivos.videoMovil !== MOVIL) {
    const archivos: Record<string, unknown> = {};
    for (const [k, valor] of Object.entries(crudo.archivos)) {
      if (k === 'videoMovil') continue;
      archivos[k] = valor;
      if (k === 'videoAlterno') archivos.videoMovil = MOVIL;
    }
    archivos.videoMovil ??= MOVIL;
    writeFileSync(rutaMeta, JSON.stringify({ ...crudo, archivos }, null, 2) + '\n');
    registrados++;
  }
}
console.log(`[movil] listo · ${movidos} índices movidos · ${generados} versiones 720p · ${registrados} metadatos actualizados`);

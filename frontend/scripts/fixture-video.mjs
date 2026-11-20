// Genera un video de PRUEBA (no es contenido de AURA) para verificar el reproductor
// en /sistema y en las pruebas E2E. Requiere ffmpeg en el PATH. Solo desarrollo.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('tests/fixtures', { recursive: true });
const r = spawnSync(
  'ffmpeg',
  [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=8',
    '-f', 'lavfi', '-i', 'sine=frequency=330:duration=8',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '32', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '64k', '-shortest',
    'tests/fixtures/prueba.mp4',
  ],
  { stdio: 'inherit' },
);
if (r.status !== 0) {
  console.error('No se pudo generar el video de prueba (¿está ffmpeg instalado?).');
  process.exit(1);
}
console.log('tests/fixtures/prueba.mp4 generado.');

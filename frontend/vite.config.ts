import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const TIPOS: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Solo en desarrollo: sirve los medios desde sus carpetas de origen, con
 * peticiones por rangos (necesarias para buscar en el video) y sin salir de la raíz.
 * En producción los medios se copian a dist/media (scripts/publicar-medios.ts).
 */
function mediosEnDesarrollo(base: string): Plugin {
  const rutas: Array<[string, string]> = [
    [`${base}media/videos/`, resolve('../content/videos')],
    ['/__fixtures__/', resolve('tests/fixtures')],
  ];
  return {
    name: 'aura-medios-desarrollo',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let url: string;
        try {
          url = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
        } catch {
          return next();
        }
        const destino = rutas.find(([prefijo]) => url.startsWith(prefijo));
        if (!destino) return next();
        const [prefijo, raiz] = destino;
        const ruta = resolve(raiz, url.slice(prefijo.length));
        const tipo = TIPOS[extname(ruta).toLowerCase()];
        if (!ruta.startsWith(raiz + sep) || !tipo) {
          res.statusCode = 404;
          return res.end();
        }
        let tamano: number;
        try {
          const info = statSync(ruta);
          if (!info.isFile()) throw new Error('no es archivo');
          tamano = info.size;
        } catch {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader('Content-Type', tipo);
        res.setHeader('Accept-Ranges', 'bytes');
        const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
        if (!rango) {
          res.setHeader('Content-Length', tamano);
          return createReadStream(ruta).pipe(res);
        }
        const inicio = rango[1] ? Number(rango[1]) : Math.max(0, tamano - Number(rango[2]));
        const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), tamano - 1) : tamano - 1;
        if (inicio > fin || inicio >= tamano) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${tamano}`);
          return res.end();
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${inicio}-${fin}/${tamano}`);
        res.setHeader('Content-Length', fin - inicio + 1);
        createReadStream(ruta, { start: inicio, end: fin }).pipe(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['VITE_', 'AURA_']);
  const base = env.VITE_BASE_PATH || '/';
  if (!base.startsWith('/') && !/^https?:\/\//.test(base)) {
    throw new Error(`VITE_BASE_PATH debe empezar por "/" o ser una URL absoluta: "${base}"`);
  }
  const expose = env.AURA_DEV_EXPOSE === 'true';
  const baseFinal = base.endsWith('/') ? base : `${base}/`;

  return {
    base: baseFinal,
    plugins: [react(), mediosEnDesarrollo(baseFinal)],
    // content/ vive en la raíz del repositorio (compartido con el futuro backend)
    server: { host: expose, strictPort: false, fs: { allow: ['..'] } },
    preview: { host: expose },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      target: 'es2022',
      assetsInlineLimit: 4096,
    },
  };
});

import { createReadStream, readFileSync, statSync } from 'node:fs';
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

/**
 * Precarga las dos fuentes latinas que se usan en la primera pintura (títulos y texto).
 * Así el cambio desde la fuente de respaldo ocurre antes y se reduce el salto de diseño (CLS).
 */
function precargarFuentes(base: string): Plugin {
  const PATRONES = [/fraunces-latin-wght-normal-[\w-]+\.woff2$/, /atkinson-hyperlegible-next-latin-wght-normal-[\w-]+\.woff2$/];
  return {
    name: 'aura-precargar-fuentes',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const archivos = Object.keys(ctx.bundle ?? {}).filter((f) => PATRONES.some((p) => p.test(f)));
      return {
        html,
        tags: archivos.map((f) => ({
          tag: 'link',
          attrs: { rel: 'preload', href: `${base}${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
          injectTo: 'head' as const,
        })),
      };
    },
  };
}

/**
 * Cabeceras de seguridad: fuente única en servidor/cabeceras.json, compartida con el
 * servidor de producción (servidor/servidor.mjs). `vite preview` también las aplica.
 */
const cabeceras = JSON.parse(readFileSync(new URL('./servidor/cabeceras.json', import.meta.url), 'utf8')) as {
  csp: string[];
  otras: Record<string, string>;
};

export const CABECERAS_SEGURIDAD: Record<string, string> = {
  'Content-Security-Policy': cabeceras.csp.join('; '),
  ...cabeceras.otras,
};

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
    plugins: [react(), mediosEnDesarrollo(baseFinal), precargarFuentes(baseFinal)],
    // content/ vive en la raíz del repositorio (compartido con el futuro backend)
    server: {
      host: expose,
      strictPort: false,
      fs: { allow: ['..'] },
      // En desarrollo, el API (backend/) se alcanza por el mismo origen, igual que en producción.
      proxy: { [`${baseFinal}api`]: { target: env.AURA_API_URL || 'http://127.0.0.1:4054', rewrite: (r) => r.slice(baseFinal.length - 1) } },
    },
    preview: { host: expose, headers: CABECERAS_SEGURIDAD },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      target: 'es2022',
      assetsInlineLimit: 4096,
    },
  };
});

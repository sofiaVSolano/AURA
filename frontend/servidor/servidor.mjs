// Servidor de producción del frontend (sin dependencias). Uso: `npm run servir` tras `npm run build`.
// - Sirve dist/ con cabeceras de seguridad, caché adecuada, gzip y fallback SPA.
// - Admite peticiones por rangos (videos).
// - Reenvía <base>api/* al backend (mismo origen para el navegador: cookies sin CORS).
// Configuración: frontend/.env.servidor (no versionado) o variables de entorno.
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
try {
  process.loadEnvFile(join(RAIZ, '.env.servidor'));
} catch {
  /* opcional */
}

const PUERTO = Number(process.env.PUERTO ?? 4046);
const HOST = process.env.HOST ?? '127.0.0.1';
const DIST = resolve(RAIZ, process.env.DIST ?? 'dist');
const API = new URL(process.env.API_URL ?? 'http://127.0.0.1:4054');
const BASE = `/${(process.env.BASE_PATH ?? '/').replace(/^\/|\/$/g, '')}/`.replace('//', '/');
const HTTPS_PUBLICO = process.env.HTTPS_PUBLICO === 'true';

const cab = JSON.parse(readFileSync(join(RAIZ, 'servidor/cabeceras.json'), 'utf8'));
const SEGURIDAD = {
  'Content-Security-Policy': cab.csp.join('; '),
  ...cab.otras,
  ...(HTTPS_PUBLICO && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
};
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRIMIBLES = new Set(['.html', '.js', '.css', '.json', '.svg', '.vtt', '.md', '.txt']);

function responderError(res, estado, mensaje) {
  res.writeHead(estado, { ...SEGURIDAD, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(mensaje);
}

/** Reenvío al backend. X-Forwarded-For se reescribe con la IP real (no se confía en la del cliente). */
function reenviar(req, res, ruta) {
  const cabeceras = { ...req.headers, host: API.host, 'x-forwarded-for': req.socket.remoteAddress ?? '', 'x-forwarded-proto': HTTPS_PUBLICO ? 'https' : 'http' };
  const p = request({ hostname: API.hostname, port: API.port, path: ruta, method: req.method, headers: cabeceras, timeout: 15_000 }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  p.on('timeout', () => p.destroy(new Error('tiempo agotado')));
  p.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ codigo: 'sin_servidor', mensaje: 'El servidor de cuentas no está disponible.' }));
    } else res.destroy();
  });
  req.pipe(p);
}

function servirArchivo(req, res, archivo, info, esIndice) {
  const ext = extname(archivo).toLowerCase();
  const tipo = TIPOS[ext];
  if (!tipo) return responderError(res, 404, 'No encontrado');
  const cabeceras = {
    ...SEGURIDAD,
    'Content-Type': tipo,
    'Accept-Ranges': 'bytes',
    // Los recursos con hash no cambian nunca; index.html siempre se revalida.
    'Cache-Control': esIndice ? 'no-cache' : archivo.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  };
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (rango) {
    const inicio = rango[1] ? Number(rango[1]) : Math.max(0, info.size - Number(rango[2]));
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), info.size - 1) : info.size - 1;
    if (inicio > fin || inicio >= info.size) {
      res.writeHead(416, { ...cabeceras, 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }
    res.writeHead(206, { ...cabeceras, 'Content-Range': `bytes ${inicio}-${fin}/${info.size}`, 'Content-Length': fin - inicio + 1 });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(archivo, { start: inicio, end: fin }).pipe(res);
  }
  if (COMPRIMIBLES.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '') && info.size > 1024) {
    res.writeHead(200, { ...cabeceras, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(archivo).pipe(createGzip()).pipe(res);
  }
  res.writeHead(200, { ...cabeceras, 'Content-Length': info.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(archivo).pipe(res);
}

const servidor = createServer({ requestTimeout: 30_000 }, (req, res) => {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    return responderError(res, 400, 'Petición inválida');
  }
  if (ruta.startsWith(`${BASE}api/`) || ruta === `${BASE}api`) {
    const consulta = (req.url ?? '').includes('?') ? `?${(req.url ?? '').split('?')[1]}` : '';
    return reenviar(req, res, `/${ruta.slice(BASE.length)}${consulta}`);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return responderError(res, 405, 'Método no permitido');
  if (!ruta.startsWith(BASE)) return responderError(res, 404, 'No encontrado');

  const relativa = ruta.slice(BASE.length);
  const archivo = resolve(DIST, relativa);
  // Nunca fuera de dist/ (protección frente a ../)
  if (archivo !== DIST && !archivo.startsWith(DIST + sep)) return responderError(res, 404, 'No encontrado');
  try {
    const info = statSync(archivo);
    if (info.isFile()) return servirArchivo(req, res, archivo, info, archivo.endsWith(`${sep}index.html`));
  } catch {
    /* sigue al fallback */
  }
  // Fallback SPA: rutas de la aplicación (sin extensión) → index.html
  if (!extname(relativa)) {
    const indice = join(DIST, 'index.html');
    try {
      return servirArchivo(req, res, indice, statSync(indice), true);
    } catch {
      return responderError(res, 503, 'Falta compilar el frontend (npm run build).');
    }
  }
  responderError(res, 404, 'No encontrado');
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`[web] AURA en http://${HOST}:${PUERTO}${BASE} · API → ${API.origin}`);
});
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => servidor.close(() => process.exit(0)));

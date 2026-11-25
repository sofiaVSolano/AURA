// Punto de entrada del API: `npm start` (lee backend/.env si existe).
import { createServer } from 'node:http';
import { crearApp } from './app.ts';
import { leerConfig } from './config.ts';

const config = leerConfig();
if (config.produccion && !config.cookieSegura) {
  console.warn('[api] ADVERTENCIA: COOKIE_SEGURA=false. Las sesiones viajan sin HTTPS; configura HTTPS cuanto antes (docs/15).');
}
const app = crearApp(config);
// 120 s para recibir la petición completa: una tesis de hasta 8 MB (≈ 11 MB en base64) con conexión lenta
const servidor = createServer({ requestTimeout: 120_000, headersTimeout: 10_000 }, (req, res) => void app.manejar(req, res));
servidor.listen(config.puerto, config.host, () => {
  console.log(`[api] AURA escuchando en http://${config.host}:${config.puerto} · orígenes: ${config.origenesPermitidos.join(', ')}`);
});

const cerrar = () => {
  servidor.close(() => {
    app.cerrar();
    process.exit(0);
  });
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);

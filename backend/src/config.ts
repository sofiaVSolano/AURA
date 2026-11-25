// Configuración por variables de entorno (backend/.env, nunca versionado).
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const entero = (v: string | undefined, porDefecto: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
};

export interface Config {
  puerto: number;
  host: string;
  rutaBd: string;
  origenesPermitidos: string[];
  cookieSegura: boolean;
  confiarProxy: boolean;
  produccion: boolean;
  diasSesion: number;
  /** Cuentas nuevas por IP y hora (frena registros masivos). */
  limiteRegistro: number;
  /** Raíz del contenido compartido (content/). */
  rutaContenido: string;
  /** Clave del proveedor de IA (opcional). Sin ella, las evaluaciones con IA se desactivan. */
  claveIa: string | undefined;
}

export function leerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    puerto: entero(env.PUERTO, 4054),
    host: env.HOST ?? '127.0.0.1',
    rutaBd: env.RUTA_BD === ':memory:' ? ':memory:' : resolve(raiz, env.RUTA_BD ?? './datos/aura.db'),
    origenesPermitidos: (env.ORIGENES_PERMITIDOS ?? 'http://localhost:4046,http://localhost:5173')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    cookieSegura: env.COOKIE_SEGURA !== 'false',
    confiarProxy: env.CONFIAR_PROXY === 'true',
    produccion: env.NODE_ENV === 'production',
    diasSesion: entero(env.DIAS_SESION, 14),
    limiteRegistro: entero(env.LIMITE_REGISTRO, 5),
    rutaContenido: resolve(raiz, env.RUTA_CONTENIDO ?? '../content'),
    // Se acepta también «CLAUDE_API_KEY =» (con espacio antes del igual), como suele quedar al editar el .env a mano
    claveIa: (env.CLAUDE_API_KEY ?? env['CLAUDE_API_KEY '])?.trim() || undefined,
  };
}

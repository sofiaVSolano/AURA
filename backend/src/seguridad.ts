// Límites de peticiones, verificación de origen (CSRF) y CORS.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ErrorHttp } from './http.ts';

/** Limitador de ventana fija en memoria (suficiente para una sola instancia). */
export function crearLimitador(maximo: number, ventanaMs: number) {
  const cubetas = new Map<string, { cuenta: number; reinicio: number }>();
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [k, v] of cubetas) if (v.reinicio <= ahora) cubetas.delete(k);
  }, ventanaMs);
  limpieza.unref();
  return {
    /** Lanza 429 si la clave superó el máximo en la ventana. */
    consumir(clave: string) {
      const ahora = Date.now();
      const c = cubetas.get(clave);
      if (!c || c.reinicio <= ahora) {
        cubetas.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });
        return;
      }
      c.cuenta++;
      if (c.cuenta > maximo) {
        throw new ErrorHttp(429, 'demasiadas_peticiones', 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
      }
    },
    reiniciar(clave: string) {
      cubetas.delete(clave);
    },
  };
}

export function ipCliente(req: IncomingMessage, confiarProxy: boolean): string {
  const reenviada = confiarProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim() : '';
  return reenviada || req.socket.remoteAddress || 'desconocida';
}

const MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Defensa CSRF por origen: toda petición que modifica algo debe venir de un origen
 * permitido (cabecera Origin, o Referer si falta). Se combina con SameSite=Lax y,
 * con sesión, con el token CSRF en cabecera.
 */
export function verificarOrigen(req: IncomingMessage, permitidos: readonly string[]) {
  if (!MUTANTES.has(req.method ?? '')) return;
  const origen = req.headers.origin ?? (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
  if (!origen || !permitidos.includes(origen)) {
    throw new ErrorHttp(403, 'origen_no_permitido', 'Origen no permitido.');
  }
}

/** CORS solo para orígenes permitidos (con credenciales). Devuelve true si respondió a un preflight. */
export function aplicarCors(req: IncomingMessage, res: ServerResponse, permitidos: readonly string[]): boolean {
  const origen = req.headers.origin;
  if (origen && permitidos.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(origen && permitidos.includes(origen) ? 204 : 403, {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
      'Access-Control-Max-Age': '600',
    });
    res.end();
    return true;
  }
  return false;
}

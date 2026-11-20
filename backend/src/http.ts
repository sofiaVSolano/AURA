// Utilidades HTTP: lectura de JSON con límite, respuestas con cabeceras seguras, cookies y errores.
import type { IncomingMessage, ServerResponse } from 'node:http';

export class ErrorHttp extends Error {
  readonly estado: number;
  readonly codigo: string;
  constructor(estado: number, codigo: string, mensaje: string) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

/** Cabeceras de toda respuesta del API: nada se cachea, se interpreta ni se incrusta. */
export const CABECERAS_API: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export function responder(res: ServerResponse, estado: number, cuerpo?: unknown, extra: Record<string, string | string[]> = {}) {
  res.writeHead(estado, { ...CABECERAS_API, ...extra });
  res.end(cuerpo === undefined ? undefined : JSON.stringify(cuerpo));
}

export const LIMITE_CUERPO = 256 * 1024;

/** Lee un cuerpo JSON exigiendo Content-Type y un tamaño máximo (413 si se excede). */
export async function leerJson(req: IncomingMessage, limite = LIMITE_CUERPO): Promise<unknown> {
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
    throw new ErrorHttp(415, 'tipo_no_admitido', 'Se esperaba JSON.');
  }
  const declarado = Number(req.headers['content-length'] ?? 0);
  if (declarado > limite) throw new ErrorHttp(413, 'demasiado_grande', 'La petición es demasiado grande.');
  const partes: Buffer[] = [];
  let total = 0;
  for await (const trozo of req) {
    total += (trozo as Buffer).length;
    if (total > limite) throw new ErrorHttp(413, 'demasiado_grande', 'La petición es demasiado grande.');
    partes.push(trozo as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8'));
  } catch {
    throw new ErrorHttp(400, 'json_invalido', 'El cuerpo no es JSON válido.');
  }
}

export function leerCookies(req: IncomingMessage): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const par of (req.headers.cookie ?? '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0) salida[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  }
  return salida;
}

export function cookie(nombre: string, valor: string, opciones: { maxAge: number; segura: boolean }): string {
  return [
    `${nombre}=${encodeURIComponent(valor)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${opciones.maxAge}`,
    ...(opciones.segura ? ['Secure'] : []),
  ].join('; ');
}

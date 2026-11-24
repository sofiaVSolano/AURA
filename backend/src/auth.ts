// Contraseñas (scrypt) y sesiones (token aleatorio; en la base solo se guarda su hash).
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

const PARAMETROS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } satisfies ScryptOptions;
const LARGO = 64;

const derivar = (clave: string, sal: Buffer, o: ScryptOptions) =>
  new Promise<Buffer>((ok, mal) => scrypt(clave.normalize('NFKC'), sal, LARGO, o, (e, k) => (e ? mal(e) : ok(k))));

/** Formato: scrypt$N$r$p$sal$hash (base64url). */
export async function hashContrasena(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await derivar(clave, sal, PARAMETROS);
  return ['scrypt', PARAMETROS.N, PARAMETROS.r, PARAMETROS.p, sal.toString('base64url'), h.toString('base64url')].join('$');
}

export async function verificarContrasena(clave: string, guardado: string): Promise<boolean> {
  const [alg, n, r, p, sal, hash] = guardado.split('$');
  if (alg !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64url');
  const h = await derivar(clave, Buffer.from(sal, 'base64url'), { N: Number(n), r: Number(r), p: Number(p), maxmem: PARAMETROS.maxmem });
  return h.length === esperado.length && timingSafeEqual(h, esperado);
}

/** Hash de relleno: se verifica contra él cuando el correo no existe, para igualar tiempos. */
let relleno: Promise<string> | null = null;
export const hashRelleno = () => (relleno ??= hashContrasena(randomBytes(16).toString('hex')));

export const validarCorreo = (c: unknown): c is string =>
  typeof c === 'string' && c.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(c);

export function validarContrasena(c: unknown): string | null {
  if (typeof c !== 'string') return 'Escribe una contraseña.';
  if (c.length < 10) return 'Usa al menos 10 caracteres.';
  if (c.length > 128) return 'Usa como máximo 128 caracteres.';
  return null;
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export interface Sesion {
  /** Id interno (entero incremental) de la cuenta. */
  usuarioId: number;
  correo: string;
  csrf: string;
  tokenHash: string;
}

export function crearSesion(db: DatabaseSync, usuarioId: number, dias: number): { token: string; csrf: string } {
  const token = randomBytes(32).toString('base64url');
  const csrf = randomBytes(24).toString('base64url');
  const ahora = new Date();
  db.prepare('INSERT INTO sesiones (token_hash, usuario_id, csrf, creada, expira) VALUES (?, ?, ?, ?, ?)').run(
    hashToken(token),
    usuarioId,
    csrf,
    ahora.toISOString(),
    new Date(ahora.getTime() + dias * 86_400_000).toISOString(),
  );
  return { token, csrf };
}

export function buscarSesion(db: DatabaseSync, token: string | undefined): Sesion | null {
  if (!token || token.length > 100) return null;
  const fila = db
    .prepare(
      `SELECT s.token_hash, s.usuario_id, s.csrf, s.expira, u.correo FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as { token_hash: string; usuario_id: number; csrf: string; expira: string; correo: string } | undefined;
  if (!fila) return null;
  if (Date.parse(fila.expira) <= Date.now()) {
    db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(fila.token_hash);
    return null;
  }
  return { usuarioId: fila.usuario_id, correo: fila.correo, csrf: fila.csrf, tokenHash: fila.token_hash };
}

export const cerrarSesion = (db: DatabaseSync, tokenHash: string) => db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(tokenHash);
export const limpiarSesionesVencidas = (db: DatabaseSync) => db.prepare('DELETE FROM sesiones WHERE expira <= ?').run(new Date().toISOString());
/** Identificador público aleatorio (para los registros que viajan al navegador). */
export const nuevoId = () => randomUUID();

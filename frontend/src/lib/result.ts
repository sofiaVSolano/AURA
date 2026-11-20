/** Resultado explícito de una operación que puede fallar (validación, carga). */
export type Result<T> = { ok: true; valor: T } | { ok: false; errores: string[] };

export const exito = <T>(valor: T): Result<T> => ({ ok: true, valor });
export const fallo = <T = never>(errores: string[]): Result<T> => ({ ok: false, errores });

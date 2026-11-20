// Cliente del API de AURA (mismo origen: el servidor del frontend reenvía <base>api).
// Sin sesión, la app funciona igual que antes, con datos solo en el navegador.
import { VERSION_CONSENTIMIENTO } from './consentimiento.ts';

const BASE = `${import.meta.env.BASE_URL}api`;
/** Permite desactivar el API (p. ej. pruebas o despliegues solo estáticos). */
export const apiHabilitada = import.meta.env.VITE_API_HABILITADA !== 'false';

export class ErrorApi extends Error {
  readonly estado: number;
  readonly codigo: string;
  constructor(estado: number, codigo: string, mensaje: string) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

/** Estado de la sesión, resuelto una vez al arrancar (main.tsx). */
export const sesion: { activa: boolean; correo: string | null; servidorDisponible: boolean } = {
  activa: false,
  correo: null,
  servidorDisponible: false,
};
let csrf: string | null = null;

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(BASE + ruta, {
      method: metodo,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(csrf && metodo !== 'GET' && { 'X-CSRF-Token': csrf }),
      },
      body: cuerpo === undefined ? null : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ErrorApi(0, 'sin_conexion', 'No pudimos conectar con el servidor. Revisa tu conexión.');
  }
  const json = (r.headers.get('content-type') ?? '').includes('application/json');
  const datos = json ? ((await r.json().catch(() => null)) as Record<string, unknown> | null) : null;
  if (!r.ok) {
    throw new ErrorApi(r.status, String(datos?.codigo ?? 'error'), String(datos?.mensaje ?? 'No pudimos completar la acción.'));
  }
  if (r.status !== 204 && !json) throw new ErrorApi(502, 'respuesta_invalida', 'El servidor de cuentas no respondió como se esperaba.');
  return (datos ?? undefined) as T;
}

interface RespuestaSesion {
  usuario: { correo: string } | null;
  csrf?: string;
}
const aplicar = (r: RespuestaSesion) => {
  sesion.activa = Boolean(r.usuario);
  sesion.correo = r.usuario?.correo ?? null;
  csrf = r.csrf ?? null;
};

/** Al arrancar: ¿hay servidor y sesión? Si no responde, la app sigue en modo local. */
export async function comprobarSesion(): Promise<void> {
  if (!apiHabilitada) return;
  try {
    aplicar(await pedir<RespuestaSesion>('GET', '/auth/yo'));
    sesion.servidorDisponible = true;
  } catch {
    sesion.servidorDisponible = false;
  }
}

export type ModuloRemoto = 'mi-aura' | 'emocional' | 'academica';

export const api = {
  registro: async (correo: string, contrasena: string) =>
    aplicar(await pedir<RespuestaSesion>('POST', '/auth/registro', { correo, contrasena, consentimiento: true, versionConsentimiento: VERSION_CONSENTIMIENTO })),
  ingreso: async (correo: string, contrasena: string) => aplicar(await pedir<RespuestaSesion>('POST', '/auth/ingreso', { correo, contrasena })),
  salida: async () => {
    await pedir<void>('POST', '/auth/salida');
    aplicar({ usuario: null });
  },
  datos: () => pedir<Record<ModuloRemoto, unknown>>('GET', '/datos'),
  guardar: (modulo: ModuloRemoto, estado: unknown) => pedir<void>('PUT', `/datos/${modulo}`, { estado }),
  borrarModulo: (modulo: ModuloRemoto) => pedir<void>('DELETE', `/datos/${modulo}`),
  experiencia: (tipo: string, refId: string) =>
    pedir<{ registrada: boolean; experiencias: unknown[]; etapa: string }>('POST', '/experiencias', { tipo, refId }),
  exportar: () => pedir<unknown>('GET', '/cuenta/exportar'),
  borrarCuenta: (contrasena: string) => pedir<void>('DELETE', '/cuenta', { contrasena }),
};

// Almacén por módulo. Interfaz asíncrona única: sin sesión, IndexedDB (base "aura");
// con sesión, la cuenta en el servidor. La interfaz de usuario no distingue entre ambos.
import { api, sesion, tomarDatosIniciales } from './api.ts';

export interface Almacen<T> {
  /** true si los datos sobreviven al cerrar el navegador. */
  readonly persistente: boolean;
  cargar(): Promise<unknown | null>;
  guardar(valor: T): Promise<void>;
  borrar(): Promise<void>;
}

const BASE = 'aura';
const VERSION = 3;
/** Un almacén por módulo. Añadir uno nuevo exige subir VERSION. */
export const ALMACENES = ['mi-aura', 'emocional', 'academica'] as const;
export type NombreAlmacen = (typeof ALMACENES)[number];
const CLAVE = 'estado';

function promesa<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error ?? new Error('Error de IndexedDB'));
  });
}

let conexion: Promise<IDBDatabase> | null = null;
function abrir(): Promise<IDBDatabase> {
  conexion ??= new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BASE, VERSION);
    peticion.onupgradeneeded = () => {
      for (const nombre of ALMACENES) {
        if (!peticion.result.objectStoreNames.contains(nombre)) peticion.result.createObjectStore(nombre);
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error ?? new Error('No se pudo abrir IndexedDB'));
    peticion.onblocked = () => rechazar(new Error('IndexedDB bloqueada por otra pestaña'));
  });
  return conexion;
}

/** Solo en memoria: modo privado o navegador sin IndexedDB. Se pierde al recargar. */
export function almacenMemoria<T>(inicial: unknown = null): Almacen<T> {
  let dato: unknown = inicial;
  return {
    persistente: false,
    cargar: async () => dato,
    guardar: async (v) => {
      dato = structuredClone(v);
    },
    borrar: async () => {
      dato = null;
    },
  };
}

// — Almacén remoto (con sesión): mismos métodos, datos en la cuenta —
let datosRemotos: Promise<Record<string, unknown>> | null = null;

function almacenRemoto<T>(nombre: NombreAlmacen): Almacen<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  let pendiente: T | null = null;
  let esperando: Array<{ ok: () => void; mal: (e: unknown) => void }> = [];
  return {
    persistente: true,
    cargar: async () => {
      // Al arrancar, los datos ya vinieron con la sesión; después, se piden al servidor
      datosRemotos ??= Promise.resolve(tomarDatosIniciales() ?? api.datos());
      return (await datosRemotos)[nombre] ?? null;
    },
    // Agrupa cambios seguidos (p. ej. elegir varios colores) en una sola escritura.
    guardar: (valor) =>
      new Promise<void>((ok, mal) => {
        pendiente = valor;
        esperando.push({ ok, mal });
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
          const lote = esperando;
          esperando = [];
          api.guardar(nombre, pendiente).then(
            () => lote.forEach((p) => p.ok()),
            (e) => lote.forEach((p) => p.mal(e)),
          );
        }, 500);
      }),
    borrar: () => api.borrarModulo(nombre),
  };
}

/** Con sesión, en la cuenta; sin sesión, en este navegador. */
export async function crearAlmacen<T>(nombre: NombreAlmacen): Promise<Almacen<T>> {
  return sesion.activa ? almacenRemoto<T>(nombre) : crearAlmacenLocal<T>(nombre);
}

/** Siempre el del navegador (se usa para llevar los datos locales a la cuenta). */
export async function crearAlmacenLocal<T>(nombre: NombreAlmacen): Promise<Almacen<T>> {
  try {
    if (typeof indexedDB === 'undefined') return almacenMemoria<T>();
    const db = await abrir();
    const tienda = (modo: IDBTransactionMode) => db.transaction(nombre, modo).objectStore(nombre);
    return {
      persistente: true,
      cargar: async () => ((await promesa(tienda('readonly').get(CLAVE))) as unknown) ?? null,
      guardar: async (v) => {
        await promesa(tienda('readwrite').put(structuredClone(v), CLAVE));
      },
      borrar: async () => {
        await promesa(tienda('readwrite').delete(CLAVE));
      },
    };
  } catch {
    return almacenMemoria<T>();
  }
}

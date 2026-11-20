// Almacén local por módulo (IndexedDB, base "aura"). Interfaz asíncrona: cuando
// exista backend se reemplaza la implementación sin tocar la interfaz de usuario.

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

export async function crearAlmacen<T>(nombre: NombreAlmacen): Promise<Almacen<T>> {
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

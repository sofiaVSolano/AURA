import { useCallback, useEffect, useRef, useState } from 'react';
import { crearAlmacen, type Almacen, type NombreAlmacen } from './almacenLocal.ts';
import type { Result } from './result.ts';

export type CargaPersistente<T> =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; datos: T; persistente: boolean; avisoGuardado: string | null };

/**
 * Estado de un módulo guardado en el almacén local: carga validada, cambios
 * síncronos (encadenables en un mismo evento) y guardado con aviso si falla.
 */
export function useEstadoPersistente<T>(nombre: NombreAlmacen, inicial: T, validar: (d: unknown) => Result<T>) {
  const [carga, setCargaEstado] = useState<CargaPersistente<T>>({ estado: 'cargando' });
  const actual = useRef(carga);
  const almacen = useRef<Almacen<T> | null>(null);
  const setCarga = useCallback((c: CargaPersistente<T>) => {
    actual.current = c;
    setCargaEstado(c);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const a = await crearAlmacen<T>(nombre);
        almacen.current = a;
        const crudo = await a.cargar();
        if (!activo) return;
        if (crudo === null) return setCarga({ estado: 'listo', datos: inicial, persistente: a.persistente, avisoGuardado: null });
        const v = validar(crudo);
        setCarga(
          v.ok
            ? { estado: 'listo', datos: v.valor, persistente: a.persistente, avisoGuardado: null }
            : { estado: 'error', mensaje: v.errores.join(' ') },
        );
      } catch {
        if (activo) setCarga({ estado: 'error', mensaje: 'No pudimos leer los datos guardados en este navegador.' });
      }
    })();
    return () => {
      activo = false;
    };
    // inicial y validar son estables por contrato (constantes de módulo)
  }, [nombre, setCarga]);

  /** Aplica un cambio. Devuelve los nuevos datos si hubo cambio, o null. */
  const mutar = useCallback(
    (f: (d: T) => T): T | null => {
      const c = actual.current;
      if (c.estado !== 'listo') return null;
      const datos = f(c.datos);
      if (datos === c.datos) return null;
      setCarga({ ...c, datos });
      const aviso = (m: string | null) => {
        const x = actual.current;
        if (x.estado === 'listo' && x.avisoGuardado !== m) setCarga({ ...x, avisoGuardado: m });
      };
      almacen.current?.guardar(datos).then(
        () => aviso(null),
        () => aviso('No pudimos guardar el último cambio en este navegador.'),
      );
      return datos;
    },
    [setCarga],
  );

  const reiniciar = useCallback(async () => {
    await almacen.current?.borrar();
    setCarga({ estado: 'listo', datos: inicial, persistente: almacen.current?.persistente ?? false, avisoGuardado: null });
  }, [setCarga]);

  return { carga, mutar, reiniciar };
}

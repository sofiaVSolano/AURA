import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { crearRepositorio, type RepositorioAura } from '../datos/repositorio.ts';
import { calcularEvolucion, type Evolucion } from '../dominio/evolucion.ts';
import {
  ESTADO_INICIAL,
  TIPOS_EXPERIENCIA,
  type Dimension,
  type EstadoAura,
  type IdEtapa,
  type PreferenciasAvatar,
  type TipoExperiencia,
} from '../dominio/modelo.ts';
import { esExperienciaValida, validarEstadoAura } from '../dominio/validar.ts';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; datos: EstadoAura; persistente: boolean; avisoGuardado: string | null };

export interface AccionesMiAura {
  actualizarPreferencias: (cambios: Partial<PreferenciasAvatar>) => void;
  completarOnboarding: (preferencias: PreferenciasAvatar, momentoProyecto: string | null) => void;
  /**
   * Único punto de entrada del progreso. Hoy valida en el cliente; con backend,
   * se enviará al servidor, que decidirá si la experiencia cuenta (docs/11).
   * Devuelve false si ya existía (no suma de nuevo).
   */
  registrarExperiencia: (tipo: TipoExperiencia, refId: string, dimension?: Dimension) => boolean;
  marcarEtapaVista: (etapa: IdEtapa) => void;
  borrarTodo: () => Promise<void>;
  reiniciarDatosDanados: () => Promise<void>;
}

type ValorContexto = { carga: Carga; evolucion: Evolucion | null } & AccionesMiAura;

const Contexto = createContext<ValorContexto | null>(null);

function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function MiAuraProvider({ children }: { children: ReactNode }) {
  const [carga, setCargaEstado] = useState<Carga>({ estado: 'cargando' });
  const repo = useRef<RepositorioAura | null>(null);
  // Fuente síncrona del estado actual: permite encadenar cambios en el mismo
  // evento y guardar fuera de los updaters de React (que deben ser puros).
  const actual = useRef<Carga>(carga);
  const setCarga = useCallback((siguiente: Carga) => {
    actual.current = siguiente;
    setCargaEstado(siguiente);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const r = await crearRepositorio();
        repo.current = r;
        const crudo = await r.cargar();
        if (!activo) return;
        if (crudo === null) {
          setCarga({ estado: 'listo', datos: ESTADO_INICIAL, persistente: r.persistente, avisoGuardado: null });
          return;
        }
        const v = validarEstadoAura(crudo);
        if (!v.ok) {
          setCarga({ estado: 'error', mensaje: v.errores.join(' ') });
          return;
        }
        if (import.meta.env.DEV && v.valor.descartadas > 0) {
          console.warn(`[AURA] Se descartaron ${v.valor.descartadas} experiencias no válidas.`);
        }
        setCarga({ estado: 'listo', datos: v.valor.estado, persistente: r.persistente, avisoGuardado: null });
      } catch {
        if (activo) setCarga({ estado: 'error', mensaje: 'No pudimos leer los datos guardados en este navegador.' });
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  /** Aplica un cambio y lo guarda; si guardar falla, se avisa sin perder lo que ves. Devuelve si hubo cambio. */
  const mutar = useCallback(
    (f: (d: EstadoAura) => EstadoAura): boolean => {
      const c = actual.current;
      if (c.estado !== 'listo') return false;
      const datos = f(c.datos);
      if (datos === c.datos) return false;
      setCarga({ ...c, datos });
      const ajustarAviso = (aviso: string | null) => {
        const x = actual.current;
        if (x.estado === 'listo' && x.avisoGuardado !== aviso) setCarga({ ...x, avisoGuardado: aviso });
      };
      repo.current?.guardar(datos).then(
        () => ajustarAviso(null),
        () => ajustarAviso('No pudimos guardar el último cambio en este navegador.'),
      );
      return true;
    },
    [setCarga],
  );

  const acciones = useMemo<AccionesMiAura>(
    () => ({
      actualizarPreferencias: (cambios) => {
        mutar((d) => ({ ...d, preferencias: { ...d.preferencias, ...cambios } }));
      },
      completarOnboarding: (preferencias, momentoProyecto) => {
        mutar((d) => ({
          ...d,
          preferencias,
          onboarding: {
            completado: true,
            momentoProyecto,
            fechaInicio: d.onboarding.fechaInicio ?? new Date().toISOString(),
          },
        }));
      },
      registrarExperiencia: (tipo, refId, dimension) =>
        mutar((d) => {
          if (d.experiencias.some((e) => e.tipo === tipo && e.refId === refId)) return d;
          const nueva = {
            id: nuevoId(),
            tipo,
            dimension: TIPOS_EXPERIENCIA[tipo].dimension ?? dimension ?? 'emocional',
            refId,
            fecha: new Date().toISOString(),
          };
          return esExperienciaValida(nueva) ? { ...d, experiencias: [...d.experiencias, nueva] } : d;
        }),
      marcarEtapaVista: (etapa) => {
        mutar((d) => (d.ultimaEtapaVista === etapa ? d : { ...d, ultimaEtapaVista: etapa }));
      },
      borrarTodo: async () => {
        await repo.current?.borrar();
        const c = actual.current;
        if (c.estado === 'listo') setCarga({ ...c, datos: ESTADO_INICIAL, avisoGuardado: null });
      },
      reiniciarDatosDanados: async () => {
        await repo.current?.borrar();
        setCarga({ estado: 'listo', datos: ESTADO_INICIAL, persistente: repo.current?.persistente ?? false, avisoGuardado: null });
      },
    }),
    [mutar, setCarga],
  );

  const experiencias = carga.estado === 'listo' ? carga.datos.experiencias : null;
  const evolucion = useMemo(() => (experiencias ? calcularEvolucion(experiencias) : null), [experiencias]);

  const valor = useMemo<ValorContexto>(() => ({ carga, evolucion, ...acciones }), [carga, evolucion, acciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMiAura(): ValorContexto {
  const v = useContext(Contexto);
  if (!v) throw new Error('useMiAura debe usarse dentro de <MiAuraProvider>');
  return v;
}

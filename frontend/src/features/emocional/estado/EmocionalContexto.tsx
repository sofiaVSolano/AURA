import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Result } from '../../../lib/result.ts';
import { fallo } from '../../../lib/result.ts';
import { useEstadoPersistente, type CargaPersistente } from '../../../lib/useEstadoPersistente.ts';
import { useMiAura } from '../../mi-aura/estado/MiAuraContexto.tsx';
import {
  agregarAprendizaje,
  alternarGuardado,
  borrarAprendizaje,
  ESTADO_EMOCIONAL_INICIAL,
  registrarAvance,
  validarEstadoEmocional,
  type EstadoEmocional,
} from '../dominio/estadoEmocional.ts';

interface ValorEmocional {
  carga: CargaPersistente<EstadoEmocional>;
  alternarGuardado: (videoId: string) => void;
  /** Progreso visto; al completar un video publicado (≥ 90 %) suma a Mi AURA una sola vez. */
  registrarAvance: (videoId: string, fraccion: number) => void;
  /** Aprendizaje privado; el primero de cada video suma a Mi AURA como reflexión. */
  guardarAprendizaje: (videoId: string, texto: string) => Result<true>;
  borrarAprendizaje: (id: string) => void;
  borrarTodo: () => Promise<void>;
}

const Contexto = createContext<ValorEmocional | null>(null);

const nuevoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `apr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function EmocionalProvider({ children }: { children: ReactNode }) {
  const { carga, mutar, reiniciar } = useEstadoPersistente('emocional', ESTADO_EMOCIONAL_INICIAL, validarEstadoEmocional);
  const { registrarExperiencia } = useMiAura();

  const valor = useMemo<ValorEmocional>(
    () => ({
      carga,
      alternarGuardado: (id) => {
        mutar((e) => alternarGuardado(e, id));
      },
      registrarAvance: (id, fraccion) => {
        let completado = false;
        mutar((e) => {
          const r = registrarAvance(e, id, fraccion);
          completado = r.recienCompletado;
          return r.estado;
        });
        if (completado) registrarExperiencia('contenido-explorado', `video:${id}`, id.startsWith('academico.') ? 'academica' : 'emocional');
      },
      guardarAprendizaje: (videoId, texto) => {
        let resultado: Result<true> = fallo(['Tus datos aún se están cargando.']);
        mutar((e) => {
          const r = agregarAprendizaje(e, { id: nuevoId(), videoId, texto, fecha: new Date().toISOString() });
          resultado = r.ok ? { ok: true, valor: true } : r;
          return r.ok ? r.valor : e;
        });
        if (resultado.ok) registrarExperiencia('reflexion-registrada', `aprendizaje:${videoId}`);
        return resultado;
      },
      borrarAprendizaje: (id) => {
        mutar((e) => borrarAprendizaje(e, id));
      },
      borrarTodo: reiniciar,
    }),
    [carga, mutar, reiniciar, registrarExperiencia],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEmocional(): ValorEmocional {
  const v = useContext(Contexto);
  if (!v) throw new Error('useEmocional debe usarse dentro de <EmocionalProvider>');
  return v;
}

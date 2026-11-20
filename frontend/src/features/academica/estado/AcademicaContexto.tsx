import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { fallo, type Result } from '../../../lib/result.ts';
import { useEstadoPersistente, type CargaPersistente } from '../../../lib/useEstadoPersistente.ts';
import { useMiAura } from '../../mi-aura/estado/MiAuraContexto.tsx';
import {
  agregarAvance,
  borrarAvance,
  completarActividad,
  ESTADO_ACADEMICO_INICIAL,
  marcarTema,
  validarEstadoAcademico,
  type EstadoAcademico,
  type EstadoTema,
} from '../dominio/estadoAcademico.ts';

interface ValorAcademica {
  carga: CargaPersistente<EstadoAcademico>;
  marcarTema: (temaId: string, estado: EstadoTema | null) => void;
  /** Avance real del proyecto en un tema: suma a Mi AURA (una vez por tema). */
  guardarAvance: (temaId: string, texto: string) => Result<true>;
  borrarAvance: (id: string) => void;
  /** Al revisar una actividad por primera vez: suma a Mi AURA como ejercicio. */
  completarActividad: (laboratorio: string, actividad: string) => void;
  /** Una respuesta del simulador revisada: suma como práctica de sustentación (una vez por pregunta). */
  practicarSustentacion: (preguntaId: string) => void;
  borrarTodo: () => Promise<void>;
}

const Contexto = createContext<ValorAcademica | null>(null);
const nuevoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `av-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function AcademicaProvider({ children }: { children: ReactNode }) {
  const { carga, mutar, reiniciar } = useEstadoPersistente('academica', ESTADO_ACADEMICO_INICIAL, validarEstadoAcademico);
  const { registrarExperiencia } = useMiAura();

  const valor = useMemo<ValorAcademica>(
    () => ({
      carga,
      marcarTema: (id, estado) => {
        mutar((e) => marcarTema(e, id, estado));
      },
      guardarAvance: (temaId, texto) => {
        let r: Result<true> = fallo(['Tus datos aún se están cargando.']);
        mutar((e) => {
          const x = agregarAvance(e, { id: nuevoId(), temaId, texto, fecha: new Date().toISOString() });
          r = x.ok ? { ok: true, valor: true } : x;
          return x.ok ? x.valor : e;
        });
        if (r.ok) registrarExperiencia('avance-academico', `avance:${temaId}`);
        return r;
      },
      borrarAvance: (id) => {
        mutar((e) => borrarAvance(e, id));
      },
      completarActividad: (lab, act) => {
        let nueva = false;
        mutar((e) => {
          const x = completarActividad(e, `${lab}/${act}`, new Date().toISOString());
          nueva = x.nueva;
          return x.estado;
        });
        if (nueva) registrarExperiencia('ejercicio-completado', `lab:${lab}/${act}`);
      },
      practicarSustentacion: (preguntaId) => {
        registrarExperiencia('sustentacion-practicada', `sim:${preguntaId}`);
      },
      borrarTodo: reiniciar,
    }),
    [carga, mutar, reiniciar, registrarExperiencia],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAcademica(): ValorAcademica {
  const v = useContext(Contexto);
  if (!v) throw new Error('useAcademica debe usarse dentro de <AcademicaProvider>');
  return v;
}

import type { ReactNode } from 'react';
import { cx } from '../../../lib/cx.ts';
import { Icono, type NombreIcono } from '../Icono/Icono.tsx';
import estilos from './EstadoVista.module.css';

export type TipoEstado = 'cargando' | 'vacio' | 'error' | 'exito';

const icono: Record<Exclude<TipoEstado, 'cargando'>, NombreIcono> = {
  vacio: 'aura',
  error: 'alerta',
  exito: 'check',
};

interface EstadoVistaProps {
  tipo: TipoEstado;
  titulo: string;
  descripcion?: ReactNode;
  /** Acción de recuperación o siguiente paso. */
  accion?: ReactNode;
  compacto?: boolean;
}

/**
 * Estados de carga, vacío, error y éxito con un mismo lenguaje.
 * - cargando/éxito/vacío se anuncian con role="status" (cortés).
 * - error se anuncia con role="alert".
 */
export function EstadoVista({ tipo, titulo, descripcion, accion, compacto }: EstadoVistaProps) {
  return (
    <div
      className={cx(estilos.estado, estilos[tipo], compacto && estilos.compacto)}
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-busy={tipo === 'cargando' || undefined}
    >
      <span className={estilos.simbolo} aria-hidden="true">
        {tipo === 'cargando' ? <span className={estilos.pulso} /> : <Icono nombre={icono[tipo]} tamano={24} />}
      </span>
      <div className={estilos.texto}>
        <p className={estilos.titulo}>{titulo}</p>
        {descripcion && <div className={estilos.descripcion}>{descripcion}</div>}
      </div>
      {accion && <div className={estilos.accion}>{accion}</div>}
    </div>
  );
}

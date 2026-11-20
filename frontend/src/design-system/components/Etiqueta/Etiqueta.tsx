import type { ReactNode } from 'react';
import { cx } from '../../../lib/cx.ts';
import estilos from './Etiqueta.module.css';

export type TonoEtiqueta = 'neutro' | 'emocional' | 'academico' | 'aura' | 'pendiente' | 'exito';

export function Etiqueta({ tono = 'neutro', children }: { tono?: TonoEtiqueta; children: ReactNode }) {
  return <span className={cx(estilos.etiqueta, estilos[tono])}>{children}</span>;
}

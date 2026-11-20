import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx.ts';
import estilos from './Orbe.module.css';

/**
 * Forma orgánica que representa una categoría emocional (geometría, no ilustración).
 * Su contorno respira lentamente; con `transicion` viaja entre páginas (View Transitions).
 */
export function Orbe({ matiz, tamano = 120, transicion, className }: { matiz: number; tamano?: number; transicion?: string; className?: string | undefined }) {
  return (
    <span
      className={cx(estilos.orbe, className)}
      aria-hidden="true"
      style={{ '--matiz': matiz, width: tamano, height: tamano, viewTransitionName: transicion } as CSSProperties}
    >
      <span className={estilos.brillo} />
    </span>
  );
}

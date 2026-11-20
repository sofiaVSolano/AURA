import { cx } from '../../../lib/cx.ts';
import estilos from './Halo.module.css';

/**
 * Composición decorativa de formas orgánicas y un halo de luz: el motivo de AURA
 * ("un foco que acompaña, no que expone"). Es geometría, no ilustración: las
 * ilustraciones narrativas con personajes llegarán como piezas reales (D6).
 * Con `abrir`, el halo se revela una vez al montar (momento de autor de Inicio).
 */
export function Halo({ abrir, className }: { abrir?: boolean; className?: string }) {
  return (
    <div className={cx(estilos.halo, abrir && estilos.abrir, className)} aria-hidden="true">
      <svg viewBox="0 0 600 600" className={estilos.formas} preserveAspectRatio="xMidYMid meet">
        <path
          className={estilos.forma1}
          d="M468 156c52 61 69 152 33 226s-129 128-219 118-176-66-197-148 30-176 105-220 226-37 278 24Z"
        />
        <path
          className={estilos.forma2}
          d="M152 412c-38-48-41-121-3-170s116-74 182-58 118 64 120 124-50 117-118 137-143 15-181-33Z"
        />
      </svg>
      <div className={estilos.luz} />
    </div>
  );
}

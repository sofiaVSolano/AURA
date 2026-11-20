import { useEffect, type RefObject } from 'react';

const sinMovimiento = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Paralaje: escribe --px y --py (-1…1) en el elemento según la posición del
 * puntero sobre él. El CSS decide qué capas se desplazan y cuánto.
 * Sin efecto en táctil o con movimiento reducido. Limpia sus listeners.
 */
export function useParalaje(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || sinMovimiento()) return;
    let cuadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    };
    const salir = () => {
      cancelAnimationFrame(cuadro);
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    el.addEventListener('pointermove', mover, { passive: true });
    el.addEventListener('pointerleave', salir);
    return () => {
      cancelAnimationFrame(cuadro);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerleave', salir);
    };
  }, [ref]);
}

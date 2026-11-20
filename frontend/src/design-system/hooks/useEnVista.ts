import { useEffect, useState, type RefObject } from 'react';

/**
 * Indica si un elemento está visible en pantalla y la pestaña está activa.
 * Sirve para pausar animaciones en bucle (p. ej. la respiración del avatar)
 * cuando nadie las ve. Limpia sus observadores al desmontar.
 */
export function useEnVista(ref: RefObject<Element | null>, margen = '0px'): boolean {
  const [enVista, setEnVista] = useState(false);
  const [pestanaVisible, setPestanaVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setEnVista(true);
      return;
    }
    const observador = new IntersectionObserver(([entrada]) => setEnVista(entrada?.isIntersecting ?? false), {
      rootMargin: margen,
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref, margen]);

  useEffect(() => {
    const alCambiar = () => setPestanaVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, []);

  return enVista && pestanaVisible;
}

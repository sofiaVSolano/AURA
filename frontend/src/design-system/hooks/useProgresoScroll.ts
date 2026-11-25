import { useEffect, useRef, type RefObject } from 'react';

export interface LecturaScroll {
  /** Progreso 0…1 (0: el borde superior toca el de la ventana; 1: el inferior toca el de la ventana). */
  p: number;
  /** Posición suavizada del borde superior del elemento respecto a la ventana (px). */
  arriba: number;
  /** Velocidad suavizada (px por cuadro, valor absoluto). */
  velocidad: number;
}

const consulta = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const reducido = () => consulta?.matches ?? false;

interface Suscripcion {
  el: HTMLElement;
  rapidez: number;
  cb: { current: ((p: number, l: LecturaScroll) => void) | undefined };
  objetivo: number;
  alto: number;
  actual: number | null;
  anterior: number;
  velocidad: number;
}

/*
 * Un único bucle para todas las escenas: primero se LEEN todas las posiciones y
 * después se ESCRIBEN todos los estilos. Así el navegador calcula el diseño una
 * sola vez por cuadro (si cada escena leyera tras otra escribir, lo recalcularía
 * una vez por escena). Las funciones de cada escena no deben leer el diseño.
 */
const suscripciones = new Set<Suscripcion>();
let cuadro = 0;
let ultimo = 0;

function paso(ahora: number) {
  cuadro = 0;
  const dt = Math.min((ahora - (ultimo || ahora)) / 1000, 0.1);
  ultimo = ahora;
  for (const s of suscripciones) {
    const r = s.el.getBoundingClientRect();
    s.objetivo = r.top;
    s.alto = r.height;
  }
  const sinSuavizar = reducido();
  const alto = innerHeight;
  let seguir = false;
  for (const s of suscripciones) {
    if (s.actual === null || sinSuavizar) s.actual = s.objetivo;
    else {
      s.actual += (s.objetivo - s.actual) * (1 - Math.exp(-dt * s.rapidez));
      if (Math.abs(s.objetivo - s.actual) < 0.25) s.actual = s.objetivo;
    }
    const delta = Math.abs(s.actual - s.anterior);
    s.anterior = s.actual;
    s.velocidad += (delta - s.velocidad) * 0.3;
    const p = Math.min(1, Math.max(0, -s.actual / Math.max(1, s.alto - alto)));
    s.cb.current?.(p, { p, arriba: s.actual, velocidad: s.velocidad });
    // Sigue mientras no alcance su objetivo o quede inercia
    if (s.actual !== s.objetivo || s.velocidad > 0.05) seguir = true;
    else s.velocidad = 0;
  }
  if (seguir) pedir();
  else ultimo = 0;
}

function pedir() {
  if (!cuadro) cuadro = requestAnimationFrame(paso);
}

/**
 * Progreso de un elemento alto mientras atraviesa la ventana, **suavizado**:
 * la rueda del ratón avanza a saltos de ~100 px; aquí la posición se persigue con
 * una interpolación exponencial (independiente de los FPS), así todo lo que cuelga
 * del scroll se desliza en lugar de saltar. Con movimiento reducido no se suaviza.
 * (No escribe estilos en el elemento: una variable CSS en un contenedor grande obliga a
 * recalcular el estilo de todo su contenido en cada cuadro.)
 */
export function useProgresoScroll(
  ref: RefObject<HTMLElement | null>,
  alCambiar?: (p: number, lectura: LecturaScroll) => void,
  { rapidez = 9 }: { rapidez?: number } = {},
) {
  const cb = useRef(alCambiar);
  cb.current = alCambiar;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s: Suscripcion = { el, rapidez, cb, objetivo: 0, alto: 0, actual: null, anterior: 0, velocidad: 0 };
    if (suscripciones.size === 0) {
      addEventListener('scroll', pedir, { passive: true });
      addEventListener('resize', pedir);
    }
    suscripciones.add(s);
    pedir();
    return () => {
      suscripciones.delete(s);
      if (suscripciones.size === 0) {
        cancelAnimationFrame(cuadro);
        cuadro = 0;
        removeEventListener('scroll', pedir);
        removeEventListener('resize', pedir);
      }
    };
  }, [ref, rapidez]);
}

/**
 * Medidas de diseño en caché (se recalculan solo cuando cambia el tamaño).
 * Para usarlas dentro de useProgresoScroll sin forzar cálculos de diseño.
 */
export function useMedidas<T>(ref: RefObject<HTMLElement | null>, medir: (el: HTMLElement) => T) {
  const cache = useRef<T | null>(null);
  const fn = useRef(medir);
  fn.current = medir;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const invalidar = () => {
      cache.current = null;
    };
    const ro = new ResizeObserver(invalidar);
    ro.observe(el);
    addEventListener('resize', invalidar);
    return () => {
      ro.disconnect();
      removeEventListener('resize', invalidar);
    };
  }, [ref]);
  return () => {
    const el = ref.current;
    if (!el) return null;
    cache.current ??= fn.current(el);
    return cache.current;
  };
}

/** Interpola de forma lineal y limitada: tramo(p, a, b) = 0 antes de a, 1 después de b. */
export const tramo = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
/** Curva suave (easeInOutCubic) para tramos de scroll. */
export const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** ¿El usuario pidió movimiento reducido? */
export const movimientoReducido = reducido;

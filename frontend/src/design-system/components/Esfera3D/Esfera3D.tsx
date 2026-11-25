import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cx } from '../../../lib/cx.ts';
import { crearMotor, type EstadoEsfera } from './motor.ts';
import estilos from './Esfera3D.module.css';

export type { EstadoEsfera } from './motor.ts';

interface Props {
  /** Estado objetivo; el padre lo muta (p. ej. con el scroll) y la esfera lo alcanza suavemente. */
  estado: RefObject<EstadoEsfera>;
  className?: string | undefined;
  /** Fracción de la resolución nativa (0.5–1). Menos = más ligero. */
  resolucion?: number;
  /**
   * Hacia dónde mira (-1…1 en x e y). Si existe y no es null, manda sobre el puntero:
   * p. ej. para que mire el campo que se está escribiendo.
   */
  mirada?: RefObject<[number, number] | null> | undefined;
}

/**
 * Esfera 3D de AURA dibujada con WebGL nativo. Decorativa (aria-hidden).
 * - Se pausa fuera de pantalla y con la pestaña oculta.
 * - Con movimiento reducido: el tiempo se congela y solo se redibuja si cambia el estado.
 * - Sin WebGL: un degradado radial estático ocupa su lugar.
 */
export function Esfera3D({ estado, className, resolucion = 0.85, mirada }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [sinWebGL, setSinWebGL] = useState(false);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    // El shader se compila cuando el navegador queda libre: el texto de la página
    // se pinta primero (mejor LCP) y la esfera aparece después con un fundido.
    let limpiar: (() => void) | undefined;
    let cancelado = false;
    const arrancar = () => {
      if (!cancelado) limpiar = iniciar(canvas);
    };
    // Después del primer pintado (doble rAF) y, si se puede, en un momento libre.
    // Safari no tiene requestIdleCallback.
    const conReposo = typeof window.requestIdleCallback === 'function';
    let espera = 0;
    let marco = requestAnimationFrame(() => {
      marco = requestAnimationFrame(() => {
        espera = conReposo ? window.requestIdleCallback(arrancar, { timeout: 600 }) : window.setTimeout(arrancar, 60);
      });
    });
    return () => {
      cancelado = true;
      cancelAnimationFrame(marco);
      if (conReposo) window.cancelIdleCallback(espera);
      else clearTimeout(espera);
      limpiar?.();
    };
  }, [estado, resolucion]);

  function iniciar(canvas: HTMLCanvasElement): (() => void) | undefined {
    const motor = crearMotor(canvas, resolucion);
    if (!motor) {
      setSinWebGL(true);
      return;
    }
    const reducido = matchMedia('(prefers-reduced-motion: reduce)');
    const finoQuery = matchMedia('(hover: hover) and (pointer: fine)');
    const puntero: [number, number] = [0, 0];
    let visible = true;
    let cuadro = 0;
    let ultimo = performance.now();
    let firma = '';

    // Resolución dinámica: el raymarching cuesta por píxel. Si el equipo no llega a ~45 fps,
    // se dibuja a menos resolución (hasta la mitad); si sobra potencia de forma sostenida, se recupera.
    let calidad = 1;
    let suma = 0;
    let muestras = 0;
    let holgadas = 0;
    const medirFluidez = (intervalo: number) => {
      if (intervalo > 200) return; // pausa o pestaña en segundo plano: no es lentitud
      suma += intervalo;
      if (++muestras < 30) return;
      const promedio = suma / muestras;
      suma = 0;
      muestras = 0;
      if (promedio > 22 && calidad > 0.5) {
        calidad = Math.max(0.5, calidad * 0.8);
        motor.fijarCalidad(calidad);
        holgadas = 0;
      } else if (promedio < 18 && calidad < 1) {
        if (++holgadas >= 4) {
          calidad = Math.min(1, calidad * 1.15);
          motor.fijarCalidad(calidad);
          holgadas = 0;
        }
      } else holgadas = 0;
    };

    const bucle = (ahora: number) => {
      cuadro = 0;
      const intervalo = ahora - ultimo;
      const dt = Math.min(intervalo / 1000, 0.05);
      ultimo = ahora;
      if (!reducido.matches) medirFluidez(intervalo);
      if (reducido.matches) {
        const f = JSON.stringify(estado.current);
        if (f !== firma) {
          firma = f;
          motor.cuadro(estado.current, 0, [0, 0], false);
        }
      } else {
        motor.cuadro(estado.current, dt, mirada?.current ?? puntero, true);
      }
      canvas.dataset.listo = '';
      programar();
    };
    const programar = () => {
      if (!cuadro && visible && document.visibilityState === 'visible') cuadro = requestAnimationFrame(bucle);
    };
    const detener = () => {
      cancelAnimationFrame(cuadro);
      cuadro = 0;
    };

    const alMover = (e: PointerEvent) => {
      if (!finoQuery.matches) return;
      puntero[0] = (e.clientX / innerWidth) * 2 - 1;
      puntero[1] = (e.clientY / innerHeight) * 2 - 1;
    };
    const alVisibilidad = () => {
      ultimo = performance.now();
      if (document.visibilityState === 'visible') programar();
      else detener();
    };
    const observador = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      ultimo = performance.now();
      if (visible) programar();
      else detener();
    });
    observador.observe(canvas);
    const ajustar = new ResizeObserver(() => {
      motor.redimensionar();
      firma = '';
    });
    ajustar.observe(canvas);

    addEventListener('pointermove', alMover, { passive: true });
    document.addEventListener('visibilitychange', alVisibilidad);
    programar();

    return () => {
      detener();
      observador.disconnect();
      ajustar.disconnect();
      removeEventListener('pointermove', alMover);
      document.removeEventListener('visibilitychange', alVisibilidad);
      motor.destruir();
    };
  }

  if (sinWebGL) {
    const e = estado.current;
    return (
      <div
        aria-hidden="true"
        className={cx(estilos.respaldo, className)}
        style={{ '--matiz-a': e.matizA, '--matiz-b': e.matizB } as CSSProperties}
      />
    );
  }
  return <canvas ref={lienzo} aria-hidden="true" className={cx(estilos.lienzo, className)} />;
}

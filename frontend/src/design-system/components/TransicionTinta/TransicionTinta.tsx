import { useRef, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../../lib/cx.ts';
import { useProgresoScroll } from '../../hooks/useProgresoScroll.ts';
import estilos from './TransicionTinta.module.css';

type Ambito = 'inicio' | 'emocional' | 'academico' | 'mi-aura';

interface Props {
  /** Ámbito del mundo que se deja atrás (color de la capa inferior). */
  desde: Ambito;
  /** Ámbito del mundo que la tinta revela. */
  hacia: Ambito;
  /** Altura total de la sección en vh (más alto = la tinta se extiende más despacio). */
  alto?: number;
  /** Fracción del recorrido en la que la tinta termina de cubrir la pantalla. */
  cubreEn?: number;
  /** Recibe el progreso (0…1) en cada cuadro, para coreografiar el contenido. */
  alProgreso?: (p: number) => void;
  etiqueta?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Cambio de mundo con una mancha de tinta guiada por scroll: la escena queda
 * fija mientras la tinta (una máscara SVG) crece desde el centro y revela el
 * nuevo ámbito. El contenido está siempre en el DOM y es legible sin máscara.
 * Movimiento reducido: el nuevo ámbito aparece sin tinta.
 */
export function TransicionTinta({ desde, hacia, alto = 220, cubreEn = 0.55, alProgreso, etiqueta, className, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  useProgresoScroll(ref, (p, { arriba }) => {
    // La tinta empieza a crecer en cuanto la sección asoma por abajo (no después
    // de fijarse): así nunca se ve una pantalla vacía entre dos mundos.
    // (la altura se deduce de la prop `alto`, sin leer el diseño)
    const ventana = innerHeight;
    const recorrido = Math.max(1, (alto / 100 - 1) * ventana);
    const c = Math.min(1, Math.max(0, (ventana - arriba) / (ventana + cubreEn * recorrido)));
    const el = capa.current;
    if (el) {
      el.style.setProperty('--tinta', c.toFixed(4));
      el.dataset.cubierto = c >= 1 ? 'si' : 'no';
    }
    alProgreso?.(p);
  });

  return (
    <section
      ref={ref}
      aria-label={etiqueta}
      className={cx(estilos.tramo, 'sangrado', className)}
      style={{ '--alto': `${alto}vh` } as CSSProperties}
    >
      <div className={estilos.fijo}>
        <div data-ambito={desde} className={estilos.previo} aria-hidden="true" />
        <div ref={capa} data-ambito={hacia} data-cubierto="no" className={cx(estilos.revelado, 'textura-grano')}>
          {children}
        </div>
      </div>
    </section>
  );
}

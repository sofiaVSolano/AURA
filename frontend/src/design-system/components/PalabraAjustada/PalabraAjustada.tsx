import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../../lib/cx.ts';
import estilos from './PalabraAjustada.module.css';

interface Props {
  texto: string;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * Palabra gigante que ocupa exactamente el ancho de su contenedor, sin cortarse
 * nunca: se dibuja en SVG y el viewBox se ajusta a la caja real del texto
 * (también cuando termina de cargar la fuente). Decorativa (aria-hidden).
 */
export function PalabraAjustada({ texto, className, style }: Props) {
  const nodo = useRef<SVGTextElement>(null);
  const [caja, setCaja] = useState('0 0 100 30');

  useEffect(() => {
    const medir = () => {
      const t = nodo.current;
      if (!t) return;
      try {
        const b = t.getBBox();
        if (b.width > 0) setCaja(`${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.width.toFixed(2)} ${b.height.toFixed(2)}`);
      } catch {
        /* SVG aún no está en el árbol de render */
      }
    };
    medir();
    let vivo = true;
    document.fonts?.ready.then(() => vivo && medir());
    return () => {
      vivo = false;
    };
  }, [texto]);

  return (
    <svg className={cx(estilos.palabra, className)} style={style} viewBox={caja} aria-hidden="true" focusable="false">
      <text ref={nodo} x="0" y="0" className={estilos.texto}>
        {texto}
      </text>
    </svg>
  );
}

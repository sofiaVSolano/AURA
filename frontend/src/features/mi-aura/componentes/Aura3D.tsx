import { useEffect, useRef } from 'react';
import { Esfera3D, movimientoReducido, type EstadoEsfera } from '../../../design-system/index.ts';
import { indiceExpresion, indiceForma, matizDe, type PreferenciasAvatar } from '../dominio/modelo.ts';
import estilos from './Aura3D.module.css';

interface Props {
  preferencias: PreferenciasAvatar;
  etapa: number;
  /** Texto accesible del botón (tocar para saludar). */
  etiqueta: string;
  /** Comparte la transición de vista con el avatar de la cabecera. */
  compartido?: boolean;
}

/** Tu AURA en 3D, a tamaño grande. Al tocarla, salta y se agita de alegría. */
export function Aura3D({ preferencias: p, etapa, etiqueta, compartido }: Props) {
  const estado = useRef<EstadoEsfera>({
    x: 0,
    y: -0.02,
    escala: 0.82,
    etapa,
    matizA: matizDe(p.colorPrincipal),
    matizB: matizDe(p.colorComplementario),
    energia: 0.15,
    forma: indiceForma(p.forma),
    expresion: indiceExpresion(p.expresion),
  });
  useEffect(() => {
    Object.assign(estado.current, {
      etapa,
      matizA: matizDe(p.colorPrincipal),
      matizB: matizDe(p.colorComplementario),
      forma: indiceForma(p.forma),
      expresion: indiceExpresion(p.expresion),
    });
  }, [etapa, p.colorPrincipal, p.colorComplementario, p.forma, p.expresion]);

  const cuerpo = useRef<HTMLSpanElement>(null);
  const regreso = useRef(0);
  useEffect(() => () => clearTimeout(regreso.current), []);

  const saludar = () => {
    const e = estado.current;
    e.energia = 0.9;
    e.expresion = 2;
    clearTimeout(regreso.current);
    regreso.current = window.setTimeout(() => {
      estado.current.energia = 0.15;
      estado.current.expresion = indiceExpresion(p.expresion);
    }, 1300);
    if (movimientoReducido()) return;
    cuerpo.current?.animate(
      [
        { transform: 'translateY(0) scale(1, 1)' },
        { transform: 'translateY(6px) scale(1.06, 0.94)', offset: 0.15 },
        { transform: 'translateY(-34px) scale(0.96, 1.05)', offset: 0.45 },
        { transform: 'translateY(3px) scale(1.05, 0.95)', offset: 0.8 },
        { transform: 'translateY(0) scale(1, 1)' },
      ],
      { duration: 820, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
    );
  };

  return (
    <button
      type="button"
      className={estilos.aura}
      aria-label={etiqueta}
      data-etapa={etapa}
      onClick={saludar}
      style={compartido ? { viewTransitionName: 'esfera-aura' } : undefined}
    >
      <span ref={cuerpo} className={estilos.cuerpo}>
        <Esfera3D estado={estado} resolucion={1} />
      </span>
      <span className={estilos.suelo} aria-hidden="true" />
    </button>
  );
}

import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../../lib/cx.ts';
import estilos from './Tarjeta.module.css';

interface TarjetaProps extends HTMLAttributes<HTMLElement> {
  /** article para contenido autónomo; div o li según el contexto. */
  como?: 'article' | 'div' | 'li';
  /** Toda la tarjeta responde al puntero; requiere un <TarjetaEnlace> dentro. */
  interactiva?: boolean;
  children: ReactNode;
}

export function Tarjeta({ como: Etiqueta = 'article', interactiva, className, children, ...resto }: TarjetaProps) {
  return (
    <Etiqueta {...resto} className={cx(estilos.tarjeta, interactiva && estilos.interactiva, className)}>
      {children}
    </Etiqueta>
  );
}

/**
 * Enlace principal de una tarjeta. Su área se extiende a toda la tarjeta
 * (patrón "enlace estirado"), manteniendo un solo destino de foco.
 */
export function TarjetaEnlace({ a, children }: { a: string; children: ReactNode }) {
  return (
    <Link to={a} viewTransition className={estilos.enlace}>
      {children}
    </Link>
  );
}

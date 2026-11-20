import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../../lib/cx.ts';
import { Icono, type NombreIcono } from '../Icono/Icono.tsx';
import estilos from './Boton.module.css';

type Variante = 'primario' | 'secundario' | 'sutil';
type Tamano = 'sm' | 'md' | 'lg';

interface Apariencia {
  variante?: Variante;
  tamano?: Tamano;
  iconoInicio?: NombreIcono;
  iconoFin?: NombreIcono;
}

function Contenido({ iconoInicio, iconoFin, children }: Apariencia & { children: ReactNode }) {
  return (
    <>
      {iconoInicio && <Icono nombre={iconoInicio} className={estilos.icono} />}
      <span className={estilos.etiqueta}>{children}</span>
      {iconoFin && <Icono nombre={iconoFin} className={estilos.iconoFin} />}
    </>
  );
}

interface BotonProps extends Apariencia, ButtonHTMLAttributes<HTMLButtonElement> {
  /** Muestra actividad y bloquea nuevos envíos sin cambiar el ancho del botón. */
  cargando?: boolean;
}

export function Boton({
  variante = 'primario',
  tamano = 'md',
  iconoInicio,
  iconoFin,
  cargando = false,
  className,
  children,
  type = 'button',
  onClick,
  ...resto
}: BotonProps) {
  return (
    <button
      {...resto}
      type={type}
      className={cx(estilos.boton, estilos[variante], estilos[tamano], className)}
      aria-busy={cargando || undefined}
      aria-disabled={cargando || resto.disabled || undefined}
      data-cargando={cargando || undefined}
      onClick={(e) => {
        if (cargando) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {cargando && <span className={estilos.indicador} aria-hidden="true" />}
      <Contenido {...(iconoInicio && { iconoInicio })} {...(iconoFin && { iconoFin })}>
        {children}
      </Contenido>
    </button>
  );
}

type BotonEnlaceProps = Apariencia & LinkProps;

/** Enlace con apariencia de botón (navegación, no acción). Usa transición de vista. */
export function BotonEnlace({
  variante = 'primario',
  tamano = 'md',
  iconoInicio,
  iconoFin,
  className,
  children,
  ...resto
}: BotonEnlaceProps) {
  return (
    <Link
      viewTransition
      {...resto}
      className={cx(estilos.boton, estilos[variante], estilos[tamano], className as string | undefined)}
    >
      <Contenido {...(iconoInicio && { iconoInicio })} {...(iconoFin && { iconoFin })}>
        {children as ReactNode}
      </Contenido>
    </Link>
  );
}

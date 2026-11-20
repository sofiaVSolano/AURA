import type { ReactNode } from 'react';
import { Icono } from '../../../design-system/index.ts';
import { cx } from '../../../lib/cx.ts';
import { COLORES, type IdColor } from '../dominio/modelo.ts';
import estilos from './Selectores.module.css';

interface SelectorColorProps {
  leyenda: string;
  nombre: string;
  valor: IdColor;
  onCambio: (id: IdColor) => void;
}

/** Paleta controlada: radios nativos (flechas para moverse) con muestras de color. */
export function SelectorColor({ leyenda, nombre, valor, onCambio }: SelectorColorProps) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.leyenda}>{leyenda}</legend>
      <div className={estilos.colores}>
        {COLORES.map((c) => (
          <label key={c.id} className={estilos.color}>
            <input
              type="radio"
              name={nombre}
              value={c.id}
              checked={valor === c.id}
              onChange={() => onCambio(c.id)}
              className="visualmente-oculto"
            />
            <span
              className={estilos.muestra}
              style={{ background: `radial-gradient(circle at 35% 30%, hsl(${c.matiz - 15} 95% 85%), hsl(${c.matiz} 72% 60%) 60%, hsl(${c.matiz + 12} 60% 42%))` }}
              aria-hidden="true"
            >
              <Icono nombre="check" tamano={16} className={estilos.marca} />
            </span>
            <span className={estilos.nombre}>{c.nombre}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface OpcionVisual<T extends string> {
  id: T;
  nombre: string;
  vista: ReactNode;
  /** Si está bloqueada: cómo se obtiene. */
  bloqueo?: string;
}

interface SelectorVisualProps<T extends string> {
  leyenda: string;
  nombre: string;
  opciones: readonly OpcionVisual<T>[];
  valor: T;
  onCambio: (id: T) => void;
  nota?: string | undefined;
}

export function SelectorVisual<T extends string>({ leyenda, nombre, opciones, valor, onCambio, nota }: SelectorVisualProps<T>) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.leyenda}>{leyenda}</legend>
      {nota && <p className={estilos.nota}>{nota}</p>}
      <div className={estilos.visuales}>
        {opciones.map((o) => (
          <label key={o.id} className={estilos.visual}>
            <input
              type="radio"
              name={nombre}
              value={o.id}
              checked={valor === o.id}
              onChange={() => onCambio(o.id)}
              className="visualmente-oculto"
            />
            <span className={estilos.vista} aria-hidden="true">
              {o.vista}
            </span>
            <span className={estilos.nombre}>{o.nombre}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface SelectorMultipleProps<T extends string> {
  leyenda: string;
  opciones: readonly OpcionVisual<T>[];
  valores: readonly T[];
  onCambio: (valores: T[]) => void;
  nota?: string | undefined;
}

/** Elementos desbloqueables: los bloqueados explican cómo se obtienen. */
export function SelectorMultiple<T extends string>({ leyenda, opciones, valores, onCambio, nota }: SelectorMultipleProps<T>) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.leyenda}>{leyenda}</legend>
      {nota && <p className={estilos.nota}>{nota}</p>}
      <div className={estilos.visuales}>
        {opciones.map((o) => {
          const activo = valores.includes(o.id);
          return (
            <label key={o.id} className={cx(estilos.visual, o.bloqueo && estilos.bloqueado)}>
              <input
                type="checkbox"
                checked={activo && !o.bloqueo}
                disabled={Boolean(o.bloqueo)}
                onChange={() => onCambio(activo ? valores.filter((v) => v !== o.id) : [...valores, o.id])}
                className="visualmente-oculto"
                aria-describedby={o.bloqueo ? `bloqueo-${o.id}` : undefined}
              />
              <span className={estilos.vista} aria-hidden="true">
                {o.vista}
              </span>
              <span className={estilos.nombre}>{o.nombre}</span>
              {o.bloqueo && (
                <span id={`bloqueo-${o.id}`} className={estilos.bloqueo}>
                  {o.bloqueo}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

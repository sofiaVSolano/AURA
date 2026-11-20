import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../../lib/cx.ts';
import { Icono } from '../Icono/Icono.tsx';
import estilos from './Campo.module.css';

interface BaseCampo {
  etiqueta: string;
  /** Texto de ayuda permanente (formato esperado, privacidad, etc.). */
  ayuda?: string;
  /** Mensaje de error: nombra el problema y cómo resolverlo. */
  error?: string | undefined;
  opcional?: boolean;
}

interface IdsCampo {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

function Marco({
  etiqueta,
  ayuda,
  error,
  opcional,
  extra,
  children,
}: BaseCampo & { extra?: ReactNode; children: (ids: IdsCampo) => ReactNode }) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ');
  return (
    <div className={cx(estilos.campo, error && estilos.conError)}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
        {opcional && <span className={estilos.opcional}> (opcional)</span>}
      </label>
      {ayuda && (
        <p id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
      {children({ id, ...(describe && { 'aria-describedby': describe }), ...(error && { 'aria-invalid': true }) })}
      <div className={estilos.pie}>
        {error && (
          <p id={idError} className={estilos.error}>
            <Icono nombre="alerta" tamano={16} />
            {error}
          </p>
        )}
        {extra}
      </div>
    </div>
  );
}

type CampoTextoProps = BaseCampo & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export function CampoTexto({ etiqueta, ayuda, error, opcional, className, ...resto }: CampoTextoProps) {
  return (
    <Marco etiqueta={etiqueta} {...(ayuda && { ayuda })} error={error} {...(opcional && { opcional })}>
      {(ids) => (
        <input {...resto} {...ids} required={!opcional} className={cx(estilos.control, className)} />
      )}
    </Marco>
  );
}

type AreaTextoProps = BaseCampo & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

export function AreaTexto({ etiqueta, ayuda, error, opcional, className, maxLength, value, ...resto }: AreaTextoProps) {
  const longitud = typeof value === 'string' ? value.length : 0;
  const contador =
    maxLength !== undefined ? (
      <span className={estilos.contador} aria-live={longitud > maxLength * 0.9 ? 'polite' : 'off'}>
        {longitud}/{maxLength}
      </span>
    ) : undefined;
  return (
    <Marco
      etiqueta={etiqueta}
      {...(ayuda && { ayuda })}
      error={error}
      {...(opcional && { opcional })}
      extra={contador}
    >
      {(ids) => (
        <textarea
          {...resto}
          {...ids}
          {...(maxLength !== undefined && { maxLength })}
          {...(value !== undefined && { value })}
          required={!opcional}
          className={cx(estilos.control, estilos.area, className)}
        />
      )}
    </Marco>
  );
}

interface Opcion {
  valor: string;
  etiqueta: string;
  descripcion?: string;
}

interface GrupoOpcionesProps {
  leyenda: string;
  nombre: string;
  opciones: Opcion[];
  valor: string | null;
  onCambio: (valor: string) => void;
  error?: string | undefined;
}

/** Elección única accesible (fieldset + radios nativos; navegable con flechas). */
export function GrupoOpciones({ leyenda, nombre, opciones, valor, onCambio, error }: GrupoOpcionesProps) {
  const id = useId();
  return (
    <fieldset
      className={cx(estilos.grupo, error && estilos.conError)}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className={estilos.etiqueta}>{leyenda}</legend>
      <div className={estilos.opciones}>
        {opciones.map((o) => (
          <label key={o.valor} className={estilos.opcion}>
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => onCambio(o.valor)}
              className={estilos.radio}
            />
            <span>
              <span className={estilos.opcionTitulo}>{o.etiqueta}</span>
              {o.descripcion && <span className={estilos.ayuda}>{o.descripcion}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className={estilos.error}>
          <Icono nombre="alerta" tamano={16} />
          {error}
        </p>
      )}
    </fieldset>
  );
}

import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Icono } from '../../../design-system/index.ts';
import { cx } from '../../../lib/cx.ts';
import type { EstadoTema } from '../dominio/estadoAcademico.ts';
import estilos from './MarcaTema.module.css';

const OPCIONES: Array<{ valor: EstadoTema | null; etiqueta: string; ayuda: string }> = [
  { valor: null, etiqueta: 'Sin marcar', ayuda: 'Aún no lo empiezo' },
  { valor: 'en-curso', etiqueta: 'Lo estoy trabajando', ayuda: 'Voy a mitad de camino' },
  { valor: 'explorado', etiqueta: 'Ya lo exploré', ayuda: 'Lo leí y lo entendí' },
];

const CONFIRMACION: Record<EstadoTema, string> = {
  'en-curso': 'Guardado en tu ruta como «Lo estoy trabajando».',
  explorado: 'Guardado en tu ruta como «Ya lo exploré».',
};

interface Props {
  marca: EstadoTema | null;
  onMarcar: (valor: EstadoTema | null) => void;
  deshabilitado: boolean;
  /** `cabecera`: al inicio de la guía. `cierre`: al terminar de leer, más visible. */
  variante: 'cabecera' | 'cierre';
}

/** Marca cómo vas con un tema. Deja claro que marcar guarda el progreso y dónde se ve. */
export function MarcaTema({ marca, onMarcar, deshabilitado, variante }: Props) {
  const id = useId();
  const [cambio, setCambio] = useState(false);
  const marcar = (v: EstadoTema | null) => {
    onMarcar(v);
    setCambio(true);
  };
  const cierre = variante === 'cierre';

  return (
    <section className={cx(estilos.marca, cierre && estilos.cierre, marca === null && estilos.pendiente)} aria-labelledby={`${id}-t`}>
      <div className={estilos.texto}>
        <h2 id={`${id}-t`} className={estilos.titulo}>
          {cierre ? '¿Terminaste? Marca cómo vas con este tema' : '¿Cómo vas con este tema?'}
        </h2>
        <p className={estilos.ayuda}>
          {marca === null
            ? 'Si no lo marcas, tu avance no queda guardado en la ruta.'
            : 'Puedes cambiarlo cuando quieras.'}
        </p>
      </div>
      <fieldset className={estilos.opciones}>
        <legend className="visualmente-oculto">¿Cómo vas con este tema?</legend>
        {OPCIONES.map((o) => (
          <label key={o.etiqueta} className={estilos.opcion}>
            <input
              type="radio"
              name={`estado-tema-${id}`}
              checked={marca === o.valor}
              onChange={() => marcar(o.valor)}
              disabled={deshabilitado}
            />
            <span className={cx(estilos.icono, o.valor && estilos[o.valor === 'explorado' ? 'iconoHecho' : 'iconoCurso'])} aria-hidden="true">
              {o.valor === 'explorado' ? <Icono nombre="check" tamano={16} /> : null}
            </span>
            <span className={estilos.etiqueta}>
              {o.etiqueta}
              {cierre && <small>{o.ayuda}</small>}
            </span>
          </label>
        ))}
      </fieldset>
      <p className={estilos.estado} role="status">
        {cambio && marca ? (
          <>
            <Icono nombre="check" tamano={16} /> {CONFIRMACION[marca]}{' '}
            <Link to="/academica" viewTransition>
              Ver mi ruta
            </Link>
          </>
        ) : cambio ? (
          'Quitaste la marca de este tema.'
        ) : null}
      </p>
    </section>
  );
}

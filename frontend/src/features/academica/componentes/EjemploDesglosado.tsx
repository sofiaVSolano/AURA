import { useId, useState, type CSSProperties } from 'react';
import { cx } from '../../../lib/cx.ts';
import type { Guia } from '../dominio/modelo.ts';
import estilos from './Guia.module.css';

/**
 * Ejemplo explicado: el texto completo con cada fragmento seleccionable.
 * Al elegir uno, se explica qué función cumple. También se puede ver todo desglosado.
 */
export function EjemploDesglosado({ ejemplo }: { ejemplo: Guia['ejemplo'] }) {
  const [activo, setActivo] = useState(0);
  const [desglosado, setDesglosado] = useState(false);
  const id = useId();
  const f = ejemplo.fragmentos[activo];

  return (
    <div className={estilos.ejemplo}>
      <div className={estilos.ejemploCabecera}>
        <p className={estilos.nota}>{ejemplo.contexto}</p>
        <button type="button" className={estilos.alternar} aria-pressed={desglosado} onClick={() => setDesglosado((d) => !d)}>
          {desglosado ? 'Ver como texto continuo' : 'Ver todo desglosado'}
        </button>
      </div>

      {desglosado ? (
        <ol className={estilos.desglose}>
          {ejemplo.fragmentos.map((x, i) => (
            <li key={i} style={{ '--tono': i } as CSSProperties}>
              <span className={estilos.elemento}>{x.elemento}</span>
              <p>{x.texto}</p>
              <p className={estilos.explicacion}>{x.explicacion}</p>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p className={estilos.textoEjemplo}>
            {/* Fragmentos en línea (no <button>, que rompe el flujo del párrafo), operables con teclado */}
            {ejemplo.fragmentos.map((x, i) => (
              <span
                key={i}
                role="button"
                tabIndex={0}
                className={cx(estilos.fragmento, i === activo && estilos.fragmentoActivo)}
                style={{ '--tono': i } as CSSProperties}
                aria-pressed={i === activo}
                aria-controls={`${id}-explicacion`}
                aria-label={`${x.elemento}: ${x.texto}`}
                onClick={() => setActivo(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActivo(i);
                  }
                }}
              >
                {x.texto}
              </span>
            ))}
          </p>
          {f && (
            <div id={`${id}-explicacion`} className={estilos.panelExplicacion} style={{ '--tono': activo } as CSSProperties} aria-live="polite" key={activo}>
              <span className={estilos.elemento}>{f.elemento}</span>
              <p>{f.explicacion}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

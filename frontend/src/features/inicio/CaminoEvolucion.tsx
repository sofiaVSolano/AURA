import { useEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx.ts';
import { Personaje } from '../mi-aura/avatar/Personaje.tsx';
import { ETAPAS, type PreferenciasAvatar } from '../mi-aura/dominio/modelo.ts';
import estilos from './CaminoEvolucion.module.css';

/**
 * Narrativa guiada por scroll: el personaje queda fijo mientras los textos
 * pasan; cada etapa que entra al centro de la pantalla lo transforma.
 * Funciona con teclado y lector de pantalla (es una lista ordenada normal).
 */
export function CaminoEvolucion({ preferencias }: { preferencias: PreferenciasAvatar }) {
  const [activo, setActivo] = useState(0);
  const pasos = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setActivo(Number((e.target as HTMLElement).dataset.indice));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    pasos.current.forEach((el) => el && observador.observe(el));
    return () => observador.disconnect();
  }, []);

  return (
    <section className={`${estilos.camino} sangrado`} aria-labelledby="titulo-camino">
      <h2 id="titulo-camino" className={estilos.titulo}>
        Un AURA que crece contigo
      </h2>
      <div className={estilos.contenido}>
        <div className={estilos.escenario} aria-hidden="true">
          <div className={estilos.luz} />
          <Personaje preferencias={preferencias} etapa={activo} decoraciones={activo === 4 ? ['aurora', 'estrellas'] : []} tamano={260} />
          <ol className={estilos.medidor}>
            {ETAPAS.map((e, k) => (
              <li key={e.id} data-activo={k <= activo || undefined} />
            ))}
          </ol>
        </div>
        <ol className={estilos.pasos}>
          {ETAPAS.map((e, k) => (
            <li
              key={e.id}
              ref={(el) => {
                pasos.current[k] = el;
              }}
              data-indice={k}
              className={cx(estilos.paso, k === activo && estilos.activo)}
            >
              <span className={estilos.numero}>Etapa {k + 1}</span>
              <h3 className={estilos.nombre}>{e.nombre}</h3>
              <p className={estilos.descripcion}>{e.descripcion}</p>
              <p className={estilos.como}>{e.comoSeObtiene}</p>
            </li>
          ))}
        </ol>
      </div>
      <p className={estilos.cierre}>
        Las pausas y las emociones difíciles <strong>nunca restan</strong>. Solo suman las experiencias que tienen
        sentido para ti.
      </p>
    </section>
  );
}

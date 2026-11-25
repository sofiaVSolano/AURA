import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { cx } from '../../../lib/cx.ts';
import type { Guia } from '../dominio/modelo.ts';
import estilos from './Guia.module.css';

type Fragmento = Guia['ejemplo']['fragmentos'][number];

/**
 * Agrupa las piezas que comparten nombre con número («Específico 1», «Específico 2»…)
 * bajo un mismo título; las demás quedan solas.
 */
function agrupar(fragmentos: Fragmento[]) {
  const grupos: Array<{ titulo: string | null; piezas: Array<{ f: Fragmento; i: number }> }> = [];
  fragmentos.forEach((f, i) => {
    const base = /^(.*?)\s+\d+$/.exec(f.elemento)?.[1] ?? null;
    const ultimo = grupos.at(-1);
    if (base && ultimo?.titulo === base) ultimo.piezas.push({ f, i });
    else grupos.push({ titulo: base, piezas: [{ f, i }] });
  });
  return grupos;
}

const plural = (t: string) => (/[aeiouáéíóú]$/i.test(t) ? `${t}s` : `${t}es`);

/**
 * Ejemplo explicado como un manuscrito anotado: cada pieza del texto en su propio
 * bloque (agrupadas cuando son del mismo tipo) y, al margen, la nota que explica la
 * pieza elegida. También se puede leer como texto continuo.
 */
export function EjemploDesglosado({ ejemplo }: { ejemplo: Guia['ejemplo'] }) {
  const [activo, setActivo] = useState(0);
  const [continuo, setContinuo] = useState(false);
  const id = useId();
  const f = ejemplo.fragmentos[activo];
  const total = ejemplo.fragmentos.length;

  const pulsar = (i: number) => ({
    role: 'button',
    tabIndex: 0,
    'aria-pressed': i === activo,
    'aria-controls': `${id}-explicacion`,
    onClick: () => setActivo(i),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActivo(i);
      }
    },
  });

  return (
    <div className={estilos.ejemplo}>
      <div className={estilos.ejemploCabecera}>
        <p className={estilos.nota}>{ejemplo.contexto}</p>
        <button type="button" className={estilos.alternar} aria-pressed={continuo} onClick={() => setContinuo((d) => !d)}>
          {continuo ? 'Ver por piezas' : 'Ver como texto continuo'}
        </button>
      </div>

      <div className={estilos.manuscrito}>
        {continuo ? (
          <p className={estilos.textoEjemplo}>
            {ejemplo.fragmentos.map((x, i) => (
              <span
                key={i}
                {...pulsar(i)}
                className={cx(estilos.fragmento, i === activo && estilos.fragmentoActivo)}
                style={{ '--tono': i } as CSSProperties}
                aria-label={`${x.elemento}: ${x.texto}`}
              >
                {x.texto}
              </span>
            ))}
          </p>
        ) : (
          <div className={estilos.anotadas}>
            {agrupar(ejemplo.fragmentos).map((g, k) => (
              <section key={k} className={estilos.grupo} aria-label={g.titulo ? plural(g.titulo) : g.piezas[0]?.f.elemento}>
                {g.titulo && <h4 className={estilos.grupoTitulo}>{plural(g.titulo)}</h4>}
                {g.piezas.map(({ f: x, i }) => (
                  <div
                    key={i}
                    {...pulsar(i)}
                    className={cx(estilos.anotada, i === activo && estilos.anotadaActiva)}
                    style={{ '--tono': i, '--k': i } as CSSProperties}
                  >
                    <span className={estilos.anotadaMarca} aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className={estilos.anotadaCuerpo}>
                      <span className={estilos.elemento}>{x.elemento}</span>
                      <span className={estilos.anotadaTexto}>{x.texto}</span>
                    </span>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        {/* Nota al margen: qué función cumple la pieza elegida */}
        {f && (
          <aside id={`${id}-explicacion`} className={estilos.margen} style={{ '--tono': activo } as CSSProperties} aria-live="polite">
            <div className={estilos.margenNota} key={activo}>
              <span className={estilos.margenCuenta}>
                Pieza {activo + 1} de {total}
              </span>
              <span className={estilos.elemento}>{f.elemento}</span>
              <p>{f.explicacion}</p>
              <div className={estilos.margenPasos}>
                <button type="button" onClick={() => setActivo((a) => Math.max(0, a - 1))} disabled={activo === 0} aria-label="Pieza anterior">
                  ←
                </button>
                <button type="button" onClick={() => setActivo((a) => Math.min(total - 1, a + 1))} disabled={activo === total - 1} aria-label="Pieza siguiente">
                  →
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

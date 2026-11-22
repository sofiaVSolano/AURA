import { Fragment, useRef, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router';
import { useParalaje } from '../../design-system/index.ts';
import { Orbe } from './componentes/Orbe.tsx';
import { useAperturaBurbuja } from './componentes/aperturaBurbuja.ts';
import { FilaSubtema } from './componentes/FilaSubtema.tsx';
import { catalogoEmocional, todosLosSubtemas } from './datos/catalogoEmocional.ts';
import { useEmocional } from './estado/EmocionalContexto.tsx';
import estilos from './EmocionalPage.module.css';

/** Pseudoazar estable por índice: el cielo es orgánico pero siempre el mismo. */
const azar = (i: number, s: number) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Las emociones orbitan alrededor de la pregunta, en una elipse con un poco de
 * desorden (escritorio). En móvil forman dos columnas desfasadas.
 */
function posicion(i: number, n: number) {
  const angulo = -Math.PI / 2 + (i / n) * Math.PI * 2 + (azar(i, 1) - 0.5) * 0.35;
  return {
    x: 50 + Math.cos(angulo) * (40 + (azar(i, 2) - 0.5) * 5),
    y: 50 + Math.sin(angulo) * (37 + (azar(i, 3) - 0.5) * 6),
    tam: Math.round(104 + azar(i, 4) * 44),
    flota: (5 + azar(i, 5) * 3).toFixed(2),
  };
}

/** Mueve un poco la burbuja hacia el puntero (efecto imán), solo con ratón. */
function iman(e: PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 22).toFixed(1) + 'px');
  el.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 22).toFixed(1) + 'px');
}
function soltar(e: PointerEvent<HTMLAnchorElement>) {
  e.currentTarget.style.setProperty('--mx', '0px');
  e.currentTarget.style.setProperty('--my', '0px');
}

/** Entrada a AURA emocional: «¿Cómo te sientes hoy?». Elegir solo navega; no se guarda nada. */
export function EmocionalPage() {
  const escena = useRef<HTMLElement>(null);
  useParalaje(escena);
  const abrir = useAperturaBurbuja();
  const { carga } = useEmocional();
  const estado = carga.estado === 'listo' ? carga.datos : null;
  const guardados = estado ? todosLosSubtemas().filter((s) => s.video && estado.guardados.includes(s.video.id)) : [];
  const categorias = catalogoEmocional.categorias;
  const palabras = catalogoEmocional.pregunta.split(' ');

  return (
    <>
      <section ref={escena} className={`${estilos.entrada} sangrado textura-grano`} aria-labelledby="pregunta">
        <span className={estilos.nebulosa} aria-hidden="true" />
        <div className={estilos.centro}>
          <h1 id="pregunta" className={estilos.pregunta} aria-label={catalogoEmocional.pregunta}>
            {palabras.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && ' '}
                <span className={estilos.palabra} style={{ '--i': i } as CSSProperties} aria-hidden="true">
                  {p}
                </span>
              </Fragment>
            ))}
          </h1>
          <p className={estilos.bajada}>
            Toca la burbuja que más se parezca a lo que sientes. No hay respuestas correctas y{' '}
            <strong>tu elección no se guarda</strong>.
          </p>
        </div>

        <ul className={estilos.constelacion}>
          {categorias.map((c, i) => {
            const pos = posicion(i, categorias.length);
            return (
              <li
                key={c.id}
                className={estilos.estrella}
                style={
                  {
                    '--i': i,
                    '--x': `${pos.x}%`,
                    '--y': `${pos.y}%`,
                    '--tam': `${pos.tam}px`,
                    '--flota': `${pos.flota}s`,
                    '--matiz': c.matiz,
                  } as CSSProperties
                }
              >
                <Link
                  to={`/emocional/${c.id}`}
                  className={estilos.emocion}
                  onClick={(e) => abrir(e, `/emocional/${c.id}`, { matiz: c.matiz, texto: c.nombre, origen: e.currentTarget.querySelector('[data-orbe]') })}
                  onPointerMove={iman}
                  onPointerLeave={soltar}
                >
                  <span className={estilos.flotador}>
                    <Orbe matiz={c.matiz} tamano={pos.tam} className={estilos.orbe} />
                    <span className={estilos.onda} aria-hidden="true" />
                  </span>
                  <span className={estilos.nombre}>{c.nombre}</span>
                  <span className={estilos.descripcion}>{c.descripcion}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className={estilos.pista} aria-hidden="true">
          Pasa el cursor: las burbujas te escuchan
        </p>
      </section>

      {guardados.length > 0 && estado && (
        <section className={estilos.seccion} aria-labelledby="guardados">
          <h2 id="guardados">Tus guardados</h2>
          <ol className={estilos.lista}>
            {guardados.map((s, i) => (
              <FilaSubtema key={s.id} subtema={s} indice={i} guardado avance={s.video ? estado.vistos[s.video.id] : undefined} conCategoria />
            ))}
          </ol>
        </section>
      )}

    </>
  );
}

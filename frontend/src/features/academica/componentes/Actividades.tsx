import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Boton, Icono } from '../../../design-system/index.ts';
import { cx } from '../../../lib/cx.ts';
import {
  contarPalabras,
  evaluarClasificar,
  evaluarElegir,
  evaluarMarcar,
  evaluarOrdenar,
  evaluarRespuestaSimulador,
  PALABRAS_POR_SEGUNDO,
} from '../dominio/evaluar.ts';
import type { Actividad as TActividad, Retroalimentacion as TRetro } from '../dominio/modelo.ts';
import { Redactar } from './Redactar.tsx';
import estilos from './Actividades.module.css';

type De<T extends TActividad['tipo']> = Extract<TActividad, { tipo: T }>;
interface Comun {
  /** Se llama al revisar (cada vez); el registro en Mi AURA ocurre solo la primera. */
  onRevisada: () => void;
}

/** Comentarios formativos: qué va bien encaminado y cómo mejorar lo demás. Sin nota. */
export function Retroalimentacion({ retro, etiquetas }: { retro: TRetro; etiquetas?: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), [retro]);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={estilos.retro}
      role="region"
      aria-label="Comentarios sobre tu respuesta"
      style={{ '--logro': retro.total ? retro.logrados / retro.total : 0 } as CSSProperties}
    >
      <div className={estilos.retroCabeza}>
        <span className={estilos.retroAnillo} aria-hidden="true">
          <span>
            {retro.logrados}/{retro.total}
          </span>
        </span>
        <p className={estilos.retroResumen}>
          <strong>
            {retro.logrados} de {retro.total}
          </strong>{' '}
          aspectos bien encaminados. {retro.sugerencia}
        </p>
      </div>
      <ul className={estilos.retroLista}>
        {retro.items.map((i) => (
          <li key={i.id} data-estado={i.estado}>
            <Icono nombre={i.estado === 'bien' ? 'check' : 'info'} tamano={18} />
            <span>
              {etiquetas?.[i.id] && <strong className={estilos.retroEtiqueta}>{etiquetas[i.id]}</strong>}
              <span className="visualmente-oculto">{i.estado === 'bien' ? 'Bien encaminado: ' : 'Para revisar: '}</span>
              {i.mensaje}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Marco({ actividad, children, retro, onRevisar, onReiniciar, puedeRevisar = true, extra }: {
  actividad: TActividad;
  children: ReactNode;
  retro: TRetro | null;
  onRevisar: () => void;
  onReiniciar: () => void;
  puedeRevisar?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className={estilos.actividad}>
      <header className={estilos.cabeza}>
        <h2 className={estilos.titulo}>{actividad.titulo}</h2>
        <p className={estilos.consigna}>
          <Icono nombre="info" tamano={18} />
          <span>{actividad.consigna}</span>
        </p>
      </header>
      {children}
      {extra}
      <div className={estilos.acciones}>
        <Boton onClick={onRevisar} disabled={!puedeRevisar}>
          {retro ? 'Revisar de nuevo' : 'Revisar'}
        </Boton>
        {retro && (
          <Boton variante="sutil" onClick={onReiniciar}>
            Empezar de cero
          </Boton>
        )}
      </div>
    </div>
  );
}

// — Ordenar (FLIP: cada fragmento se desliza a su nueva posición) —
function Ordenar({ actividad: a, onRevisada }: { actividad: De<'ordenar'> } & Comun) {
  const inicial = a.items.map((i) => i.id);
  const [orden, setOrden] = useState(inicial);
  const [retro, setRetro] = useState<TRetro | null>(null);
  const nodos = useRef(new Map<string, HTMLLIElement>());
  const previas = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodos.current.forEach((el, id) => {
      const antes = previas.current.get(id);
      const ahora = el.getBoundingClientRect().top;
      if (!reducir && antes !== undefined && antes !== ahora) {
        el.animate([{ transform: `translateY(${antes - ahora}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
      previas.current.set(id, ahora);
    });
  }, [orden]);

  const mover = (i: number, d: -1 | 1) => {
    nodos.current.forEach((el, id) => previas.current.set(id, el.getBoundingClientRect().top));
    setOrden((o) => {
      const n = [...o];
      [n[i], n[i + d]] = [n[i + d]!, n[i]!];
      return n;
    });
    setRetro(null);
  };
  const porId = new Map(a.items.map((x) => [x.id, x]));

  return (
    <Marco
      actividad={a}
      retro={retro}
      onRevisar={() => {
        setRetro(evaluarOrdenar(a, orden));
        onRevisada();
      }}
      onReiniciar={() => {
        setOrden(inicial);
        setRetro(null);
      }}
      extra={a.nota && <p className={estilos.nota}>{a.nota}</p>}
    >
      <ol className={estilos.ordenar}>
        {orden.map((id, i) => {
          const r = retro?.items.find((x) => x.id === id);
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) nodos.current.set(id, el);
                else nodos.current.delete(id);
              }}
              className={estilos.fila}
              data-estado={r?.estado}
            >
              <span className={estilos.posicion} aria-hidden="true">
                {i + 1}
              </span>
              <div className={estilos.filaTexto}>
                <p>{porId.get(id)?.texto}</p>
                {r?.estado === 'revisar' && <p className={estilos.pista}>{r.mensaje}</p>}
              </div>
              <div className={estilos.mover}>
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir el fragmento ${i + 1}`}>
                  <Icono nombre="flecha" tamano={18} className={estilos.arriba} />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === orden.length - 1} aria-label={`Bajar el fragmento ${i + 1}`}>
                  <Icono nombre="flecha" tamano={18} className={estilos.abajo} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="visualmente-oculto" aria-live="polite">
        Orden actual: {orden.map((id, i) => `${i + 1}, ${porId.get(id)?.texto.slice(0, 40)}`).join('. ')}
      </p>
      {retro && <Retroalimentacion retro={{ ...retro, items: [] }} />}
    </Marco>
  );
}

// — Clasificar —
function Clasificar({ actividad: a, onRevisada }: { actividad: De<'clasificar'> } & Comun) {
  const [resp, setResp] = useState<Record<string, string | null>>({});
  const [retro, setRetro] = useState<TRetro | null>(null);
  return (
    <Marco
      actividad={a}
      retro={retro}
      onRevisar={() => {
        setRetro(evaluarClasificar(a, resp));
        onRevisada();
      }}
      onReiniciar={() => {
        setResp({});
        setRetro(null);
      }}
      puedeRevisar={a.items.every((i) => resp[i.id])}
    >
      <ul className={estilos.lista}>
        {a.items.map((it) => {
          const r = retro?.items.find((x) => x.id === it.id);
          return (
            <li key={it.id} className={estilos.tarjeta} data-estado={r?.estado}>
              <p className={estilos.texto}>«{it.texto}»</p>
              <fieldset className={estilos.pildoras}>
                <legend className="visualmente-oculto">¿Qué función cumple este fragmento?</legend>
                {a.categorias.map((c) => (
                  <label key={c.id} className={estilos.pildora}>
                    <input
                      type="radio"
                      name={`${a.id}-${it.id}`}
                      checked={resp[it.id] === c.id}
                      onChange={() => {
                        setResp((x) => ({ ...x, [it.id]: c.id }));
                        setRetro(null);
                      }}
                    />
                    {c.nombre}
                  </label>
                ))}
              </fieldset>
              {r && <p className={estilos.comentario}>{r.mensaje}</p>}
            </li>
          );
        })}
      </ul>
      {retro && <Retroalimentacion retro={{ ...retro, items: [] }} />}
    </Marco>
  );
}

// — Elegir: varias opciones plausibles, en orden aleatorio (la buena no siempre está en el mismo lugar) —
function barajar<T>(lista: readonly T[]): T[] {
  const n = [...lista];
  for (let i = n.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [n[i], n[j]] = [n[j]!, n[i]!];
  }
  return n;
}

function Elegir({ actividad: a, onRevisada }: { actividad: De<'elegir'> } & Comun) {
  const [resp, setResp] = useState<Record<string, string | null>>({});
  const [retro, setRetro] = useState<TRetro | null>(null);
  const [orden, setOrden] = useState(() => Object.fromEntries(a.preguntas.map((p) => [p.id, barajar(p.opciones)])));
  const respondidas = a.preguntas.filter((p) => resp[p.id]).length;
  return (
    <Marco
      actividad={a}
      retro={retro}
      onRevisar={() => {
        setRetro(evaluarElegir(a, resp));
        onRevisada();
      }}
      onReiniciar={() => {
        setResp({});
        setRetro(null);
        setOrden(Object.fromEntries(a.preguntas.map((p) => [p.id, barajar(p.opciones)])));
      }}
      puedeRevisar={respondidas === a.preguntas.length}
      extra={
        !retro && (
          <p className={estilos.faltan} aria-live="polite">
            {respondidas === a.preguntas.length
              ? 'Listo: revisa tus respuestas.'
              : `Respondiste ${respondidas} de ${a.preguntas.length}.`}
          </p>
        )
      }
    >
      {a.preguntas.map((p, n) => {
        const r = retro?.items.find((x) => x.id === p.id);
        return (
          <fieldset key={p.id} className={estilos.pregunta} data-estado={r?.estado} style={{ '--i': n } as CSSProperties}>
            <legend className={estilos.enunciado}>
              <span className={estilos.preguntaNumero}>
                Pregunta {n + 1} de {a.preguntas.length}
              </span>
              {p.enunciado}
            </legend>
            <div className={estilos.opciones}>
              {(orden[p.id] ?? p.opciones).map((o) => {
                const elegida = resp[p.id] === o.id;
                const resultado = !retro ? undefined : elegida ? (o.adecuada ? 'bien' : 'revisar') : o.adecuada && r?.estado === 'revisar' ? 'correcta' : undefined;
                return (
                  <label key={o.id} className={estilos.opcion} data-resultado={resultado}>
                    <input
                      type="radio"
                      name={`${a.id}-${p.id}`}
                      checked={elegida}
                      onChange={() => {
                        setResp((x) => ({ ...x, [p.id]: o.id }));
                        setRetro(null);
                      }}
                    />
                    <span>{o.texto}</span>
                  </label>
                );
              })}
            </div>
            {r && <p className={estilos.comentario}>{r.mensaje}</p>}
          </fieldset>
        );
      })}
      {retro && <Retroalimentacion retro={{ ...retro, items: [] }} />}
    </Marco>
  );
}

// — Marcar (elementos faltantes, errores, coherencia) —
function Marcar({ actividad: a, onRevisada }: { actividad: De<'marcar'> } & Comun) {
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(new Set());
  const [retro, setRetro] = useState<TRetro | null>(null);
  const alternar = (id: string) => {
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setRetro(null);
  };
  return (
    <Marco
      actividad={a}
      retro={retro}
      onRevisar={() => {
        setRetro(evaluarMarcar(a, marcados));
        onRevisada();
      }}
      onReiniciar={() => {
        setMarcados(new Set());
        setRetro(null);
      }}
    >
      <ul className={estilos.lista}>
        {a.items.map((it) => {
          const r = retro?.items.find((x) => x.id === it.id);
          return (
            <li key={it.id}>
              <label className={cx(estilos.opcion, estilos.casilla)} data-estado={r?.estado}>
                <input type="checkbox" checked={marcados.has(it.id)} onChange={() => alternar(it.id)} />
                <span>{it.texto}</span>
              </label>
              {r && <p className={estilos.comentario}>{r.mensaje}</p>}
            </li>
          );
        })}
      </ul>
      {retro && <Retroalimentacion retro={{ ...retro, items: [] }} />}
    </Marco>
  );
}

// — Simulador de sustentación (por texto) —
function Simulador({ actividad: a, onRevisada, onPractica }: { actividad: De<'simulador'>; onPractica: (preguntaId: string) => void } & Comun) {
  const [indice, setIndice] = useState(0);
  const [respuesta, setRespuesta] = useState('');
  const [retro, setRetro] = useState<TRetro | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);
  const p = a.preguntas[indice]!;
  const palabras = contarPalabras(respuesta);

  useEffect(() => {
    if (inicio === null) return;
    const t = window.setInterval(() => setAhora(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [inicio]);
  const transcurrido = inicio === null ? 0 : Math.max(0, Math.round((ahora - inicio) / 1000));
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const cambiar = (i: number) => {
    setIndice(i);
    setRespuesta('');
    setRetro(null);
    setInicio(null);
  };

  return (
    <div className={estilos.actividad}>
      <header className={estilos.cabeza}>
        <h2 className={estilos.titulo}>{a.titulo}</h2>
        <p className={estilos.consigna}>
          <Icono nombre="info" tamano={18} />
          <span>{a.consigna}</span>
        </p>
      </header>
      <div className={cx(estilos.pildoras, estilos.centradas)} role="group" aria-label="Elige una pregunta">
        {a.preguntas.map((q, i) => (
          <button key={q.id} type="button" className={cx(estilos.pildora, i === indice && estilos.pildoraActiva)} aria-pressed={i === indice} onClick={() => cambiar(i)}>
            {q.categoria}
          </button>
        ))}
      </div>

      <figure className={estilos.jurado} key={p.id}>
        <span className={estilos.juradoRotulo}>El jurado pregunta</span>
        <blockquote>{p.texto}</blockquote>
      </figure>

      <label className={estilos.etiqueta} htmlFor={`resp-${a.id}`}>
        Tu respuesta
      </label>
      <textarea
        id={`resp-${a.id}`}
        className={estilos.respuesta}
        rows={6}
        maxLength={3000}
        value={respuesta}
        onChange={(e) => {
          setRespuesta(e.target.value);
          setRetro(null);
        }}
        aria-describedby={`ayuda-${a.id}`}
      />
      <p id={`ayuda-${a.id}`} className={estilos.medidores}>
        <span>{palabras} palabras</span>
        <span>≈ {Math.round(palabras / PALABRAS_POR_SEGUNDO)} s en voz alta (sugerido: {a.tiempoSugeridoSegundos} s)</span>
        <span>Tu respuesta no se guarda.</span>
      </p>

      <div className={estilos.cronometro}>
        <Boton variante="secundario" tamano="sm" iconoInicio="reloj" onClick={() => (inicio === null ? (setInicio(Date.now()), setAhora(Date.now())) : setInicio(null))}>
          {inicio === null ? 'Practicar con cronómetro' : 'Detener cronómetro'}
        </Boton>
        {inicio !== null && (
          <span className={cx(estilos.tiempo, transcurrido > a.tiempoSugeridoSegundos && estilos.tiempoExcedido)} role="timer" aria-live="off">
            {mmss(transcurrido)} / {mmss(a.tiempoSugeridoSegundos)}
          </span>
        )}
      </div>

      <div className={estilos.acciones}>
        <Boton
          disabled={palabras === 0}
          onClick={() => {
            setRetro(evaluarRespuestaSimulador(p, respuesta, a.tiempoSugeridoSegundos));
            onRevisada();
            onPractica(p.id);
          }}
        >
          Revisar mi respuesta
        </Boton>
        {indice < a.preguntas.length - 1 && (
          <Boton variante="sutil" iconoFin="flecha" onClick={() => cambiar(indice + 1)}>
            Otra pregunta
          </Boton>
        )}
      </div>
      {retro && <Retroalimentacion retro={retro} />}
      <p className={estilos.nota}>
        La práctica es por escrito. La práctica por voz solo se habilitará si la infraestructura lo permite sin enviar tu
        voz a servicios externos.
      </p>
    </div>
  );
}

export function Actividad({
  actividad,
  labId,
  onRevisada,
  onPractica,
}: {
  actividad: TActividad;
  labId: string;
  onRevisada: () => void;
  onPractica: (preguntaId: string) => void;
}) {
  switch (actividad.tipo) {
    case 'ordenar':
      return <Ordenar actividad={actividad} onRevisada={onRevisada} />;
    case 'clasificar':
      return <Clasificar actividad={actividad} onRevisada={onRevisada} />;
    case 'elegir':
      return <Elegir actividad={actividad} onRevisada={onRevisada} />;
    case 'marcar':
      return <Marcar actividad={actividad} onRevisada={onRevisada} />;
    case 'redactar':
      return <Redactar actividad={actividad} labId={labId} onRevisada={onRevisada} />;
    case 'simulador':
      return <Simulador actividad={actividad} onRevisada={onRevisada} onPractica={onPractica} />;
  }
}

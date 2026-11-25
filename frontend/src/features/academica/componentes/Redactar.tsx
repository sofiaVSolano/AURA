import { useEffect, useState, type CSSProperties } from 'react';
import { Icono } from '../../../design-system/index.ts';
import { api, apiHabilitada, ErrorApi, sesion, type EvaluacionRedaccion } from '../../../lib/api.ts';
import { contarPalabras } from '../dominio/evaluar.ts';
import { INTENTOS_IA, LARGO_MAXIMO_REDACCION, type Actividad } from '../dominio/modelo.ts';
import estilos from './Redactar.module.css';

type Props = { actividad: Extract<Actividad, { tipo: 'redactar' }>; labId: string; onRevisada: () => void };

const ESTADO_CRITERIO = { cumple: 'Cumple', parcial: 'A medias', falta: 'Falta' } as const;

/** Lee y guarda en este navegador (tu borrador y tu última evaluación no salen de aquí). */
const leer = <T,>(k: string): T | null => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const guardar = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
};

/**
 * Escribe un elemento de tu tesis y tu AURA lo evalúa con IA: extensión, criterios
 * de la guía, falencias concretas y cómo mejorarlas. Solo hay INTENTOS_IA evaluaciones.
 */
export function Redactar({ actividad: a, labId, onRevisada }: Props) {
  const id = `${labId}/${a.id}`;
  const [texto, setTexto] = useState(() => leer<string>(`aura:borrador:${id}`) ?? '');
  const [evaluacion, setEvaluacion] = useState<EvaluacionRedaccion | null>(() => leer(`aura:evaluacion:${id}`));
  const [usados, setUsados] = useState<number | null>(null);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const conServidor = apiHabilitada && sesion.servidorDisponible && sesion.activa;
  useEffect(() => {
    if (!conServidor) return setDisponible(false);
    let vivo = true;
    Promise.all([api.iaEstado(), api.iaUso()])
      .then(([e, u]) => {
        if (!vivo) return;
        setDisponible(e.disponible);
        setUsados(u.usos[`redaccion:${id}`] ?? 0);
      })
      .catch(() => vivo && setDisponible(false));
    return () => {
      vivo = false;
    };
  }, [id, conServidor]);

  useEffect(() => guardar(`aura:borrador:${id}`, texto), [id, texto]);

  const palabras = contarPalabras(texto);
  const quedan = usados === null ? null : Math.max(0, INTENTOS_IA - usados);
  const escala = a.palabrasMax * 1.35;
  const estadoLargo = palabras < a.palabrasMin ? 'corta' : palabras > a.palabrasMax ? 'larga' : 'adecuada';
  const puede = disponible && quedan !== null && quedan > 0 && palabras >= 10 && !cargando;

  const evaluar = async () => {
    setCargando(true);
    setError('');
    try {
      const r = await api.iaRedaccion(labId, a.id, texto);
      setEvaluacion(r.evaluacion);
      guardar(`aura:evaluacion:${id}`, r.evaluacion);
      setUsados(r.usados);
      onRevisada();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo evaluar ahora. Tu intento no se descontó.');
      if (e instanceof ErrorApi && e.codigo === 'sin_intentos') setUsados(INTENTOS_IA);
    }
    setCargando(false);
  };

  return (
    <div className={estilos.redactar}>
      <header className={estilos.cabeza}>
        <h2 className={estilos.titulo}>{a.titulo}</h2>
        <p className={estilos.consigna}>
          <Icono nombre="info" tamano={18} />
          <span>{a.consigna}</span>
        </p>
      </header>

      {/* Hoja para escribir, con medidor de extensión */}
      <div className={estilos.hoja} data-cargando={cargando || undefined}>
        <label className={estilos.etiqueta} htmlFor={`redactar-${id}`}>
          Tu {a.elemento}
        </label>
        <textarea
          id={`redactar-${id}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LARGO_MAXIMO_REDACCION}
          rows={10}
          readOnly={cargando}
          placeholder="Escribe aquí con tus propias palabras. Se guarda solo en este navegador mientras escribes."
        />
        <div className={estilos.medidor} data-estado={palabras === 0 ? undefined : estadoLargo}>
          <div
            className={estilos.barra}
            style={
              {
                '--desde': `${(a.palabrasMin / escala) * 100}%`,
                '--hasta': `${(a.palabrasMax / escala) * 100}%`,
                '--va': `${Math.min(100, (palabras / escala) * 100)}%`,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span className={estilos.rango} />
            <span className={estilos.lleno} />
          </div>
          <p className={estilos.cuenta} aria-live="polite">
            <strong>{palabras}</strong> palabras · recomendado {a.palabrasMin} a {a.palabrasMax}
            {palabras > 0 && estadoLargo !== 'adecuada' && (
              <span className={estilos.alerta}>{estadoLargo === 'corta' ? ' · aún corto' : ' · se pasa del límite'}</span>
            )}
          </p>
        </div>
        {cargando && (
          <div className={estilos.leyendo} role="status">
            <span className={estilos.puntos} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Tu AURA está leyendo con lupa…
          </div>
        )}
      </div>

      {/* Intentos */}
      <div className={estilos.intentos}>
        {disponible === false ? (
          <p className={estilos.aviso}>La evaluación con IA no está disponible ahora. Puedes seguir escribiendo: tu borrador se guarda aquí.</p>
        ) : (
          <>
            <span className={estilos.fichas} aria-hidden="true">
              {Array.from({ length: INTENTOS_IA }, (_, i) => (
                <span key={i} data-usada={usados !== null && i < usados ? 'si' : undefined} />
              ))}
            </span>
            <span className={estilos.intentosTexto}>
              {quedan === null ? 'Consultando tus evaluaciones…' : quedan === 0 ? 'Ya usaste tus 2 evaluaciones de esta actividad.' : `Te ${quedan === 1 ? 'queda 1 evaluación' : `quedan ${quedan} evaluaciones`} de ${INTENTOS_IA}.`}
            </span>
            <button type="button" className={estilos.evaluar} disabled={!puede} onClick={() => void evaluar()}>
              {cargando ? 'Evaluando…' : quedan === 1 ? 'Usar mi última evaluación' : 'Evaluar con IA'}
            </button>
          </>
        )}
      </div>
      {error && (
        <p className={estilos.error} role="alert">
          {error}
        </p>
      )}

      {evaluacion && <Resultado e={evaluacion} />}

      <p className={estilos.privacidad}>
        Tu texto se envía a un servicio de IA (Anthropic, Claude) solo para evaluarlo; AURA no lo guarda en el servidor. No incluyas datos
        personales. La IA puede equivocarse: úsala como guía, junto con tu director o directora.
      </p>
    </div>
  );
}

function Resultado({ e }: { e: EvaluacionRedaccion }) {
  return (
    <section className={estilos.resultado} aria-label="Evaluación de tu texto" tabIndex={-1}>
      <div className={estilos.valoracion}>
        <span className={estilos.extension} data-estado={e.extension.estado}>
          {e.extension.palabras} palabras ·{' '}
          {e.extension.estado === 'adecuada' ? 'extensión adecuada' : e.extension.estado === 'corta' ? `corto (mín. ${e.extension.min})` : `largo (máx. ${e.extension.max})`}
        </span>
        <p>{e.valoracion}</p>
      </div>

      {e.criterios.length > 0 && (
        <div className={estilos.bloque}>
          <h3>Lo que debe incluir</h3>
          <ul className={estilos.criterios}>
            {e.criterios.map((c, i) => (
              <li key={i} data-estado={c.estado} style={{ '--i': i } as CSSProperties}>
                <span className={estilos.marca} aria-hidden="true">
                  {c.estado === 'cumple' ? '✓' : c.estado === 'parcial' ? '◐' : '✕'}
                </span>
                <span>
                  <strong>
                    {c.elemento} <em>{ESTADO_CRITERIO[c.estado]}</em>
                  </strong>
                  {c.comentario}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {e.falencias.length > 0 && (
        <div className={estilos.bloque}>
          <h3>Falencias detectadas</h3>
          <ol className={estilos.falencias}>
            {e.falencias.map((f, i) => (
              <li key={i} style={{ '--i': i } as CSSProperties}>
                <strong>{f.problema}</strong>
                {f.fragmento && <blockquote>«{f.fragmento}»</blockquote>}
                {f.comoMejorar && (
                  <p>
                    <span className={estilos.mejora}>Cómo mejorarlo:</span> {f.comoMejorar}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {e.fortalezas.length > 0 && (
        <div className={estilos.bloque}>
          <h3>Lo que ya funciona</h3>
          <ul className={estilos.fortalezas}>
            {e.fortalezas.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {e.siguientePaso && (
        <p className={estilos.siguiente}>
          <span>Tu siguiente paso</span>
          {e.siguientePaso}
        </p>
      )}
    </section>
  );
}

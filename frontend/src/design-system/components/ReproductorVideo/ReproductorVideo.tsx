import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { cx } from '../../../lib/cx.ts';
import { EstadoVista } from '../EstadoVista/EstadoVista.tsx';
import { Icono } from '../Icono/Icono.tsx';
import estilos from './ReproductorVideo.module.css';

export interface FuentesVideo {
  /** MP4 (H.264/AAC): compatible con todos los navegadores. */
  video: string;
  /** WebM (AV1/VP9) opcional: se ofrece primero por ser más ligero. */
  videoAlterno?: string | undefined;
  poster?: string | undefined;
  subtitulos: Array<{ idioma: string; etiqueta: string; src: string }>;
  /** URL de la transcripción (texto). */
  transcripcion?: string | undefined;
}

interface ReproductorVideoProps {
  titulo: string;
  fuentes: FuentesVideo;
  /** Duración conocida (s), mientras el navegador no la lea del archivo. */
  duracion?: number | undefined;
  siguiente?: { titulo: string; a: string } | undefined;
  /** Fracción vista (0–1), informada con moderación (cada ~4 s, al pausar y al terminar). */
  onProgreso?: ((fraccion: number) => void) | undefined;
}

type Estado = 'inactivo' | 'cargando' | 'listo' | 'error';
type Transcripcion = { tipo: 'inactiva' } | { tipo: 'cargando' } | { tipo: 'lista'; texto: string } | { tipo: 'error' };

export const formatoTiempo = (s: number) => {
  const t = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/**
 * Reproductor accesible con controles propios sobre <video> nativo.
 * Nunca reproduce automáticamente; preload="none" (carga diferida real).
 * Atajos con el foco dentro: espacio/K reproducir, ←/→ 5 s, M silencio, C subtítulos, F pantalla completa.
 */
export function ReproductorVideo({ titulo, fuentes, duracion: duracionConocida, siguiente, onProgreso }: ReproductorVideoProps) {
  const id = useId();
  const contenedor = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const ultimoReporte = useRef(0);
  const temporizador = useRef<number>(0);
  const [estado, setEstado] = useState<Estado>('inactivo');
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [duracion, setDuracion] = useState(duracionConocida ?? 0);
  const [volumen, setVolumen] = useState(1);
  const [silencio, setSilencio] = useState(false);
  const [subtitulos, setSubtitulos] = useState(fuentes.subtitulos.some((s) => s.idioma === 'es'));
  const [completa, setCompleta] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [ocultar, setOcultar] = useState(false);
  const [transcripcion, setTranscripcion] = useState<Transcripcion>({ tipo: 'inactiva' });
  const [textoSubtitulo, setTextoSubtitulo] = useState('');

  const reportar = useCallback(
    (forzar = false) => {
      const v = video.current;
      if (!v || !onProgreso || !v.duration) return;
      const ahora = performance.now();
      if (!forzar && ahora - ultimoReporte.current < 4000) return;
      ultimoReporte.current = ahora;
      onProgreso(v.currentTime / v.duration);
    },
    [onProgreso],
  );

  // Pantalla completa (estándar) y limpieza de temporizadores.
  useEffect(() => {
    const alCambiar = () => setCompleta(document.fullscreenElement === contenedor.current);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar);
      window.clearTimeout(temporizador.current);
    };
  }, []);

  // Subtítulos propios: la pista queda en modo "hidden" (sigue emitiendo cues) y el texto
  // activo se dibuja en una capa que nunca queda tapada por los controles.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const pista = Array.from(v.textTracks).find((p) => p.language === 'es') ?? v.textTracks[0];
    if (!pista) return;
    pista.mode = 'hidden';
    const alCambiar = () => {
      const activos = Array.from(pista.activeCues ?? []) as VTTCue[];
      setTextoSubtitulo(activos.map((c) => c.text).join('\n'));
    };
    alCambiar();
    pista.addEventListener('cuechange', alCambiar);
    return () => pista.removeEventListener('cuechange', alCambiar);
  }, [estado]);

  const alternar = async () => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) {
      setTerminado(false);
      if (estado === 'inactivo' || estado === 'error') setEstado('cargando');
      try {
        await v.play();
      } catch (e) {
        // AbortError: interrumpido por una pausa. NotAllowedError: el navegador exige un gesto
        // del usuario; no es un error del video, así que se vuelve a ofrecer el botón.
        if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'NotAllowedError')) setEstado('inactivo');
        else setEstado('error');
      }
    } else {
      v.pause();
    }
  };

  const buscar = (s: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(s, 0), v.duration || duracion);
    setTiempo(v.currentTime);
  };

  const alternarCompleta = async () => {
    const c = contenedor.current;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (c?.requestFullscreen) await c.requestFullscreen();
      else v?.webkitEnterFullscreen?.();
    } catch {
      /* el navegador lo rechazó: no hay nada que hacer */
    }
  };

  const mostrarControles = () => {
    setOcultar(false);
    window.clearTimeout(temporizador.current);
    if (reproduciendo) temporizador.current = window.setTimeout(() => setOcultar(true), 2600);
  };

  const teclas = (e: KeyboardEvent) => {
    const enRango = (e.target as HTMLElement).tagName === 'INPUT';
    const k = e.key.toLowerCase();
    if ((k === ' ' && (e.target as HTMLElement).tagName === 'BUTTON') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (k === ' ' || k === 'k') {
      e.preventDefault();
      void alternar();
    } else if (!enRango && (k === 'arrowright' || k === 'arrowleft')) {
      e.preventDefault();
      buscar(tiempo + (k === 'arrowright' ? 5 : -5));
    } else if (k === 'm') {
      setSilencio((s) => !s);
    } else if (k === 'c' && fuentes.subtitulos.length) {
      setSubtitulos((s) => !s);
    } else if (k === 'f') {
      void alternarCompleta();
    }
    mostrarControles();
  };

  useEffect(() => {
    if (video.current) {
      video.current.volume = volumen;
      video.current.muted = silencio;
    }
  }, [volumen, silencio]);

  const cargarTranscripcion = async () => {
    if (!fuentes.transcripcion || transcripcion.tipo === 'lista' || transcripcion.tipo === 'cargando') return;
    setTranscripcion({ tipo: 'cargando' });
    try {
      const r = await fetch(fuentes.transcripcion);
      if (!r.ok) throw new Error(String(r.status));
      setTranscripcion({ tipo: 'lista', texto: await r.text() });
    } catch {
      setTranscripcion({ tipo: 'error' });
    }
  };

  const total = duracion || duracionConocida || 0;
  const textoTiempo = `${formatoTiempo(tiempo)} de ${formatoTiempo(total)}`;

  return (
    <div className={estilos.bloque}>
      <figure
        ref={contenedor}
        className={cx(estilos.reproductor, completa && estilos.completa)}
        data-estado={estado}
        data-reproduciendo={reproduciendo || undefined}
        data-ocultar={(ocultar && reproduciendo) || undefined}
        onKeyDown={teclas}
        onPointerMove={mostrarControles}
        aria-labelledby={`${id}-titulo`}
      >
        <video
          ref={video}
          className={estilos.video}
          preload="none"
          playsInline
          crossOrigin="anonymous"
          poster={fuentes.poster}
          onClick={() => void alternar()}
          onPlay={() => {
            setReproduciendo(true);
            mostrarControles();
          }}
          onPause={() => {
            setReproduciendo(false);
            setOcultar(false);
            reportar(true);
          }}
          onWaiting={() => setEstado('cargando')}
          onPlaying={() => setEstado('listo')}
          onCanPlay={() => setEstado((s) => (s === 'cargando' ? 'listo' : s))}
          onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration)}
          onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuracion(e.currentTarget.duration)}
          onTimeUpdate={(e) => {
            setTiempo(e.currentTarget.currentTime);
            reportar();
          }}
          onEnded={() => {
            setTerminado(true);
            setReproduciendo(false);
            reportar(true);
          }}
          onError={() => setEstado('error')}
          tabIndex={-1}
        >
          {fuentes.videoAlterno && <source src={fuentes.videoAlterno} type="video/webm" />}
          <source src={fuentes.video} type="video/mp4" />
          {fuentes.subtitulos.map((s) => (
            <track
              key={s.idioma}
              kind="subtitles"
              srcLang={s.idioma}
              label={s.etiqueta}
              src={s.src}
              default={s.idioma === 'es'}
            />
          ))}
        </video>

        {/* Reproducción inicial: botón grande sobre la portada */}
        {!reproduciendo && estado !== 'error' && tiempo === 0 && (
          <button type="button" className={estilos.inicio} onClick={() => void alternar()} aria-label={`Reproducir «${titulo}»`}>
            <Icono nombre="reproducir" tamano={34} />
          </button>
        )}

        {subtitulos && textoSubtitulo && (
          <p className={estilos.subtitulo} aria-hidden="true">
            <span>{textoSubtitulo}</span>
          </p>
        )}

        {estado === 'cargando' && (
          <span className={estilos.carga} role="status">
            <span className="visualmente-oculto">Cargando video…</span>
          </span>
        )}

        {estado === 'error' && (
          <div className={estilos.error} role="alert">
            <p>No pudimos cargar este video.</p>
            <button
              type="button"
              className={estilos.reintentar}
              onClick={() => {
                video.current?.load();
                setEstado('inactivo');
                void alternar();
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {terminado && siguiente && (
          <div className={estilos.fin}>
            <p>Siguiente</p>
            <Link to={siguiente.a} viewTransition className={estilos.finEnlace}>
              <Icono nombre="siguiente" /> {siguiente.titulo}
            </Link>
          </div>
        )}

        <div className={estilos.controles}>
          <button type="button" className={estilos.control} onClick={() => void alternar()} aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}>
            <Icono nombre={reproduciendo ? 'pausa' : 'reproducir'} />
          </button>

          <input
            type="range"
            className={estilos.progreso}
            min={0}
            max={total || 1}
            step={0.1}
            value={Math.min(tiempo, total || 1)}
            onChange={(e) => buscar(Number(e.target.value))}
            aria-label="Progreso del video"
            aria-valuetext={textoTiempo}
            style={{ '--relleno': `${total ? (tiempo / total) * 100 : 0}%` } as React.CSSProperties}
          />
          <span className={estilos.tiempo} aria-hidden="true">
            {formatoTiempo(tiempo)} / {formatoTiempo(total)}
          </span>

          <div className={estilos.volumen}>
            <button type="button" className={estilos.control} onClick={() => setSilencio((s) => !s)} aria-label={silencio ? 'Activar sonido' : 'Silenciar'} aria-pressed={silencio}>
              <Icono nombre={silencio || volumen === 0 ? 'silencio' : 'volumen'} />
            </button>
            <input
              type="range"
              className={estilos.rangoVolumen}
              min={0}
              max={1}
              step={0.05}
              value={silencio ? 0 : volumen}
              onChange={(e) => {
                setVolumen(Number(e.target.value));
                setSilencio(Number(e.target.value) === 0);
              }}
              aria-label="Volumen"
              aria-valuetext={`${Math.round((silencio ? 0 : volumen) * 100)} %`}
            />
          </div>

          {fuentes.subtitulos.length > 0 && (
            <button type="button" className={estilos.control} onClick={() => setSubtitulos((s) => !s)} aria-label="Subtítulos" aria-pressed={subtitulos}>
              <Icono nombre="subtitulos" />
            </button>
          )}
          {siguiente && (
            <Link to={siguiente.a} viewTransition className={estilos.control} aria-label={`Siguiente: ${siguiente.titulo}`}>
              <Icono nombre="siguiente" />
            </Link>
          )}
          <button type="button" className={estilos.control} onClick={() => void alternarCompleta()} aria-label={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            <Icono nombre={completa ? 'salirPantalla' : 'pantalla'} />
          </button>
        </div>

        <figcaption id={`${id}-titulo`} className="visualmente-oculto">
          {titulo}
        </figcaption>
      </figure>

      {fuentes.transcripcion && (
        <details className={estilos.transcripcion} onToggle={(e) => e.currentTarget.open && void cargarTranscripcion()}>
          <summary>Leer la transcripción</summary>
          {transcripcion.tipo === 'cargando' && <EstadoVista tipo="cargando" compacto titulo="Cargando transcripción…" />}
          {transcripcion.tipo === 'error' && (
            <EstadoVista tipo="error" compacto titulo="No pudimos cargar la transcripción" descripcion="Revisa tu conexión y vuelve a abrir esta sección." />
          )}
          {transcripcion.tipo === 'lista' && <div className={estilos.texto}>{transcripcion.texto}</div>}
        </details>
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../../lib/cx.ts';
import { useEnVista } from '../../../design-system/index.ts';
import {
  COLORES,
  DECORACIONES,
  ETAPAS,
  EXPRESIONES,
  FORMAS,
  matizDe,
  type IdDecoracion,
  type PreferenciasAvatar,
} from '../dominio/modelo.ts';
import { BOCAS, CABEZA, CEJAS, CUERPOS, DETALLE_FORMA, ESTRELLA, HOJA, OJOS } from './formas.ts';
import estilos from './Personaje.module.css';

interface PersonajeProps {
  preferencias: PreferenciasAvatar;
  /** 0 Origen · 1 Descubrimiento · 2 Reconocimiento · 3 Transformación · 4 Mi AURA */
  etapa: number;
  /** Decoraciones a mostrar (ya filtradas por desbloqueo). */
  decoraciones?: readonly IdDecoracion[];
  tamano?: number;
  /** Sigue al puntero con la mirada y saluda al tocarlo. */
  interactivo?: boolean;
  reposo?: boolean;
  /** Reproduce una vez la animación de transformación. */
  celebrando?: boolean;
  /** Para transiciones de vista compartidas (una sola instancia por página). */
  compartido?: boolean;
  /** Sin animaciones en bucle (miniaturas, cabecera). */
  quieto?: boolean;
  className?: string | undefined;
}

// Opacidades por etapa: cada capa aparece de forma continua, nada desaparece de golpe.
const NIEBLA = [1, 0.75, 0.4, 0.15, 0];
const NITIDO = [0, 0.4, 0.8, 1, 1];
const CUERPO = [0, 0.55, 0.9, 1, 1];

const nombreDe = <T extends { id: string; nombre: string }>(xs: readonly T[], id: string) =>
  xs.find((x) => x.id === id)?.nombre.toLowerCase() ?? id;

export function describirPersonaje(p: PreferenciasAvatar, etapa: number, decoraciones: readonly IdDecoracion[] = []) {
  const e = ETAPAS[Math.min(Math.max(etapa, 0), 4)]!;
  const partes = [
    `${p.nombre}, tu AURA en etapa ${e.nombre}`,
    etapa === 0
      ? `una esfera difuminada de color ${nombreDe(COLORES, p.colorPrincipal)}`
      : `forma de ${nombreDe(FORMAS, p.forma)} en ${nombreDe(COLORES, p.colorPrincipal)} y ${nombreDe(COLORES, p.colorComplementario)}`,
  ];
  if (etapa >= 2) partes.push(`expresión ${nombreDe(EXPRESIONES, p.expresion)}`);
  if (decoraciones.length > 0 && etapa >= 1) partes.push(`con ${decoraciones.map((d) => nombreDe(DECORACIONES, d)).join(', ')}`);
  return `${partes.join(', ')}.`;
}

export function Personaje({
  preferencias: p,
  etapa,
  decoraciones = [],
  tamano = 220,
  interactivo = false,
  reposo = false,
  celebrando = false,
  compartido = false,
  quieto = false,
  className,
}: PersonajeProps) {
  const i = Math.min(Math.max(Math.round(etapa), 0), 4);
  const uid = useId().replace(/:/g, '');
  const n = (s: string) => `${s}-${uid}`;
  const ref = useRef<SVGSVGElement>(null);
  const visible = useEnVista(ref, '80px');
  const [saluda, setSaluda] = useState(false);
  const hp = matizDe(p.colorPrincipal);
  const hc = matizDe(p.colorComplementario);
  const ojos = OJOS[p.expresion];
  const deco = new Set(i >= 1 ? decoraciones : []);

  // Mirada que sigue al puntero (rAF, sin re-render). Se limpia al desmontar.
  useEffect(() => {
    const svg = ref.current;
    if (!interactivo || !svg || !visible) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cuadro = 0;
    const mover = (ev: PointerEvent) => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const r = svg.getBoundingClientRect();
        const dx = (ev.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
        const dy = (ev.clientY - (r.top + r.height * 0.42)) / (window.innerHeight / 2);
        svg.style.setProperty('--mx', Math.max(-1, Math.min(1, dx)).toFixed(3));
        svg.style.setProperty('--my', Math.max(-1, Math.min(1, dy)).toFixed(3));
      });
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => {
      window.removeEventListener('pointermove', mover);
      cancelAnimationFrame(cuadro);
    };
  }, [interactivo, visible]);

  useEffect(() => {
    if (!saluda) return;
    const t = window.setTimeout(() => setSaluda(false), 900);
    return () => window.clearTimeout(t);
  }, [saluda]);

  const svg = (
    <svg
      ref={ref}
      viewBox="0 0 200 220"
      width={tamano}
      height={(tamano * 220) / 200}
      className={cx(estilos.personaje, className)}
      data-etapa={i}
      data-activo={(visible && !quieto) || undefined}
      data-reposo={reposo || undefined}
      data-saluda={saluda || undefined}
      data-celebra={celebrando || undefined}
      role={interactivo ? undefined : 'img'}
      aria-label={interactivo ? undefined : describirPersonaje(p, i, [...deco])}
      aria-hidden={interactivo ? true : undefined}
      style={
        {
          '--hp': hp,
          '--hc': hc,
          viewTransitionName: compartido ? 'esfera-aura' : undefined,
        } as CSSProperties
      }
    >
      <defs>
        <radialGradient id={n('nucleo')} cx="40%" cy="34%" r="70%">
          <stop offset="0%" stopColor={`hsl(${hp - 18} 95% 86%)`} />
          <stop offset="48%" stopColor={`hsl(${hp} 75% 66%)`} />
          <stop offset="100%" stopColor={`hsl(${hp + 14} 62% 44%)`} />
        </radialGradient>
        <linearGradient id={n('cuerpo')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={`hsl(${hp} 70% 64%)`} />
          <stop offset="100%" stopColor={`hsl(${hc} 70% 60%)`} />
        </linearGradient>
        <radialGradient id={n('halo')}>
          <stop offset="40%" stopColor={`hsl(${hp} 90% 72%)`} stopOpacity="0.45" />
          <stop offset="100%" stopColor={`hsl(${hp} 90% 72%)`} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={n('aurora')} x1="0" x2="1">
          <stop offset="0%" stopColor={`hsl(${hp} 90% 70%)`} stopOpacity="0" />
          <stop offset="50%" stopColor={`hsl(${hc} 90% 72%)`} />
          <stop offset="100%" stopColor={`hsl(${hp} 90% 70%)`} stopOpacity="0" />
        </linearGradient>
        <filter id={n('niebla')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={n('suave')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id={n('grano')} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" result="r" />
          <feColorMatrix in="r" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" result="p" />
          <feComposite in="p" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Halo de fondo */}
      <circle cx="100" cy="110" r="98" fill={`url(#${n('halo')})`} className={estilos.halo} />

      {/* Celebración: anillos que se expanden una vez */}
      <g className={estilos.anillosCelebracion} aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <circle key={k} cx="100" cy="110" r="70" fill="none" stroke={`hsl(${k % 2 ? hc : hp} 90% 75%)`} strokeWidth="2" style={{ animationDelay: `${k * 160}ms` }} />
        ))}
      </g>

      {/* Decoraciones de fondo */}
      <path
        d="M30 52 Q100 -6 170 52"
        fill="none"
        stroke={`url(#${n('aurora')})`}
        strokeWidth="7"
        strokeLinecap="round"
        filter={`url(#${n('suave')})`}
        className={cx(estilos.deco, estilos.aurora)}
        style={{ opacity: deco.has('aurora') ? 0.9 : 0 }}
      />
      <ellipse
        cx="100"
        cy="128"
        rx="88"
        ry="20"
        fill="none"
        stroke={`hsl(${hc} 85% 74%)`}
        strokeWidth="2"
        strokeDasharray="3 6"
        className={cx(estilos.deco, estilos.anillo)}
        style={{ opacity: deco.has('anillo') ? 0.8 : 0 }}
      />

      <g className={estilos.cuerpoEntero}>
        {/* Cuerpo: silueta difusa (Descubrimiento) → forma nítida */}
        <g className={estilos.cuerpo} style={{ opacity: CUERPO[i] }}>
          <path d={CUERPOS[p.forma]} fill={`url(#${n('cuerpo')})`} filter={`url(#${n('niebla')})`} style={{ opacity: NIEBLA[i]! + 0.25 }} className={estilos.capa} />
          <path d={CUERPOS[p.forma]} fill={`url(#${n('cuerpo')})`} style={{ opacity: NITIDO[i] }} className={estilos.capa} />
          {/* Detalles de personalidad (Transformación): patrón complementario */}
          <g style={{ opacity: i >= 3 ? 1 : 0 }} className={estilos.capa}>
            <circle cx="86" cy="170" r="4" fill={`hsl(${hc} 80% 82%)`} />
            <circle cx="100" cy="178" r="5" fill={`hsl(${hc} 80% 82%)`} />
            <circle cx="114" cy="170" r="4" fill={`hsl(${hc} 80% 82%)`} />
          </g>
        </g>

        {/* Cabeza: la esfera original. En Origen ocupa el centro y es mayor. */}
        <g className={estilos.cabeza} style={{ transform: i === 0 ? 'translate(0px, 14px) scale(1.3)' : 'none' }}>
          <circle cx={CABEZA.x} cy={CABEZA.y} r={CABEZA.r} fill={`url(#${n('nucleo')})`} filter={`url(#${n('niebla')})`} style={{ opacity: NIEBLA[i]! * 0.9 + 0.1 }} className={estilos.capa} />
          <circle cx={CABEZA.x} cy={CABEZA.y} r={CABEZA.r} fill={`url(#${n('nucleo')})`} style={{ opacity: NITIDO[i] }} className={estilos.capa} />
          <circle cx={CABEZA.x} cy={CABEZA.y} r={CABEZA.r - 2} fill={`url(#${n('nucleo')})`} filter={`url(#${n('grano')})`} opacity="0.28" />
          {/* Contorno definido (Mi AURA) */}
          <circle cx={CABEZA.x} cy={CABEZA.y} r={CABEZA.r} fill="none" stroke={`hsl(${hp} 80% 88%)`} strokeWidth="1.5" style={{ opacity: i >= 4 ? 0.8 : 0 }} className={estilos.capa} />
          <path d={DETALLE_FORMA[p.forma]} fill={`hsl(${hc} 75% 68%)`} style={{ opacity: i >= 3 ? 1 : 0 }} className={estilos.capa} />
          {deco.has('flor') && (
            <g transform="translate(130 58)" className={estilos.decoEntra}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-6" rx="3.6" ry="6" fill={`hsl(${hc} 85% 86%)`} transform={`rotate(${a})`} />
              ))}
              <circle r="3" fill={`hsl(${hp + 40} 90% 70%)`} />
            </g>
          )}

          {/* Rostro (Reconocimiento): mira hacia el puntero */}
          <g className={estilos.rostro} style={{ opacity: i >= 2 ? 1 : 0 }}>
            <g className={estilos.ojos}>
              {ojos.tipo === 'abiertos' ? (
                [86, 114].map((x) => (
                  <g key={x}>
                    <circle cx={x} cy="93" r={ojos.radio + 2.5} fill="hsl(0 0% 100% / 0.92)" />
                    <circle cx={x} cy="93" r={ojos.radio} fill={`hsl(${hp + 10} 45% 20%)`} className={estilos.pupila} />
                    <circle cx={x - 1.8} cy="90.6" r="1.6" fill="#fff" className={estilos.pupila} />
                  </g>
                ))
              ) : (
                <path d={ojos.d} fill="none" stroke={`hsl(${hp + 10} 45% 22%)`} strokeWidth="2.6" strokeLinecap="round" />
              )}
            </g>
            {/* Cejas (Transformación) */}
            <path
              d={CEJAS[p.expresion]}
              fill="none"
              stroke={`hsl(${hp + 10} 45% 22%)`}
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{ opacity: i >= 3 ? 1 : 0 }}
              className={estilos.capa}
            />
            <path
              d={BOCAS[p.expresion]}
              fill={p.expresion === 'alegre' || p.expresion === 'curiosa' ? `hsl(${hp + 10} 45% 24%)` : 'none'}
              stroke={`hsl(${hp + 10} 45% 22%)`}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Mejillas (Transformación) */}
            <g style={{ opacity: i >= 3 ? 0.55 : 0 }} className={estilos.capa}>
              <ellipse cx="76" cy="106" rx="6" ry="3.5" fill={`hsl(${hc} 85% 74%)`} />
              <ellipse cx="124" cy="106" rx="6" ry="3.5" fill={`hsl(${hc} 85% 74%)`} />
              {p.expresion === 'tierna' && (
                <path d="M72 104 l-1.5 4 M76 104 l-1.5 4 M80 104 l-1.5 4 M120 104 l-1.5 4 M124 104 l-1.5 4 M128 104 l-1.5 4" stroke={`hsl(${hc} 70% 52%)`} strokeWidth="1.2" strokeLinecap="round" />
              )}
            </g>
          </g>
        </g>
      </g>

      {/* Decoraciones de primer plano */}
      <g className={estilos.deco} style={{ opacity: deco.has('hojas') ? 1 : 0 }}>
        <path d={HOJA} fill={`hsl(${hc} 60% 62%)`} transform="translate(52 158) rotate(200)" />
        <path d={HOJA} fill={`hsl(${hc} 60% 62%)`} transform="translate(148 158) rotate(-20)" />
      </g>
      <g className={cx(estilos.deco, estilos.estrellas)} style={{ opacity: deco.has('estrellas') ? 1 : 0 }}>
        {[
          [34, 70],
          [168, 58],
          [174, 132],
        ].map(([x, y], k) => (
          <path key={k} d={ESTRELLA} transform={`translate(${x} ${y})`} fill={`hsl(${hp + 30} 95% 88%)`} style={{ animationDelay: `${k * -700}ms` }} />
        ))}
      </g>
      <g className={cx(estilos.deco, estilos.luciernagas)} style={{ opacity: deco.has('luciernagas') ? 1 : 0 }}>
        {[0, 90, 180, 270].map((a) => (
          <circle key={a} cx="100" cy="22" r="3" fill={`hsl(${hc + 20} 100% 80%)`} transform={`rotate(${a} 100 110)`} />
        ))}
      </g>
    </svg>
  );

  if (!interactivo) return svg;

  return (
    <button
      type="button"
      className={estilos.boton}
      onClick={() => setSaluda(true)}
      aria-label={`${describirPersonaje(p, i, [...deco])} Toca para saludar.`}
    >
      {svg}
      <span className="visualmente-oculto" aria-live="polite">
        {saluda ? `${p.nombre} te saluda.` : ''}
      </span>
    </button>
  );
}

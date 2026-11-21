import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icono } from '../../../design-system/index.ts';
import { formatoTiempo } from '../../../lib/tiempo.ts';
import { rutaSubtema } from '../datos/catalogoEmocional.ts';
import type { SubtemaConVideo } from '../dominio/categorias.ts';
import type { Avance } from '../dominio/estadoEmocional.ts';
import { useAperturaBurbuja } from './aperturaBurbuja.ts';
import estilos from './BurbujaSubtema.module.css';

interface Props {
  subtema: SubtemaConVideo;
  indice: number;
  guardado: boolean;
  avance: Avance | undefined;
}

/**
 * Una situación como burbuja: flota, muestra cuánto has visto con un anillo y,
 * al tocarla, se abre hasta convertirse en el reproductor del video.
 */
export function BurbujaSubtema({ subtema: s, indice, guardado, avance }: Props) {
  const abrir = useAperturaBurbuja();
  const v = s.video;
  const duracion = v?.duracionSegundos ? formatoTiempo(v.duracionSegundos) : v ? `≈ ${v.duracionObjetivoSegundos} s` : null;
  const visto = s.disponible && avance ? avance.fraccion : 0;
  return (
    <li className={estilos.item} style={{ '--i': indice, '--matiz': s.categoria.matiz } as CSSProperties}>
      <Link
        to={rutaSubtema(s)}
        className={estilos.enlace}
        onClick={(e) =>
          abrir(e, rutaSubtema(s), { matiz: s.categoria.matiz + indice * 16 - 24, texto: s.titulo, origen: e.currentTarget.querySelector('[data-burbuja]') })
        }
      >
        <span className={estilos.flotador}>
          <span className={`${estilos.burbuja} textura-grano`} data-burbuja="" aria-hidden="true">
            <span className={estilos.brillo} />
            <span className={estilos.numero}>{String(indice + 1).padStart(2, '0')}</span>
            <span className={estilos.play} data-disponible={s.disponible || undefined}>
              {s.disponible ? <Icono nombre="reproducir" tamano={22} /> : <Icono nombre="reloj" tamano={20} />}
            </span>
          </span>
          {visto > 0 && (
            <svg className={estilos.anillo} viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="48" pathLength={100} strokeDasharray={`${visto * 100} 100`} />
            </svg>
          )}
        </span>
        <span className={estilos.titulo}>{s.titulo}</span>
        <span className={estilos.meta}>
          {s.disponible ? 'Disponible' : 'En preparación'}
          {duracion && <> · {duracion}</>}
          {guardado && <> · Guardado</>}
          {visto > 0 && (
            <span className="visualmente-oculto">{avance?.completado ? ' · Visto' : ` · Visto al ${Math.round(visto * 100)} %`}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

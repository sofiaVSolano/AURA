import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Etiqueta, Icono } from '../../../design-system/index.ts';
import { formatoTiempo } from '../../../lib/tiempo.ts';
import { rutaSubtema } from '../datos/catalogoEmocional.ts';
import type { SubtemaConVideo } from '../dominio/categorias.ts';
import type { Avance } from '../dominio/estadoEmocional.ts';
import estilos from './FilaSubtema.module.css';

interface FilaSubtemaProps {
  subtema: SubtemaConVideo;
  indice: number;
  guardado: boolean;
  avance: Avance | undefined;
  /** Muestra la categoría (en listas mixtas, como Guardados). */
  conCategoria?: boolean;
}

/** Situación con portada (en blanco hasta que exista), duración, estado y progreso visto. */
export function FilaSubtema({ subtema: s, indice, guardado, avance, conCategoria }: FilaSubtemaProps) {
  const v = s.video;
  const duracion = v?.duracionSegundos ? formatoTiempo(v.duracionSegundos) : v ? `≈ ${v.duracionObjetivoSegundos} s` : null;
  return (
    <li className={estilos.fila} style={{ '--i': indice, '--matiz': s.categoria.matiz } as CSSProperties}>
      <Link to={rutaSubtema(s)} viewTransition className={estilos.enlace}>
        <span className={`${estilos.portada} textura-grano`} aria-hidden="true">
          {s.disponible && v?.archivos.poster ? null : <span className={estilos.forma} />}
          {s.disponible && (
            <span className={estilos.play}>
              <Icono nombre="reproducir" tamano={18} />
            </span>
          )}
        </span>
        <span className={estilos.texto}>
          {conCategoria && <span className={estilos.categoria}>{s.categoria.nombre}</span>}
          <span className={estilos.titulo}>{s.titulo}</span>
          {v && <span className={estilos.idea}>{v.descripcion}</span>}
          <span className={estilos.meta}>
            <Etiqueta tono={s.disponible ? 'exito' : 'pendiente'}>{s.disponible ? 'Disponible' : 'En preparación'}</Etiqueta>
            {duracion && (
              <span className={estilos.duracion}>
                <Icono nombre="reloj" tamano={14} /> {duracion}
              </span>
            )}
            {guardado && (
              <span className={estilos.duracion}>
                <Icono nombre="marcador" tamano={14} /> Guardado
              </span>
            )}
          </span>
          {s.disponible && avance && avance.fraccion > 0 && (
            <span className={estilos.visto} role="img" aria-label={avance.completado ? 'Visto' : `Visto al ${Math.round(avance.fraccion * 100)} %`}>
              <span style={{ transform: `scaleX(${avance.fraccion})` }} />
            </span>
          )}
        </span>
        <Icono nombre="flecha" className={estilos.flecha} />
      </Link>
    </li>
  );
}

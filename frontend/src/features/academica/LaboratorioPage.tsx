import { useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { Icono, useTituloDocumento } from '../../design-system/index.ts';
import { cx } from '../../lib/cx.ts';
import { NoEncontrado } from '../../app/Errores.tsx';
import { Actividad } from './componentes/Actividades.tsx';
import { laboratorioPorId, rutaTema, temaPorId } from './datos/catalogoAcademico.ts';
import type { TipoActividad } from './dominio/modelo.ts';
import { useAcademica } from './estado/AcademicaContexto.tsx';
import estilos from './LaboratorioPage.module.css';

const VERBO: Record<TipoActividad, string> = {
  ordenar: 'Ordenar',
  clasificar: 'Clasificar',
  elegir: 'Elegir',
  marcar: 'Marcar',
  redactar: 'Escribir',
  simulador: 'Simular',
};

/** Laboratorio: actividades en el orden que quieras; cada una con comentarios formativos. */
export function LaboratorioPage() {
  const { lab: labId } = useParams();
  const lab = laboratorioPorId(labId);
  const { carga, completarActividad, practicarSustentacion } = useAcademica();
  const [indice, setIndice] = useState(0);
  const zona = useRef<HTMLDivElement>(null);
  useTituloDocumento(lab ? `${lab.titulo} · AURA académica` : 'Página no encontrada');
  if (!lab) return <NoEncontrado />;

  const actual = lab.actividades[indice]!;
  const tema = lab.tema ? temaPorId(lab.tema) : undefined;
  const hecha = (id: string) => carga.estado === 'listo' && Boolean(carga.datos.actividades[`${lab.id}/${id}`]);
  const hechas = lab.actividades.filter((a) => hecha(a.id)).length;
  const total = lab.actividades.length;

  const ir = (i: number) => {
    setIndice(i);
    requestAnimationFrame(() => zona.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  };

  return (
    <div className={estilos.pagina}>
      <header className={estilos.portada}>
        <nav aria-label="Ruta de navegación" className={estilos.migas}>
          <Link to="/academica" viewTransition>
            AURA académica
          </Link>
          <span aria-hidden="true">/</span>
          <span>Laboratorios</span>
        </nav>
        <p className={estilos.kicker}>
          Laboratorio · {total} {total === 1 ? 'actividad' : 'actividades'}
        </p>
        <h1 className={estilos.titulo}>{lab.titulo}</h1>
        <p className={estilos.descripcion}>{lab.descripcion}</p>
        <div className={estilos.portadaPie}>
          <span className={estilos.avance} style={{ '--avance': hechas / total } as CSSProperties}>
            <span className={estilos.avanceAnillo} aria-hidden="true" />
            {hechas} de {total} hechas
          </span>
          {tema && (
            <Link to={rutaTema(tema)} viewTransition className={estilos.guia}>
              <Icono nombre="academica" tamano={18} /> Repasar la guía «{tema.tema.titulo}»
            </Link>
          )}
        </div>
      </header>

      {total > 1 && (
        <ol className={estilos.pasos} aria-label="Actividades del laboratorio" style={{ '--n': total } as CSSProperties}>
          {lab.actividades.map((a, i) => (
            <li key={a.id} style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                className={cx(estilos.paso, i === indice && estilos.pasoActual, hecha(a.id) && estilos.pasoHecho)}
                aria-current={i === indice ? 'step' : undefined}
                onClick={() => ir(i)}
              >
                <span className={estilos.numero} aria-hidden="true">
                  {hecha(a.id) ? <Icono nombre="check" tamano={16} /> : i + 1}
                </span>
                <span className={estilos.pasoTexto}>
                  <span className={estilos.pasoTipo}>{VERBO[a.tipo]}</span>
                  <span className={estilos.pasoTitulo}>{a.titulo}</span>
                </span>
                {hecha(a.id) && <span className="visualmente-oculto"> (hecha)</span>}
              </button>
            </li>
          ))}
        </ol>
      )}

      <div ref={zona} className={estilos.zona} key={actual.id}>
        <span className={estilos.zonaEtiqueta} aria-hidden="true">
          Actividad {indice + 1} de {total}
        </span>
        <Actividad actividad={actual} labId={lab.id} onRevisada={() => completarActividad(lab.id, actual.id)} onPractica={practicarSustentacion} />
      </div>

      {indice < total - 1 && (
        <button type="button" className={estilos.siguiente} onClick={() => ir(indice + 1)}>
          <span className={estilos.siguienteRotulo}>Siguiente actividad</span>
          <span className={estilos.siguienteTitulo}>{lab.actividades[indice + 1]!.titulo}</span>
          <span className={estilos.siguienteFlecha} aria-hidden="true">
            <Icono nombre="flecha" tamano={22} />
          </span>
        </button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Boton, Icono, useTituloDocumento } from '../../design-system/index.ts';
import { cx } from '../../lib/cx.ts';
import { NoEncontrado } from '../../app/Errores.tsx';
import { Actividad } from './componentes/Actividades.tsx';
import { laboratorioPorId, rutaTema, temaPorId } from './datos/catalogoAcademico.ts';
import { useAcademica } from './estado/AcademicaContexto.tsx';
import estilos from './LaboratorioPage.module.css';

/** Laboratorio: actividades en el orden que quieras; cada una con comentarios formativos. */
export function LaboratorioPage() {
  const { lab: labId } = useParams();
  const lab = laboratorioPorId(labId);
  const { carga, completarActividad, practicarSustentacion } = useAcademica();
  const [indice, setIndice] = useState(0);
  useTituloDocumento(lab ? `${lab.titulo} · AURA académica` : 'Página no encontrada');
  if (!lab) return <NoEncontrado />;

  const actual = lab.actividades[indice]!;
  const tema = lab.tema ? temaPorId(lab.tema) : undefined;
  const hecha = (id: string) => carga.estado === 'listo' && Boolean(carga.datos.actividades[`${lab.id}/${id}`]);

  return (
    <div className={estilos.pagina}>
      <nav aria-label="Ruta de navegación" className={estilos.migas}>
        <Link to="/academica" viewTransition>
          AURA académica
        </Link>
        <span aria-hidden="true">/</span>
        <span>Laboratorios</span>
      </nav>

      <header className={estilos.cabecera}>
        <h1 className={estilos.titulo}>{lab.titulo}</h1>
        <p className={estilos.descripcion}>{lab.descripcion}</p>
        {tema && (
          <Link to={rutaTema(tema)} viewTransition className={estilos.guia}>
            <Icono nombre="academica" tamano={18} /> Repasar la guía «{tema.tema.titulo}»
          </Link>
        )}
      </header>

      {lab.actividades.length > 1 && (
        <ol className={estilos.pasos} aria-label="Actividades del laboratorio">
          {lab.actividades.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                className={cx(estilos.paso, i === indice && estilos.pasoActual)}
                aria-current={i === indice ? 'step' : undefined}
                onClick={() => setIndice(i)}
              >
                <span className={estilos.numero} aria-hidden="true">
                  {hecha(a.id) ? <Icono nombre="check" tamano={14} /> : i + 1}
                </span>
                {a.titulo}
                {hecha(a.id) && <span className="visualmente-oculto"> (hecha)</span>}
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className={estilos.zona}>
        <Actividad
          key={actual.id}
          actividad={actual}
          onRevisada={() => completarActividad(lab.id, actual.id)}
          onPractica={practicarSustentacion}
        />
      </div>

      {indice < lab.actividades.length - 1 && (
        <div>
          <Boton variante="secundario" iconoFin="flecha" onClick={() => setIndice(indice + 1)}>
            Siguiente actividad: {lab.actividades[indice + 1]!.titulo}
          </Boton>
        </div>
      )}
    </div>
  );
}

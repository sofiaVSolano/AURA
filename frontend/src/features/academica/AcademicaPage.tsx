import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { EncabezadoPagina, Icono } from '../../design-system/index.ts';
import { cx } from '../../lib/cx.ts';
import { perfilActivo } from '../../content/perfiles/perfil.ts';
import { listaLaboratorios, ruta, rutaLaboratorio, rutaTema, temaPorId } from './datos/catalogoAcademico.ts';
import { useAcademica } from './estado/AcademicaContexto.tsx';
import estilos from './AcademicaPage.module.css';

/** La ruta: estaciones conectadas por un camino; se recorre en el orden que cada quien necesite. */
export function AcademicaPage() {
  const { carga } = useAcademica();
  const estado = carga.estado === 'listo' ? carga.datos : null;
  const trabajo = perfilActivo.proyecto.nombreTrabajo ?? 'proyecto de grado';
  const avances = estado ? [...estado.avances].reverse().slice(0, 3) : [];

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina titulo="AURA académica">
        <p>Guías, ejemplos y laboratorios para construir tu {trabajo}, pieza por pieza.</p>
      </EncabezadoPagina>

      <p className={estilos.nota}>
        <Icono nombre="info" tamano={18} />
        {ruta.nota}
      </p>

      <ol className={estilos.ruta} aria-label={ruta.nombre}>
        {ruta.etapas.map((etapa, i) => {
          const exploradas = etapa.temas.filter((t) => estado?.temas[t.id] === 'explorado').length;
          return (
            <li key={etapa.id} className={estilos.estacion} style={{ '--i': i } as CSSProperties}>
              <div className={estilos.hito} aria-hidden="true">
                <span>{i + 1}</span>
                <svg viewBox="0 0 36 36" className={estilos.anillo}>
                  <circle cx="18" cy="18" r="16" pathLength={100} strokeDasharray={`${(exploradas / etapa.temas.length) * 100} 100`} opacity={exploradas ? 1 : 0} />
                </svg>
              </div>
              <div className={estilos.estacionTexto}>
                <h2 className={estilos.etapaTitulo}>{etapa.titulo}</h2>
                <p className={estilos.etapaDescripcion}>{etapa.descripcion}</p>
                <p className={estilos.etapaProgreso}>
                  {exploradas === 0 ? 'Por explorar, cuando lo necesites' : `${exploradas} de ${etapa.temas.length} temas explorados`}
                </p>
                <ul className={estilos.temas}>
                  {etapa.temas.map((t) => {
                    const r = temaPorId(t.id);
                    const marca = estado?.temas[t.id];
                    return (
                      <li key={t.id}>
                        <Link
                          to={rutaTema({ etapa, tema: t })}
                          viewTransition
                          className={cx(estilos.tema, marca && estilos[marca], !r?.guia && estilos.pendiente)}
                          title={t.resumen}
                        >
                          {marca === 'explorado' && <Icono nombre="check" tamano={14} />}
                          {marca === 'en-curso' && <span className={estilos.punto} aria-hidden="true" />}
                          {t.titulo}
                          <span className="visualmente-oculto">
                            {marca === 'explorado' ? ' (explorado)' : marca === 'en-curso' ? ' (lo estás trabajando)' : ''}
                            {!r?.guia ? ' (guía en preparación)' : ''}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <section className={estilos.seccion} aria-labelledby="laboratorios">
        <h2 id="laboratorios">Laboratorios</h2>
        <p className={estilos.subtexto}>Practica con ejemplos antes de escribir lo tuyo. Los comentarios te dicen cómo mejorar, no te ponen nota.</p>
        <ul className={estilos.labs}>
          {listaLaboratorios().map((l, i) => {
            const hechas = l.actividades.filter((a) => estado?.actividades[`${l.id}/${a.id}`]).length;
            const simulador = l.actividades.some((a) => a.tipo === 'simulador');
            return (
              <li key={l.id} className={cx(estilos.lab, simulador && estilos.labDestacado)} style={{ '--i': i } as CSSProperties}>
                <Link to={rutaLaboratorio(l.id)} viewTransition className={estilos.labEnlace}>
                  <span className={estilos.labForma} aria-hidden="true" />
                  <span className={estilos.labTitulo}>{l.titulo}</span>
                  <span className={estilos.labDescripcion}>{l.descripcion}</span>
                  <span className={estilos.labMeta}>
                    {l.actividades.length} {l.actividades.length === 1 ? 'actividad' : 'actividades'}
                    {hechas > 0 && ` · ${hechas} hecha${hechas === 1 ? '' : 's'}`}
                    <Icono nombre="flecha" tamano={18} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {avances.length > 0 && (
        <section className={estilos.seccion} aria-labelledby="avances">
          <h2 id="avances">Tus avances recientes</h2>
          <ul className={estilos.avances}>
            {avances.map((a) => {
              const t = temaPorId(a.temaId);
              return (
                <li key={a.id}>
                  {t ? (
                    <Link to={rutaTema(t)} viewTransition>
                      {t.tema.titulo}
                    </Link>
                  ) : (
                    a.temaId
                  )}
                  <p>{a.texto}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

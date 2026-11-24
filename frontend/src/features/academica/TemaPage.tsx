import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { EstadoVista, Etiqueta, Icono, useTituloDocumento, VideoPendiente } from '../../design-system/index.ts';
import { ReproductorDiferido as ReproductorVideo } from '../../design-system/components/ReproductorVideo/ReproductorDiferido.tsx';
import { fuentesDe } from '../../content/videos/catalogo.ts';
import { NoEncontrado } from '../../app/Errores.tsx';
import { useEmocional } from '../emocional/estado/EmocionalContexto.tsx';
import { AvancesTema } from './componentes/AvancesTema.tsx';
import { MarcaTema } from './componentes/MarcaTema.tsx';
import { EjemploDesglosado } from './componentes/EjemploDesglosado.tsx';
import { ErroresFrecuentes } from './componentes/ErroresFrecuentes.tsx';
import { cargarGuia, laboratorioPorId, listaLaboratorios, rutaLaboratorio, rutaTema, temaPorId } from './datos/catalogoAcademico.ts';
import type { Guia } from './dominio/modelo.ts';
import { useAcademica } from './estado/AcademicaContexto.tsx';
import estilos from './componentes/Guia.module.css';

const SECCIONES = [
  ['que-es', 'Qué es'],
  ['para-que', 'Para qué sirve'],
  ['incluye', 'Qué debe incluir'],
  ['organiza', 'Cómo se organiza'],
  ['ejemplo', 'Ejemplo explicado'],
  ['errores', 'Errores frecuentes'],
  ['recomendaciones', 'Recomendaciones'],
  ['depende', 'Depende de tu institución'],
  ['practica', 'Actividad práctica'],
] as const;

const IDS_SECCIONES: readonly string[] = SECCIONES.map(([id]) => id);
const SIN_SECCIONES: readonly string[] = [];

/** Índice que sigue la lectura (scroll-spy) sin reaccionar a cada píxel. */
function useSeccionActiva(ids: readonly string[]) {
  const [activa, setActiva] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActiva(e.target.id)),
      { rootMargin: '-30% 0px -60% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids]);
  return activa;
}

type CargaGuia = { estado: 'cargando' } | { estado: 'lista'; guia: Guia | undefined } | { estado: 'error' };

/** Descarga la guía del tema al abrir la página (con estados de carga y error). */
function useGuia(temaId: string | undefined, existe: boolean): CargaGuia {
  const [carga, setCarga] = useState<CargaGuia>({ estado: 'cargando' });
  useEffect(() => {
    if (!temaId || !existe) return setCarga({ estado: 'lista', guia: undefined });
    let activo = true;
    setCarga({ estado: 'cargando' });
    cargarGuia(temaId).then(
      (guia) => activo && setCarga({ estado: 'lista', guia }),
      () => activo && setCarga({ estado: 'error' }),
    );
    return () => {
      activo = false;
    };
  }, [temaId, existe]);
  return carga;
}

export function TemaPage() {
  const { etapa: etapaId, tema: temaId } = useParams();
  const r = temaPorId(temaId);
  const { carga, marcarTema } = useAcademica();
  const { registrarAvance } = useEmocional();
  useTituloDocumento(r ? `${r.tema.titulo} · AURA académica` : 'Página no encontrada');
  const cargaGuia = useGuia(r?.tema.id, r?.tieneGuia ?? false);
  const g = cargaGuia.estado === 'lista' ? cargaGuia.guia : undefined;
  const activa = useSeccionActiva(g ? IDS_SECCIONES : SIN_SECCIONES);
  if (!r || r.etapa.id !== etapaId) return <NoEncontrado />;

  const { etapa, tema, video } = r;
  const marca = carga.estado === 'listo' ? (carga.datos.temas[tema.id] ?? null) : null;
  // El laboratorio del tema: el que indica la guía o, si no hay guía, el del tema
  const lab = laboratorioPorId(g?.laboratorio ?? undefined) ?? listaLaboratorios().find((l) => l.tema === tema.id);
  const fuentes = video && r.videoDisponible ? fuentesDe(video) : null;

  return (
    <div className={estilos.pagina}>
      <nav aria-label="Ruta de navegación" className={estilos.migas}>
        <Link to="/academica" viewTransition>
          AURA académica
        </Link>
        <span aria-hidden="true">/</span>
        <span>{etapa.titulo}</span>
      </nav>

      <header className={estilos.cabecera}>
        <Etiqueta tono="academico">{etapa.titulo}</Etiqueta>
        <h1 className={estilos.titulo}>{tema.titulo}</h1>
        {/* Estable: no cambia cuando llega la guía (evita desplazar el contenido). */}
        <p className={estilos.lead}>{tema.resumen}</p>
        <MarcaTema variante="cabecera" marca={marca} onMarcar={(v) => marcarTema(tema.id, v)} deshabilitado={carga.estado !== 'listo'} />
      </header>

      {cargaGuia.estado === 'cargando' ? (
        // Reserva el alto de la guía: el pie no aparece y luego salta fuera de la pantalla (CLS).
        <div className={estilos.reservaGuia}>
          <EstadoVista tipo="cargando" titulo="Cargando la guía…" />
        </div>
      ) : cargaGuia.estado === 'error' ? (
        <EstadoVista tipo="error" titulo="No pudimos cargar esta guía" descripcion="Revisa tu conexión y vuelve a intentarlo." />
      ) : !g ? (
        <div className={estilos.sinGuia}>
          <EstadoVista
            tipo="vacio"
            titulo="Esta guía está en preparación"
            descripcion="Mientras tanto, practica en su laboratorio: escribe esta parte de tu tesis y tu AURA la evaluará con IA."
          />
          {lab && (
            <Link to={rutaLaboratorio(lab.id)} viewTransition className={estilos.tarjetaLab}>
              <span className={estilos.rotulo}>Laboratorio</span>
              <strong>{lab.titulo}</strong>
              <span>{lab.descripcion}</span>
              <span className={estilos.labIr}>
                Ir al laboratorio <Icono nombre="flecha" tamano={18} />
              </span>
            </Link>
          )}
        </div>
      ) : (
        <div className={estilos.cuerpo}>
          <nav className={estilos.indice} aria-label="En esta guía">
            <ol>
              {SECCIONES.map(([id, nombre]) => (
                <li key={id}>
                  <a href={`#${id}`} aria-current={activa === id ? 'location' : undefined}>
                    {nombre}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={estilos.secciones}>
            <section id="que-es" className={estilos.seccion}>
              <h2>Qué es</h2>
              <p className={estilos.parrafo}>{g.queEs}</p>
            </section>

            <section id="para-que" className={estilos.seccion}>
              <h2>Para qué sirve</h2>
              <p className={estilos.parrafo}>{g.paraQueSirve}</p>
            </section>

            <section id="incluye" className={estilos.seccion}>
              <h2>Qué debe incluir</h2>
              <p className={estilos.nota}>Abre cada pieza para ver qué aporta.</p>
              <div className={estilos.piezas}>
                {g.queDebeIncluir.map((x) => (
                  <details key={x.elemento} className={estilos.pieza}>
                    <summary>{x.elemento}</summary>
                    <p>{x.descripcion}</p>
                  </details>
                ))}
              </div>
            </section>

            <section id="organiza" className={estilos.seccion}>
              <h2>Cómo se organiza</h2>
              <ol className={estilos.pasos}>
                {g.comoSeOrganiza.map((p) => (
                  <li key={p.paso}>
                    <strong>{p.paso}</strong>
                    <p>{p.descripcion}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="ejemplo" className={estilos.seccion}>
              <h2>Ejemplo explicado</h2>
              <EjemploDesglosado ejemplo={g.ejemplo} />
            </section>

            <section id="errores" className={estilos.seccion}>
              <h2>Errores frecuentes</h2>
              <ErroresFrecuentes errores={g.erroresFrecuentes} />
            </section>

            <section id="recomendaciones" className={estilos.seccion}>
              <h2>Recomendaciones</h2>
              <ul className={estilos.recomendaciones}>
                {g.recomendaciones.map((x) => (
                  <li key={x}>
                    <Icono nombre="check" tamano={18} />
                    {x}
                  </li>
                ))}
              </ul>
            </section>

            <section id="depende" className={`${estilos.seccion} ${estilos.depende}`}>
              <h2>Depende de tu institución</h2>
              <p className={estilos.nota}>
                Estas normas no son universales: cambian según la institución, la disciplina o el estilo de citación.
                Consulta siempre la guía oficial de tu programa.
              </p>
              <ul>
                {g.dependeDe.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {g.orientativo.length > 0 && (
                <dl className={estilos.orientativo}>
                  {g.orientativo.map((o) => (
                    <div key={o.dato}>
                      <dt>{o.dato} (orientativo)</dt>
                      <dd>{o.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section id="practica" className={estilos.seccion}>
              <h2>Actividad práctica</h2>
              {lab ? (
                <Link to={rutaLaboratorio(lab.id)} viewTransition className={estilos.tarjetaLab}>
                  <span className={estilos.rotulo}>Laboratorio</span>
                  <strong>{lab.titulo}</strong>
                  <span>{lab.descripcion}</span>
                  <span className={estilos.labIr}>
                    {lab.actividades.length} actividades <Icono nombre="flecha" tamano={18} />
                  </span>
                </Link>
              ) : (
                <p className={estilos.nota}>El laboratorio de este tema está en preparación.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Lo que va después de la guía espera a que llegue: así no se desplaza (CLS). */}
      {cargaGuia.estado !== 'cargando' && video && (
        <section className={estilos.seccionVideo} aria-labelledby="video-tema">
          <h2 id="video-tema">En un minuto</h2>
          <p className={estilos.nota}>{video.descripcion}</p>
          {fuentes ? (
            <ReproductorVideo key={video.id} titulo={video.titulo} fuentes={fuentes} duracion={video.duracionSegundos ?? undefined} onProgreso={(f) => registrarAvance(video.id, f)} />
          ) : (
            <VideoPendiente />
          )}
        </section>
      )}

      {cargaGuia.estado !== 'cargando' && (
        <MarcaTema variante="cierre" marca={marca} onMarcar={(v) => marcarTema(tema.id, v)} deshabilitado={carga.estado !== 'listo'} />
      )}

      {cargaGuia.estado !== 'cargando' && <AvancesTema temaId={tema.id} titulo={tema.titulo} />}

      {g && g.relacionados.length > 0 && (
        <section aria-labelledby="relacionados" className={estilos.relacionados}>
          <h2 id="relacionados">Contenidos relacionados</h2>
          <ul>
            {g.relacionados.map((id) => {
              const t = temaPorId(id);
              return t ? (
                <li key={id}>
                  <Link to={rutaTema(t)} viewTransition>
                    {t.tema.titulo}
                    <span>{t.etapa.titulo}</span>
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

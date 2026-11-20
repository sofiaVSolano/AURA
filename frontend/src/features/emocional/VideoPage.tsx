import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { Boton, BotonEnlace, Icono, useTituloDocumento, VideoPendiente } from '../../design-system/index.ts';
import { ReproductorDiferido as ReproductorVideo } from '../../design-system/components/ReproductorVideo/ReproductorDiferido.tsx';
import { fuentesDe } from '../../content/videos/catalogo.ts';
import { NoEncontrado } from '../../app/Errores.tsx';
import { Aprendizajes } from './componentes/Aprendizajes.tsx';
import { Orbe } from './componentes/Orbe.tsx';
import { buscarSubtema, rutaSubtema, siguienteDe, subtemasDe } from './datos/catalogoEmocional.ts';
import { useEmocional } from './estado/EmocionalContexto.tsx';
import estilos from './VideoPage.module.css';

export function VideoPage() {
  const { categoria: cid, subtema: sid } = useParams();
  const s = buscarSubtema(cid, sid);
  const { carga, alternarGuardado, registrarAvance } = useEmocional();
  useTituloDocumento(s ? `${s.titulo} · ${s.categoria.nombre}` : 'Página no encontrada');
  if (!s || !s.video) return <NoEncontrado />;

  const video = s.video;
  const fuentes = s.disponible ? fuentesDe(video) : null;
  const siguiente = siguienteDe(s);
  const guardado = carga.estado === 'listo' && carga.datos.guardados.includes(video.id);
  const otros = subtemasDe(s.categoria.id).filter((x) => x.id !== s.id);

  return (
    <div className={estilos.pagina} style={{ '--matiz': s.categoria.matiz } as CSSProperties}>
      <nav aria-label="Ruta de navegación" className={estilos.migas}>
        <Link to="/emocional" viewTransition>
          AURA emocional
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/emocional/${s.categoria.id}`} viewTransition className={estilos.miga}>
          <Orbe matiz={s.categoria.matiz} tamano={18} transicion={`orbe-${s.categoria.id}`} />
          {s.categoria.nombre}
        </Link>
      </nav>

      <header className={estilos.cabecera}>
        <h1 className={estilos.titulo}>{s.titulo}</h1>
        <p className={estilos.idea}>{video.descripcion}</p>
      </header>

      {fuentes ? (
        <ReproductorVideo
          titulo={video.titulo}
          fuentes={fuentes}
          duracion={video.duracionSegundos ?? undefined}
          siguiente={siguiente ? { titulo: siguiente.titulo, a: rutaSubtema(siguiente) } : undefined}
          onProgreso={(f) => registrarAvance(video.id, f)}
        />
      ) : (
        // En blanco hasta que exista: no se muestra nada que no esté producido.
        <VideoPendiente matiz={s.categoria.matiz} />
      )}

      <div className={estilos.acciones}>
        <Boton variante="secundario" iconoInicio="marcador" aria-pressed={guardado} onClick={() => alternarGuardado(video.id)} disabled={carga.estado !== 'listo'}>
          {guardado ? 'Guardado' : 'Guardar para después'}
        </Boton>
        {siguiente && (
          <BotonEnlace to={rutaSubtema(siguiente)} variante="sutil" iconoFin="flecha">
            Siguiente: {siguiente.titulo}
          </BotonEnlace>
        )}
      </div>

      <Aprendizajes videoId={video.id} />

      <section aria-labelledby="relacionados" className={estilos.relacionados}>
        <h2 id="relacionados">Más sobre «{s.categoria.nombre}»</h2>
        <ul>
          {otros.map((o) => (
            <li key={o.id}>
              <Link to={rutaSubtema(o)} viewTransition className={estilos.relacionado}>
                <span>{o.titulo}</span>
                <span className={estilos.estado}>{o.disponible ? 'Disponible' : 'En preparación'}</span>
                <Icono nombre="flecha" tamano={18} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

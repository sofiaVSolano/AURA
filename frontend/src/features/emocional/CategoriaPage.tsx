import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { useTituloDocumento } from '../../design-system/index.ts';
import { NoEncontrado } from '../../app/Errores.tsx';
import { Orbe } from './componentes/Orbe.tsx';
import { FilaSubtema } from './componentes/FilaSubtema.tsx';
import { buscarCategoria, subtemasDe } from './datos/catalogoEmocional.ts';
import { useEmocional } from './estado/EmocionalContexto.tsx';
import estilos from './CategoriaPage.module.css';

export function CategoriaPage() {
  const { categoria: id } = useParams();
  const categoria = buscarCategoria(id);
  const { carga } = useEmocional();
  useTituloDocumento(categoria ? `${categoria.nombre} · AURA emocional` : 'Página no encontrada');
  if (!categoria) return <NoEncontrado />;

  const estado = carga.estado === 'listo' ? carga.datos : null;
  const subtemas = subtemasDe(categoria.id);

  return (
    <div className={estilos.pagina} style={{ '--matiz': categoria.matiz } as CSSProperties}>
      <nav aria-label="Ruta de navegación" className={estilos.migas}>
        <Link to="/emocional" viewTransition>
          AURA emocional
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{categoria.nombre}</span>
      </nav>

      <header className={estilos.cabecera}>
        <Orbe matiz={categoria.matiz} tamano={150} transicion={`orbe-${categoria.id}`} />
        <div>
          <h1 className={estilos.titulo}>{categoria.nombre}</h1>
          <p className={estilos.descripcion}>{categoria.descripcion}</p>
        </div>
      </header>

      <section aria-labelledby="situaciones">
        <h2 id="situaciones" className={estilos.subtitulo}>
          ¿Qué situación se parece más a la tuya?
        </h2>
        <ol className={estilos.lista}>
          {subtemas.map((s, i) => (
            <FilaSubtema
              key={s.id}
              subtema={s}
              indice={i}
              guardado={Boolean(s.video && estado?.guardados.includes(s.video.id))}
              avance={s.video ? estado?.vistos[s.video.id] : undefined}
            />
          ))}
        </ol>
      </section>

      <section aria-labelledby="relacionadas" className={estilos.relacionadas}>
        <h2 id="relacionadas" className={estilos.subtitulo}>
          También podría acompañarte
        </h2>
        <ul>
          {categoria.relacionadas.map((rid) => {
            const r = buscarCategoria(rid);
            return r ? (
              <li key={r.id}>
                <Link to={`/emocional/${r.id}`} viewTransition className={estilos.relacionada}>
                  <Orbe matiz={r.matiz} tamano={44} transicion={`orbe-${r.id}`} />
                  <span>{r.nombre}</span>
                </Link>
              </li>
            ) : null;
          })}
        </ul>
      </section>
    </div>
  );
}

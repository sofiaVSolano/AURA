import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { EstadoVista, useParalaje } from '../../design-system/index.ts';
import { Personaje } from '../mi-aura/avatar/Personaje.tsx';
import { useMiAura } from '../mi-aura/estado/MiAuraContexto.tsx';
import { PREFERENCIAS_INICIALES } from '../mi-aura/dominio/modelo.ts';
import { Orbe } from './componentes/Orbe.tsx';
import { FilaSubtema } from './componentes/FilaSubtema.tsx';
import { catalogoEmocional, todosLosSubtemas } from './datos/catalogoEmocional.ts';
import { useEmocional } from './estado/EmocionalContexto.tsx';
import estilos from './EmocionalPage.module.css';

/** Entrada a AURA emocional: «¿Cómo te sientes hoy?». Elegir solo navega; no se guarda nada. */
export function EmocionalPage() {
  const escena = useRef<HTMLElement>(null);
  useParalaje(escena);
  const { carga: cargaAura, evolucion } = useMiAura();
  const { carga } = useEmocional();
  const aura = cargaAura.estado === 'listo' && cargaAura.datos.onboarding.completado && evolucion ? cargaAura.datos.preferencias : null;
  const estado = carga.estado === 'listo' ? carga.datos : null;
  const guardados = estado ? todosLosSubtemas().filter((s) => s.video && estado.guardados.includes(s.video.id)) : [];

  return (
    <>
      <section ref={escena} className={`${estilos.entrada} sangrado textura-grano`} aria-labelledby="pregunta">
        <div className={estilos.cabecera}>
          {/* El acompañante ocupa siempre su lugar (tu AURA, o la esfera de origen si aún no nace):
              así nada se desplaza cuando terminan de cargar los datos. */}
          <Personaje
            preferencias={aura ?? PREFERENCIAS_INICIALES}
            etapa={aura && evolucion ? evolucion.indice : 0}
            tamano={88}
            quieto
            className={estilos.compania}
          />
          <h1 id="pregunta" className={estilos.pregunta}>
            {catalogoEmocional.pregunta}
          </h1>
          <p className={estilos.bajada}>
            Elige lo que más se parezca a lo que sientes. No hay respuestas correctas y{' '}
            <strong>tu elección no se guarda</strong>.
          </p>
        </div>

        <ul className={estilos.constelacion}>
          {catalogoEmocional.categorias.map((c, i) => (
            <li key={c.id} className={estilos.estrella} style={{ '--i': i, '--matiz': c.matiz } as CSSProperties}>
              <Link to={`/emocional/${c.id}`} viewTransition className={estilos.emocion}>
                <Orbe matiz={c.matiz} tamano={i % 3 === 1 ? 128 : 108} transicion={`orbe-${c.id}`} className={estilos.orbe} />
                <span className={estilos.nombre}>{c.nombre}</span>
                <span className={estilos.descripcion}>{c.descripcion}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {guardados.length > 0 && estado && (
        <section className={estilos.seccion} aria-labelledby="guardados">
          <h2 id="guardados">Tus guardados</h2>
          <ol className={estilos.lista}>
            {guardados.map((s, i) => (
              <FilaSubtema key={s.id} subtema={s} indice={i} guardado avance={s.video ? estado.vistos[s.video.id] : undefined} conCategoria />
            ))}
          </ol>
        </section>
      )}

      <div className={estilos.aviso}>
        <EstadoVista
          tipo="vacio"
          compacto
          titulo="Un espacio de acompañamiento, no de diagnóstico"
          descripcion={
            <>
              Estos contenidos acompañan, pero no reemplazan la atención profesional. Si lo necesitas, revisa los{' '}
              <Link to="/recursos" viewTransition>
                recursos de acompañamiento
              </Link>
              .
            </>
          }
        />
      </div>
    </>
  );
}

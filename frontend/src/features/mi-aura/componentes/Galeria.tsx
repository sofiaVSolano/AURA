import { EstadoVista } from '../../../design-system/index.ts';
import { Personaje } from '../avatar/Personaje.tsx';
import { indiceDeEtapa, type Evolucion } from '../dominio/evolucion.ts';
import { DECORACIONES, ETAPAS, TIPOS_EXPERIENCIA, type PreferenciasAvatar } from '../dominio/modelo.ts';
import estilos from '../MiAuraPage.module.css';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });
const formatear = (iso: string) => fecha.format(new Date(iso));

interface GaleriaProps {
  evolucion: Evolucion;
  preferencias: PreferenciasAvatar;
  fechaInicio: string | null;
}

/** Línea de tiempo: cada etapa con el aspecto que tuvo y lo que la hizo posible. */
export function Galeria({ evolucion, preferencias, fechaInicio }: GaleriaProps) {
  const recientes = evolucion.significativas.slice(-6).reverse();
  return (
    <section className={estilos.seccion} aria-labelledby="galeria">
      <h2 id="galeria">Galería y recuerdos</h2>

      <ol className={estilos.linea}>
        <li className={estilos.recuerdo}>
          <Personaje preferencias={preferencias} etapa={0} tamano={72} quieto />
          <div>
            <h3>Nació {preferencias.nombre}</h3>
            {fechaInicio && <time dateTime={fechaInicio}>{formatear(fechaInicio)}</time>}
            <p className={estilos.nota}>{ETAPAS[0].descripcion}</p>
          </div>
        </li>
        {evolucion.hitos.map((h) =>
          h.tipo === 'etapa' ? (
            <li key={`e-${h.etapa}`} className={estilos.recuerdo}>
              <Personaje preferencias={preferencias} etapa={indiceDeEtapa(h.etapa)} tamano={72} quieto />
              <div>
                <h3>Etapa {ETAPAS.find((e) => e.id === h.etapa)?.nombre}</h3>
                <time dateTime={h.fecha}>{formatear(h.fecha)}</time>
                <details className={estilos.contribuciones}>
                  <summary>
                    Lo hicieron posible {h.contribuciones.length}{' '}
                    {h.contribuciones.length === 1 ? 'experiencia' : 'experiencias'}
                  </summary>
                  <ul>
                    {h.contribuciones.map((c) => (
                      <li key={c.id}>
                        {TIPOS_EXPERIENCIA[c.tipo].nombre} · <time dateTime={c.fecha}>{formatear(c.fecha)}</time>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </li>
          ) : (
            <li key={`d-${h.decoracion}`} className={`${estilos.recuerdo} ${estilos.recuerdoMenor}`}>
              <span className={estilos.chispa} aria-hidden="true" />
              <div>
                <h3>Desbloqueaste: {DECORACIONES.find((d) => d.id === h.decoracion)?.nombre}</h3>
                <p className={estilos.nota}>
                  Gracias a: {TIPOS_EXPERIENCIA[h.contribucion.tipo].nombre.toLowerCase()} ·{' '}
                  <time dateTime={h.fecha}>{formatear(h.fecha)}</time>
                </p>
              </div>
            </li>
          ),
        )}
      </ol>

      <h3>Experiencias recientes</h3>
      {recientes.length === 0 ? (
        <EstadoVista
          tipo="vacio"
          compacto
          titulo="Aún no hay experiencias registradas"
          descripcion="Cuando explores contenidos, completes ejercicios o escribas reflexiones, aparecerán aquí."
        />
      ) : (
        <ul className={estilos.recientes}>
          {recientes.map((e) => (
            <li key={e.id}>
              <span>{TIPOS_EXPERIENCIA[e.tipo].nombre}</span>
              <time dateTime={e.fecha}>{formatear(e.fecha)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

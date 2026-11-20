import { BarraProgreso } from '../../../design-system/index.ts';
import { cx } from '../../../lib/cx.ts';
import { Personaje } from '../avatar/Personaje.tsx';
import type { Evolucion } from '../dominio/evolucion.ts';
import { ETAPAS, TIPOS_EXPERIENCIA, type PreferenciasAvatar } from '../dominio/modelo.ts';
import estilos from '../MiAuraPage.module.css';

export function ComoCrece({ evolucion, preferencias }: { evolucion: Evolucion; preferencias: PreferenciasAvatar }) {
  const { progreso } = evolucion;
  return (
    <section className={estilos.seccion} aria-labelledby="como-crece">
      <h2 id="como-crece">Cómo crece tu AURA</h2>

      <ol className={estilos.etapas}>
        {ETAPAS.map((e, k) => {
          const estado = k < evolucion.indice ? 'alcanzada' : k === evolucion.indice ? 'actual' : 'futura';
          return (
            <li key={e.id} className={cx(estilos.etapa, estilos[estado])} aria-current={estado === 'actual' ? 'step' : undefined}>
              <span className={estilos.etapaAvatar} aria-hidden="true">
                <Personaje preferencias={preferencias} etapa={k} tamano={84} quieto />
              </span>
              <span className={estilos.etapaNombre}>
                {e.nombre}
                <span className="visualmente-oculto">
                  {estado === 'alcanzada' ? ' (alcanzada)' : estado === 'actual' ? ' (etapa actual)' : ' (por descubrir)'}
                </span>
              </span>
              <span className={estilos.etapaComo}>{e.comoSeObtiene}</span>
            </li>
          );
        })}
      </ol>

      <div className={estilos.dosColumnas}>
        <div className={estilos.bloque}>
          <h3>Hacia {progreso ? progreso.siguiente.nombre : 'el final del recorrido'}</h3>
          {progreso ? (
            <>
              <BarraProgreso
                etiqueta="Experiencias significativas"
                valor={Math.min(progreso.total, progreso.requerido)}
                max={progreso.requerido}
                textoValor={`${Math.min(progreso.total, progreso.requerido)} de ${progreso.requerido}`}
              />
              {progreso.tiposRequeridos > 1 && (
                <BarraProgreso
                  etiqueta="Tipos de experiencia distintos"
                  valor={Math.min(progreso.tipos, progreso.tiposRequeridos)}
                  max={progreso.tiposRequeridos}
                  textoValor={`${Math.min(progreso.tipos, progreso.tiposRequeridos)} de ${progreso.tiposRequeridos}`}
                />
              )}
              {progreso.dimensionPendiente && (
                <p className={estilos.nota}>
                  Esta etapa reúne todo tu recorrido: le falta una experiencia en lo{' '}
                  {progreso.dimensionPendiente === 'emocional' ? 'emocional' : 'académico'}.
                </p>
              )}
              <p className={estilos.nota}>Sin prisa: no hay fechas límite y nada se pierde con el tiempo.</p>
            </>
          ) : (
            <p className={estilos.nota}>Tu AURA alcanzó su forma más definida. Seguirá acompañándote y guardando tus recuerdos.</p>
          )}
        </div>

        <div className={estilos.bloque}>
          <h3>Qué la hace crecer</h3>
          <ul className={estilos.tipos}>
            {Object.entries(TIPOS_EXPERIENCIA).map(([id, t]) => (
              <li key={id}>
                <strong>{t.nombre}.</strong> {t.descripcion}
              </li>
            ))}
          </ul>
          <p className={estilos.nota}>
            No cuentan los clics, el tiempo conectado ni repetir lo mismo. Las pausas, la tristeza, la frustración o el
            cansancio <strong>nunca restan</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}

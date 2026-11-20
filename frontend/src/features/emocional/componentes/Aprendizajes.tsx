import { useState, type FormEvent } from 'react';
import { AreaTexto, Boton, EstadoVista, Icono } from '../../../design-system/index.ts';
import { Personaje } from '../../mi-aura/avatar/Personaje.tsx';
import { useMiAura } from '../../mi-aura/estado/MiAuraContexto.tsx';
import { LARGO_MAXIMO_APRENDIZAJE } from '../dominio/estadoEmocional.ts';
import { useEmocional } from '../estado/EmocionalContexto.tsx';
import estilos from './Aprendizajes.module.css';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** Registro voluntario y privado de aprendizajes sobre un contenido. Borrable en cualquier momento. */
export function Aprendizajes({ videoId }: { videoId: string }) {
  const { carga, guardarAprendizaje, borrarAprendizaje } = useEmocional();
  const { carga: cargaAura, evolucion } = useMiAura();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string>();
  const [mensaje, setMensaje] = useState('');

  const aura = cargaAura.estado === 'listo' && cargaAura.datos.onboarding.completado ? cargaAura.datos.preferencias : null;
  const lista = carga.estado === 'listo' ? carga.datos.aprendizajes.filter((a) => a.videoId === videoId).reverse() : [];

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = guardarAprendizaje(videoId, texto);
    if (!r.ok) {
      setError(r.errores[0]);
      return;
    }
    setError(undefined);
    setTexto('');
    setMensaje(aura ? `${aura.nombre} guardó tu aprendizaje.` : 'Aprendizaje guardado.');
  };

  return (
    <section className={estilos.aprendizajes} aria-labelledby="aprendizajes">
      <div className={estilos.encabezado}>
        {aura && evolucion && <Personaje preferencias={aura} etapa={evolucion.indice} tamano={56} quieto />}
        <div>
          <h2 id="aprendizajes">¿Qué te llevas de aquí?</h2>
          <p className={estilos.nota}>Si quieres, escribe lo que aprendiste o lo que te hizo sentido. Es opcional.</p>
        </div>
      </div>

      {carga.estado === 'error' ? (
        <EstadoVista tipo="error" compacto titulo="No pudimos leer tus aprendizajes" descripcion={carga.mensaje} />
      ) : (
        <form onSubmit={enviar} className={estilos.formulario} noValidate>
          <AreaTexto
            etiqueta="Tu aprendizaje"
            ayuda="Privado: solo se guarda en este navegador y puedes borrarlo cuando quieras."
            value={texto}
            maxLength={LARGO_MAXIMO_APRENDIZAJE}
            onChange={(e) => {
              setTexto(e.target.value);
              setMensaje('');
            }}
            error={error}
            rows={3}
          />
          <div className={estilos.acciones}>
            <Boton type="submit" variante="secundario">
              Guardar aprendizaje
            </Boton>
            <span role="status" className={estilos.mensaje}>
              {mensaje}
            </span>
          </div>
        </form>
      )}

      {lista.length > 0 && (
        <ul className={estilos.lista}>
          {lista.map((a) => (
            <li key={a.id} className={estilos.item}>
              <p>{a.texto}</p>
              <div className={estilos.pie}>
                <time dateTime={a.fecha}>{fecha.format(new Date(a.fecha))}</time>
                <button
                  type="button"
                  className={estilos.borrar}
                  onClick={() => {
                    borrarAprendizaje(a.id);
                    setMensaje('Aprendizaje borrado.');
                  }}
                  aria-label={`Borrar el aprendizaje del ${fecha.format(new Date(a.fecha))}`}
                >
                  <Icono nombre="papelera" tamano={18} /> Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

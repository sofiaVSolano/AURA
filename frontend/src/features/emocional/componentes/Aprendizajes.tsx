import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AreaTexto, Boton, EstadoVista, Icono } from '../../../design-system/index.ts';
import { useMiAura } from '../../mi-aura/estado/MiAuraContexto.tsx';
import { LARGO_MAXIMO_APRENDIZAJE } from '../dominio/estadoEmocional.ts';
import { useEmocional } from '../estado/EmocionalContexto.tsx';
import estilos from './Aprendizajes.module.css';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** Inicios de frase para quien no sabe por dónde empezar. */
const INICIOS = ['Me di cuenta de que…', 'Algo que me hizo sentido…', 'La próxima vez voy a…', 'Quiero recordar que…'];

/** Registro voluntario y privado de aprendizajes sobre un contenido: un diario con notas. Borrable en cualquier momento. */
export function Aprendizajes({ videoId }: { videoId: string }) {
  const { carga, guardarAprendizaje, borrarAprendizaje } = useEmocional();
  const { carga: cargaAura } = useMiAura();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string>();
  const [mensaje, setMensaje] = useState('');
  const [recienGuardado, setRecienGuardado] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

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
    setRecienGuardado(texto.trim());
    setMensaje(aura ? `${aura.nombre} guardó tu aprendizaje.` : 'Aprendizaje guardado.');
  };

  const empezarCon = (inicio: string) => {
    const t = inicio.replace('…', ' ');
    setTexto((x) => (x.trim() ? `${x.trimEnd()}\n${t}` : t));
    setMensaje('');
    const area = formulario.current?.querySelector('textarea');
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(area.value.length, area.value.length);
    });
  };

  return (
    <section className={estilos.aprendizajes} aria-labelledby="aprendizajes">
      <span className={estilos.luz} aria-hidden="true" />
      <div className={estilos.encabezado}>
        <p className={estilos.kicker}>Tu diario · privado</p>
        <h2 id="aprendizajes" className={estilos.titulo}>
          ¿Qué te <em>llevas</em> de aquí?
        </h2>
        <p className={estilos.nota}>Si quieres, escribe lo que aprendiste o lo que te hizo sentido. Es opcional, y solo tú lo ves.</p>
        <div className={estilos.inicios} role="group" aria-label="Ideas para empezar">
          {INICIOS.map((x, i) => (
            <button key={x} type="button" className={estilos.inicio} style={{ '--i': i } as CSSProperties} onClick={() => empezarCon(x)}>
              {x}
            </button>
          ))}
        </div>
      </div>

      {carga.estado === 'error' ? (
        <EstadoVista tipo="error" compacto titulo="No pudimos leer tus aprendizajes" descripcion={carga.mensaje} />
      ) : (
        <form ref={formulario} onSubmit={enviar} className={estilos.formulario} noValidate>
          <div className={estilos.hoja}>
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
              rows={4}
            />
          </div>
          <div className={estilos.acciones}>
            <Boton type="submit" iconoInicio="marcador">
              Guardar aprendizaje
            </Boton>
            <span role="status" className={estilos.mensaje} key={mensaje}>
              {mensaje}
            </span>
          </div>
        </form>
      )}

      {lista.length > 0 && (
        <ul className={estilos.lista} aria-label="Tus aprendizajes de este video">
          {lista.map((a, i) => (
            <li
              key={a.id}
              className={estilos.item}
              data-nuevo={(i === 0 && recienGuardado === a.texto) || undefined}
              style={{ '--i': i, '--giro': `${((i * 37) % 5) - 2}deg` } as CSSProperties}
            >
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

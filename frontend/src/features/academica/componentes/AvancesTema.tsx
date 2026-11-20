import { useState, type FormEvent } from 'react';
import { AreaTexto, Boton, Icono } from '../../../design-system/index.ts';
import { LARGO_MAXIMO_AVANCE } from '../dominio/estadoAcademico.ts';
import { useAcademica } from '../estado/AcademicaContexto.tsx';
import { useMiAura } from '../../mi-aura/estado/MiAuraContexto.tsx';
import estilos from './Guia.module.css';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

/** Aplica el tema a tu proyecto: un registro privado de avances y aprendizajes. */
export function AvancesTema({ temaId, titulo }: { temaId: string; titulo: string }) {
  const { carga, guardarAvance, borrarAvance } = useAcademica();
  const { carga: cargaAura } = useMiAura();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string>();
  const [mensaje, setMensaje] = useState('');
  const nombre = cargaAura.estado === 'listo' && cargaAura.datos.onboarding.completado ? cargaAura.datos.preferencias.nombre : null;
  const lista = carga.estado === 'listo' ? carga.datos.avances.filter((a) => a.temaId === temaId).reverse() : [];

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = guardarAvance(temaId, texto);
    if (!r.ok) return setError(r.errores[0]);
    setError(undefined);
    setTexto('');
    setMensaje(nombre ? `Avance guardado. ${nombre} lo suma a tu recorrido.` : 'Avance guardado.');
  };

  return (
    <section className={estilos.avances} aria-labelledby="avance-titulo">
      <h2 id="avance-titulo">Aplícalo a tu proyecto</h2>
      <p className={estilos.nota}>
        Escribe qué avanzaste o aprendiste sobre «{titulo}» en tu propio trabajo. Es opcional y privado; no hay
        respuestas correctas.
      </p>
      <form onSubmit={enviar} className={estilos.formAvance} noValidate>
        <AreaTexto
          etiqueta="Tu avance o aprendizaje"
          ayuda="Solo se guarda en este navegador. Puedes borrarlo cuando quieras."
          value={texto}
          maxLength={LARGO_MAXIMO_AVANCE}
          onChange={(e) => {
            setTexto(e.target.value);
            setMensaje('');
          }}
          error={error}
          rows={3}
        />
        <div className={estilos.accionesAvance}>
          <Boton type="submit" variante="secundario">
            Guardar avance
          </Boton>
          <span role="status" className={estilos.mensaje}>
            {mensaje}
          </span>
        </div>
      </form>
      {lista.length > 0 && (
        <ul className={estilos.listaAvances}>
          {lista.map((a) => (
            <li key={a.id}>
              <p>{a.texto}</p>
              <div>
                <time dateTime={a.fecha}>{fecha.format(new Date(a.fecha))}</time>
                <button
                  type="button"
                  onClick={() => {
                    borrarAvance(a.id);
                    setMensaje('Avance borrado.');
                  }}
                  aria-label={`Borrar el avance del ${fecha.format(new Date(a.fecha))}`}
                >
                  <Icono nombre="papelera" tamano={16} /> Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

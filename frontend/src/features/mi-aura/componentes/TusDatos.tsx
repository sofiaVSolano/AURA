import { useState } from 'react';
import { Boton, EstadoVista, Modal } from '../../../design-system/index.ts';
import { useAcademica } from '../../academica/estado/AcademicaContexto.tsx';
import { useEmocional } from '../../emocional/estado/EmocionalContexto.tsx';
import { useMiAura } from '../estado/MiAuraContexto.tsx';
import { sesion } from '../../../lib/api.ts';
import estilos from '../MiAuraPage.module.css';

export function TusDatos({ persistente }: { persistente: boolean }) {
  const { borrarTodo: borrarAura } = useMiAura();
  const { borrarTodo: borrarEmocional } = useEmocional();
  const { borrarTodo: borrarAcademica } = useAcademica();
  const borrarTodo = async () => {
    await Promise.all([borrarAura(), borrarEmocional(), borrarAcademica()]);
  };
  const [confirmar, setConfirmar] = useState(false);
  const [estado, setEstado] = useState<'inactivo' | 'borrando' | 'error'>('inactivo');

  return (
    <section className={estilos.seccion} aria-labelledby="tus-datos">
      <h2 id="tus-datos">Tus datos</h2>
      <p className={estilos.nota}>
        {sesion.activa
          ? 'Tu AURA y tu recorrido se guardan en tu cuenta. Este botón borra esos datos del servidor (tu cuenta sigue existiendo; para eliminarla, ve a «Mi cuenta»).'
          : persistente
            ? 'Sin cuenta, tu AURA vive solo en este navegador: si cambias de dispositivo o borras los datos del sitio, empezará de nuevo. Puedes crear una cuenta en «Entrar».'
            : 'Este navegador no permite guardar: lo que hagas se perderá al cerrar la pestaña.'}
      </p>
      {estado === 'error' && <EstadoVista tipo="error" compacto titulo="No pudimos borrar los datos" descripcion="Vuelve a intentarlo." />}
      <div>
        <Boton variante="secundario" onClick={() => setConfirmar(true)}>
          Borrar todos mis datos de AURA
        </Boton>
      </div>
      <Modal
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="¿Borrar todo?"
        descripcion="Se eliminarán tu AURA, sus preferencias, su historial, tus guardados, tus aprendizajes y tus avances académicos de este navegador. No se puede deshacer."
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmar(false)}>
              Conservar
            </Boton>
            <Boton
              cargando={estado === 'borrando'}
              onClick={async () => {
                setEstado('borrando');
                try {
                  await borrarTodo();
                  setConfirmar(false);
                  setEstado('inactivo');
                } catch {
                  setEstado('error');
                  setConfirmar(false);
                }
              }}
            >
              Borrar todo
            </Boton>
          </>
        }
      />
    </section>
  );
}

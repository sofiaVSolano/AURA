import { useState } from 'react';
import { Boton, BotonEnlace, EstadoVista, Etiqueta, Modal } from '../../design-system/index.ts';
import { Personaje } from './avatar/Personaje.tsx';
import { ComoCrece } from './componentes/ComoCrece.tsx';
import { Galeria } from './componentes/Galeria.tsx';
import { Personalizacion } from './componentes/Personalizacion.tsx';
import { SimuladorDev } from './componentes/SimuladorDev.tsx';
import { TusDatos } from './componentes/TusDatos.tsx';
import { indiceDeEtapa } from './dominio/evolucion.ts';
import { PREFERENCIAS_INICIALES } from './dominio/modelo.ts';
import { useMiAura } from './estado/MiAuraContexto.tsx';
import estilos from './MiAuraPage.module.css';

export function MiAuraPage() {
  const { carga, evolucion, marcarEtapaVista, reiniciarDatosDanados } = useMiAura();
  const [reiniciando, setReiniciando] = useState(false);

  if (carga.estado === 'cargando') return <EstadoVista tipo="cargando" titulo="Despertando a tu AURA…" />;

  if (carga.estado === 'error') {
    return (
      <div className={estilos.centro}>
        <EstadoVista
          tipo="error"
          titulo="No pudimos leer los datos de tu AURA"
          descripcion={`${carga.mensaje} Puedes empezar de nuevo; esto borrará lo guardado en este navegador.`}
          accion={
            <Boton
              cargando={reiniciando}
              onClick={async () => {
                setReiniciando(true);
                await reiniciarDatosDanados();
                setReiniciando(false);
              }}
            >
              Empezar de nuevo
            </Boton>
          }
        />
      </div>
    );
  }

  const { datos } = carga;

  if (!datos.onboarding.completado || !evolucion) {
    return (
      <div className={estilos.invitacion}>
        <Personaje preferencias={PREFERENCIAS_INICIALES} etapa={0} tamano={240} compartido interactivo />
        <h1 className={estilos.nombre}>Tu AURA aún no ha nacido</h1>
        <p className={estilos.descripcion}>
          En un minuto le das nombre, colores y forma. Después crecerá contigo, a tu ritmo.
        </p>
        <BotonEnlace to="/comenzar" tamano="lg" iconoFin="flecha">
          Dar vida a mi AURA
        </BotonEnlace>
      </div>
    );
  }

  const p = datos.preferencias;
  const visibles = p.decoraciones.filter((d) => evolucion.desbloqueadas.includes(d));
  const transformada = evolucion.indice > indiceDeEtapa(datos.ultimaEtapaVista);
  const hitoNuevo = evolucion.hitos.findLast((h) => h.tipo === 'etapa' && h.etapa === evolucion.etapa.id);

  return (
    <div className={estilos.pagina}>
      <section className={`${estilos.escena} textura-grano sangrado`} aria-labelledby="nombre-aura">
        <div className={estilos.escenaAvatar}>
          <Personaje
            preferencias={p}
            etapa={evolucion.indice}
            decoraciones={visibles}
            tamano={300}
            interactivo
            compartido
            reposo={evolucion.reposo}
          />
        </div>
        <div className={estilos.escenaTexto}>
          <Etiqueta tono="aura">
            Etapa {evolucion.indice + 1} de 5 · {evolucion.etapa.nombre}
          </Etiqueta>
          <h1 id="nombre-aura" className={estilos.nombre}>
            {p.nombre}
          </h1>
          <p className={estilos.descripcion}>{evolucion.etapa.descripcion}</p>
          {evolucion.reposo && (
            <p className={estilos.reposo}>
              {p.nombre} descansa contigo. Todo lo que construiste sigue aquí, intacto, esperando cuando quieras volver.
            </p>
          )}
          <p className={estilos.pista}>Toca a {p.nombre} para saludar.</p>
          {!carga.persistente && (
            <EstadoVista
              tipo="vacio"
              compacto
              titulo="Este navegador no permite guardar"
              descripcion="Puedes usar AURA, pero lo que hagas se perderá al cerrar la pestaña (por ejemplo, en modo privado)."
            />
          )}
          {carga.avisoGuardado && <EstadoVista tipo="error" compacto titulo={carga.avisoGuardado} />}
        </div>
      </section>

      <ComoCrece evolucion={evolucion} preferencias={p} />
      <Personalizacion evolucion={evolucion} />
      <Galeria evolucion={evolucion} preferencias={p} fechaInicio={datos.onboarding.fechaInicio} />
      <TusDatos persistente={carga.persistente} />
      {import.meta.env.DEV && <SimuladorDev />}

      <Modal
        abierto={transformada}
        onCerrar={() => marcarEtapaVista(evolucion.etapa.id)}
        titulo={`${p.nombre} se transformó`}
        descripcion={`Alcanzó la etapa ${evolucion.etapa.nombre}: ${evolucion.etapa.descripcion.toLowerCase()}`}
        acciones={<Boton onClick={() => marcarEtapaVista(evolucion.etapa.id)}>Seguir juntos</Boton>}
      >
        <div className={estilos.celebracion}>
          <Personaje preferencias={p} etapa={evolucion.indice} decoraciones={visibles} tamano={200} celebrando />
          {hitoNuevo?.tipo === 'etapa' && (
            <p className={estilos.descripcion}>
              Lo hizo posible: {hitoNuevo.contribuciones.length}{' '}
              {hitoNuevo.contribuciones.length === 1 ? 'experiencia significativa' : 'experiencias significativas'} desde
              su última transformación.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { BotonEnlace, Halo, Icono, useParalaje, type NombreIcono } from '../../design-system/index.ts';
import { Personaje } from '../mi-aura/avatar/Personaje.tsx';
import { PREFERENCIAS_INICIALES } from '../mi-aura/dominio/modelo.ts';
import { useMiAura } from '../mi-aura/estado/MiAuraContexto.tsx';
import { CaminoEvolucion } from './CaminoEvolucion.tsx';
import estilos from './InicioPage.module.css';

interface PuertaProps {
  a: string;
  ambito: 'emocional' | 'academico';
  icono: NombreIcono;
  titulo: string;
  children: ReactNode;
  className?: string | undefined;
}

/** Puerta a una dimensión: se inclina hacia el puntero y un brillo lo sigue. */
function Puerta({ a, ambito, icono, titulo, children, className }: PuertaProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  useParalaje(ref);
  return (
    <Link ref={ref} to={a} viewTransition data-ambito={ambito} className={`${estilos.puerta} ${className} textura-grano`}>
      <Icono nombre={icono} tamano={28} />
      <span className={estilos.puertaTitulo}>{titulo}</span>
      <span className={estilos.puertaTexto}>{children}</span>
      <span className={estilos.puertaIr}>
        Entrar <Icono nombre="flecha" tamano={18} />
      </span>
    </Link>
  );
}

export function InicioPage() {
  const { carga, evolucion } = useMiAura();
  const escena = useRef<HTMLElement>(null);
  useParalaje(escena);

  const datos = carga.estado === 'listo' ? carga.datos : null;
  const nacida = Boolean(datos?.onboarding.completado && evolucion);
  const p = nacida && datos ? datos.preferencias : PREFERENCIAS_INICIALES;
  const etapa = nacida && evolucion ? evolucion.indice : 0;
  const decoraciones = nacida && evolucion ? p.decoraciones.filter((d) => evolucion.desbloqueadas.includes(d)) : [];

  return (
    <>
      <section ref={escena} data-ambito="mi-aura" className={`${estilos.escena} textura-grano sangrado`} aria-labelledby="titulo-inicio">
        <Halo abrir />
        <div className={estilos.escenaContenido}>
          <div className={estilos.avatar}>
            <Personaje preferencias={p} etapa={etapa} decoraciones={decoraciones} tamano={190} interactivo compartido />
          </div>
          {nacida && <p className={estilos.saludo}>Hola de nuevo. {p.nombre} te estaba esperando.</p>}
          <h1 id="titulo-inicio" className={estilos.frase}>
            No tienes que recorrer este camino a ciegas.
          </h1>
          <p className={estilos.bajada}>
            AURA te acompaña durante tu proyecto de grado: en lo que sientes y en lo que construyes.
          </p>
          <div className={estilos.acciones}>
            {nacida ? (
              <BotonEnlace to="/mi-aura" tamano="lg" iconoFin="flecha">
                Visitar a {p.nombre}
              </BotonEnlace>
            ) : (
              <>
                <BotonEnlace to="/comenzar" tamano="lg" iconoFin="flecha">
                  Dar vida a mi AURA
                </BotonEnlace>
                <BotonEnlace to="/emocional" tamano="lg" variante="secundario">
                  Explorar primero
                </BotonEnlace>
              </>
            )}
          </div>
        </div>
        <a href="#titulo-camino" className={estilos.bajar} aria-label="Bajar para conocer cómo crece tu AURA">
          <span />
        </a>
      </section>

      <CaminoEvolucion preferencias={p} />

      <section className={estilos.dimensiones} aria-labelledby="titulo-dimensiones">
        <h2 id="titulo-dimensiones" className={estilos.dimensionesTitulo}>
          Dos dimensiones, un mismo recorrido
        </h2>
        <Puerta a="/emocional" ambito="emocional" icono="emocional" titulo="AURA emocional" className={estilos.puertaEmocional}>
          Nombra lo que sientes y encuentra videos breves para las situaciones que atraviesas.
        </Puerta>
        <Puerta a="/academica" ambito="academico" icono="academica" titulo="AURA académica" className={estilos.puertaAcademica}>
          Guías, ejemplos y ejercicios para construir tu proyecto, adaptados a tu universidad.
        </Puerta>
      </section>
    </>
  );
}

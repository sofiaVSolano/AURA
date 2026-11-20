import { useLayoutEffect } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';
import { Personaje } from '../features/mi-aura/avatar/Personaje.tsx';
import { apiHabilitada, sesion } from '../lib/api.ts';
import { useMiAura } from '../features/mi-aura/estado/MiAuraContexto.tsx';
import { Navegacion, useTituloDocumento, type ItemNavegacion } from '../design-system/index.ts';
import { esHandleRuta, type HandleRuta } from './rutas.ts';
import estilos from './Diseno.module.css';

const navegacion: ItemNavegacion[] = [
  { a: '/', etiqueta: 'Inicio', icono: 'inicio', exacta: true },
  { a: '/emocional', etiqueta: 'Emocional', icono: 'emocional' },
  { a: '/academica', etiqueta: 'Académica', icono: 'academica' },
  { a: '/mi-aura', etiqueta: 'Mi AURA', icono: 'aura' },
];

function useHandleActual(): HandleRuta {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i]?.handle;
    if (esHandleRuta(h)) return h;
  }
  return { ambito: 'inicio' };
}

/** Presencia discreta de tu AURA en todas las páginas, una vez que ha nacido. */
function AvatarCabecera() {
  const { carga, evolucion } = useMiAura();
  const { pathname } = useLocation();
  if (carga.estado !== 'listo' || !carga.datos.onboarding.completado || !evolucion) return null;
  // En Inicio y Mi AURA ya está en grande (y comparte transición de vista).
  if (pathname === '/' || pathname === '/mi-aura' || pathname === '/comenzar') return null;
  const p = carga.datos.preferencias;
  return (
    <Link to="/mi-aura" viewTransition className={estilos.avatar} aria-label={`Mi AURA: ${p.nombre}`}>
      <Personaje
        preferencias={p}
        etapa={evolucion.indice}
        decoraciones={p.decoraciones.filter((d) => evolucion.desbloqueadas.includes(d))}
        tamano={40}
        quieto
        compartido
      />
    </Link>
  );
}

/** Estructura común: salto al contenido, cabecera, navegación, contenido y pie. */
export function Diseno() {
  const { ambito, titulo } = useHandleActual();
  useTituloDocumento(titulo);

  // El ámbito se aplica en <html> para que fondo, scroll y transiciones lo compartan.
  // useLayoutEffect: antes de pintar, así la transición de vista captura el tema correcto.
  useLayoutEffect(() => {
    document.documentElement.dataset.ambito = ambito;
  }, [ambito]);

  return (
    <div className={estilos.app}>
      <a href="#contenido" className="salto-contenido">
        Saltar al contenido
      </a>
      <header className={estilos.cabecera}>
        <div className={estilos.barra}>
          <Link to="/" viewTransition className={estilos.marca} aria-label="AURA, ir al inicio">
            <span className={estilos.marcaSimbolo} aria-hidden="true" />
            AURA
          </Link>
          <Navegacion items={navegacion} etiqueta="Principal" />
          <div className={estilos.extremo}>
            <Link to="/recursos" viewTransition className={estilos.recursos}>
              Recursos
            </Link>
            {apiHabilitada && (
              <Link to="/cuenta" viewTransition className={estilos.recursos}>
                {sesion.activa ? 'Mi cuenta' : 'Entrar'}
              </Link>
            )}
            <AvatarCabecera />
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className={estilos.contenido}>
        <Outlet />
      </main>
      <footer className={estilos.pie}>
        <p>AURA acompaña; no reemplaza la atención profesional.</p>
        <Link to="/recursos" viewTransition>
          Recursos de acompañamiento
        </Link>
      </footer>
      <ScrollRestoration />
    </div>
  );
}

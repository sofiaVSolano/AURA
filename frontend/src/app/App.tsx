import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { EstadoVista } from '../design-system/index.ts';
import { AcademicaProvider } from '../features/academica/estado/AcademicaContexto.tsx';
import { EmocionalProvider } from '../features/emocional/estado/EmocionalContexto.tsx';
import { InicioPage } from '../features/inicio/InicioPage.tsx';
import { MiAuraProvider } from '../features/mi-aura/estado/MiAuraContexto.tsx';
import { Diseno } from './Diseno.tsx';
import { ErrorRuta, NoEncontrado } from './Errores.tsx';
import type { HandleRuta } from './rutas.ts';

const h = (handle: HandleRuta) => handle;

// Carga diferida por ruta: cada sección descarga su código solo cuando se visita.
const rutas: RouteObject[] = [
  { index: true, element: <InicioPage />, handle: h({ ambito: 'inicio' }) },
  {
    path: 'emocional',
    handle: h({ ambito: 'emocional', titulo: 'AURA emocional' }),
    lazy: async () => ({ Component: (await import('../features/emocional/EmocionalPage.tsx')).EmocionalPage }),
  },
  {
    path: 'emocional/:categoria',
    handle: h({ ambito: 'emocional', titulo: null }),
    lazy: async () => ({ Component: (await import('../features/emocional/CategoriaPage.tsx')).CategoriaPage }),
  },
  {
    path: 'emocional/:categoria/:subtema',
    handle: h({ ambito: 'emocional', titulo: null }),
    lazy: async () => ({ Component: (await import('../features/emocional/VideoPage.tsx')).VideoPage }),
  },
  {
    path: 'academica',
    handle: h({ ambito: 'academico', titulo: 'AURA académica' }),
    lazy: async () => ({ Component: (await import('../features/academica/AcademicaPage.tsx')).AcademicaPage }),
  },
  {
    path: 'academica/laboratorios/:lab',
    handle: h({ ambito: 'academico', titulo: null }),
    lazy: async () => ({ Component: (await import('../features/academica/LaboratorioPage.tsx')).LaboratorioPage }),
  },
  {
    path: 'academica/:etapa/:tema',
    handle: h({ ambito: 'academico', titulo: null }),
    lazy: async () => ({ Component: (await import('../features/academica/TemaPage.tsx')).TemaPage }),
  },
  {
    path: 'mi-aura',
    handle: h({ ambito: 'mi-aura', titulo: 'Mi AURA' }),
    lazy: async () => ({ Component: (await import('../features/mi-aura/MiAuraPage.tsx')).MiAuraPage }),
  },
  {
    path: 'comenzar',
    handle: h({ ambito: 'mi-aura', titulo: 'Dar vida a tu AURA' }),
    lazy: async () => ({ Component: (await import('../features/mi-aura/onboarding/OnboardingPage.tsx')).OnboardingPage }),
  },
  {
    path: 'recursos',
    handle: h({ ambito: 'inicio', titulo: 'Recursos de acompañamiento' }),
    lazy: async () => ({ Component: (await import('../features/recursos/RecursosPage.tsx')).RecursosPage }),
  },
];

// Catálogo del sistema de diseño: solo en desarrollo (no entra en el build de producción).
if (import.meta.env.DEV) {
  rutas.push({
    path: 'sistema',
    handle: h({ ambito: 'inicio', titulo: 'Sistema de diseño' }),
    lazy: async () => ({ Component: (await import('../features/sistema/SistemaPage.tsx')).SistemaPage }),
  });
}

rutas.push({ path: '*', element: <NoEncontrado />, handle: h({ ambito: 'inicio', titulo: 'Página no encontrada' }) });

function CargandoRuta() {
  return <EstadoVista tipo="cargando" titulo="Cargando…" />;
}

const router = createBrowserRouter(
  [{ element: <Diseno />, errorElement: <ErrorRuta />, HydrateFallback: CargandoRuta, children: rutas }],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  },
);

export function App() {
  return (
    <MiAuraProvider>
      <EmocionalProvider>
        <AcademicaProvider>
          <RouterProvider router={router} />
        </AcademicaProvider>
      </EmocionalProvider>
    </MiAuraProvider>
  );
}

import { lazy, Suspense, type ComponentProps } from 'react';
import { EstadoVista } from '../EstadoVista/EstadoVista.tsx';

// El reproductor (controles, subtítulos, transcripción) solo se descarga cuando una
// página tiene un video publicado que mostrar; los videos pendientes no lo cargan.
const Reproductor = lazy(() => import('./ReproductorVideo.tsx').then((m) => ({ default: m.ReproductorVideo })));

export function ReproductorDiferido(props: ComponentProps<typeof Reproductor>) {
  return (
    <Suspense fallback={<EstadoVista tipo="cargando" compacto titulo="Cargando el reproductor…" />}>
      <Reproductor {...props} />
    </Suspense>
  );
}

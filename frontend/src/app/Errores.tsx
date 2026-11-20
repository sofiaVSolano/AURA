import { isRouteErrorResponse, useRouteError } from 'react-router';
import { BotonEnlace, EncabezadoPagina, EstadoVista } from '../design-system/index.ts';

export function NoEncontrado() {
  return (
    <>
      <EncabezadoPagina titulo="Esta página no existe" />
      <EstadoVista
        tipo="vacio"
        titulo="No encontramos lo que buscabas"
        descripcion="Puede que el enlace haya cambiado. Puedes volver al inicio y seguir desde allí."
        accion={<BotonEnlace to="/">Volver al inicio</BotonEnlace>}
      />
    </>
  );
}

/** Límite de error de rutas: nunca deja una pantalla en blanco. */
export function ErrorRuta() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const noEncontrado = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="contenido" style={{ padding: 'var(--espacio-7) var(--margen-pagina)' }}>
      {noEncontrado ? (
        <NoEncontrado />
      ) : (
        <EstadoVista
          tipo="error"
          titulo="Algo salió mal al mostrar esta página"
          descripcion="No es tu culpa. Vuelve a intentarlo en unos segundos; si se repite, regresa al inicio."
          accion={<BotonEnlace to="/">Volver al inicio</BotonEnlace>}
        />
      )}
    </main>
  );
}

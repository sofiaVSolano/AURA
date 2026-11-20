import type { ReactNode } from 'react';
import estilos from './EncabezadoPagina.module.css';

/** Encabezado de página: el h1 lleva su propio peso, sin etiquetas encima. */
export function EncabezadoPagina({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <header className={estilos.encabezado}>
      <h1 className={estilos.titulo}>{titulo}</h1>
      {children && <div className={estilos.intro}>{children}</div>}
    </header>
  );
}

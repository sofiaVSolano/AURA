import { NavLink } from 'react-router';
import { cx } from '../../../lib/cx.ts';
import { Icono, type NombreIcono } from '../Icono/Icono.tsx';
import estilos from './Navegacion.module.css';

export interface ItemNavegacion {
  a: string;
  etiqueta: string;
  icono: NombreIcono;
  /** Coincidencia exacta (para la ruta de inicio). */
  exacta?: boolean;
}

/**
 * Navegación principal. En móvil es una barra inferior al alcance del pulgar;
 * desde 48rem se integra en la cabecera. La ruta activa se marca con aria-current.
 */
export function Navegacion({ items, etiqueta }: { items: ItemNavegacion[]; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta} className={estilos.nav}>
      <ul className={estilos.lista}>
        {items.map((item) => (
          <li key={item.a}>
            <NavLink
              to={item.a}
              end={item.exacta ?? false}
              viewTransition
              className={({ isActive }) => cx(estilos.enlace, isActive && estilos.activo)}
            >
              <Icono nombre={item.icono} tamano={22} className={estilos.icono} />
              <span>{item.etiqueta}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { useState } from 'react';
import { Icono } from '../../../design-system/index.ts';
import type { Guia } from '../dominio/modelo.ts';
import estilos from './Guia.module.css';

/** Comparaciones: primero el error habitual; al revelarlo, la alternativa y su porqué. */
export function ErroresFrecuentes({ errores }: { errores: Guia['erroresFrecuentes'] }) {
  const [abiertos, setAbiertos] = useState<ReadonlySet<number>>(new Set());
  const alternar = (i: number) =>
    setAbiertos((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <ul className={estilos.errores}>
      {errores.map((e, i) => {
        const abierto = abiertos.has(i);
        return (
          <li key={i} className={estilos.comparacion} data-abierto={abierto || undefined}>
            <div className={estilos.enLugarDe}>
              <span className={estilos.rotulo}>En lugar de</span>
              <p>{e.enLugarDe}</p>
            </div>
            <button type="button" className={estilos.revelar} aria-expanded={abierto} aria-controls={`alternativa-${i}`} onClick={() => alternar(i)}>
              {abierto ? 'Ocultar alternativa' : '¿Qué podría funcionar mejor?'}
              <Icono nombre="flecha" tamano={16} />
            </button>
            <div id={`alternativa-${i}`} className={estilos.prueba} hidden={!abierto}>
              <span className={estilos.rotulo}>Prueba</span>
              <p>{e.prueba}</p>
              <p className={estilos.porque}>{e.porque}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

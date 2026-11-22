// Laboratorio (solo desarrollo): prueba el personaje 3D con todas las combinaciones
// de forma, expresión y colores, y cómo se va formando etapa por etapa.
// Acepta parámetros en la URL (?forma=1&expresion=2&a=morado&b=menta&etapa=4)
// para capturas automáticas.
import { useRef, useState, type CSSProperties } from 'react';
import { Esfera3D, type EstadoEsfera } from '../../design-system/index.ts';
import { COLORES, EXPRESIONES, FORMAS, matizDe, type IdColor } from '../mi-aura/dominio/modelo.ts';
import estilos from './PersonajeLab.module.css';

const parametro = (k: string) => new URLSearchParams(location.search).get(k);
const numero = (k: string, d: number) => {
  const v = Number(parametro(k));
  return parametro(k) !== null && Number.isFinite(v) ? v : d;
};

export function PersonajeLab() {
  const [forma, setForma] = useState(numero('forma', 0));
  const [expresion, setExpresion] = useState(numero('expresion', 2));
  const [colorA, setColorA] = useState<IdColor>((parametro('a') as IdColor) ?? 'morado');
  const [colorB, setColorB] = useState<IdColor>((parametro('b') as IdColor) ?? 'cielo');
  const [etapa, setEtapa] = useState(numero('etapa', 4));
  const desnudo = parametro('captura') !== null;

  const estado = useRef<EstadoEsfera>({ x: 0, y: 0, escala: 0.82, etapa, matizA: 0, matizB: 0, energia: 0.15, forma, expresion });
  Object.assign(estado.current, {
    forma,
    expresion,
    etapa,
    matizA: matizDe(colorA),
    matizB: matizDe(colorB),
    vestuario: numero('vestuario', 0),
    birrete: numero('birrete', 1),
    aro: numero('aro', 1),
    flor: numero('flor', 0),
    tapar: numero('tapar', 0),
  });

  return (
    <div className={estilos.lab} data-captura={desnudo || undefined}>
      <div className={estilos.escena}>
        <Esfera3D estado={estado} resolucion={1} />
      </div>
      {!desnudo && (
        <form className={estilos.controles} onSubmit={(e) => e.preventDefault()}>
          <h1 className={estilos.titulo}>Personaje 3D</h1>
          <fieldset>
            <legend>Forma</legend>
            {FORMAS.map((f, i) => (
              <label key={f.id}>
                <input type="radio" name="forma" checked={forma === i} onChange={() => setForma(i)} /> {f.nombre}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Expresión</legend>
            {EXPRESIONES.map((x, i) => (
              <label key={x.id}>
                <input type="radio" name="expresion" checked={expresion === i} onChange={() => setExpresion(i)} /> {x.nombre}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Colores</legend>
            <div className={estilos.colores}>
              {COLORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Principal ${c.nombre}`}
                  aria-pressed={colorA === c.id}
                  style={{ '--m': c.matiz } as CSSProperties}
                  onClick={() => setColorA(c.id)}
                />
              ))}
            </div>
            <div className={estilos.colores}>
              {COLORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Complementario ${c.nombre}`}
                  aria-pressed={colorB === c.id}
                  style={{ '--m': c.matiz } as CSSProperties}
                  onClick={() => setColorB(c.id)}
                />
              ))}
            </div>
          </fieldset>
          <label className={estilos.deslizador}>
            Etapa ({etapa.toFixed(1)}): {['Origen', 'Descubrimiento', 'Reconocimiento', 'Transformación', 'Mi AURA'][Math.round(etapa)]}
            <input type="range" min={0} max={4} step={0.1} value={etapa} onChange={(e) => setEtapa(Number(e.target.value))} />
          </label>
        </form>
      )}
    </div>
  );
}

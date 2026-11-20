import { useId } from 'react';
import { cx } from '../../../lib/cx.ts';
import { Icono } from '../Icono/Icono.tsx';
import estilos from './Progreso.module.css';

interface BarraProgresoProps {
  etiqueta: string;
  valor: number;
  max?: number;
  /** Texto del valor; por defecto, porcentaje. */
  textoValor?: string;
}

export function BarraProgreso({ etiqueta, valor, max = 100, textoValor }: BarraProgresoProps) {
  const id = useId();
  const acotado = Math.min(Math.max(valor, 0), max);
  const porcentaje = max > 0 ? Math.round((acotado / max) * 100) : 0;
  const texto = textoValor ?? `${porcentaje} %`;
  return (
    <div className={estilos.barra}>
      <div className={estilos.cabecera}>
        <span id={id}>{etiqueta}</span>
        <span className={estilos.valor}>{texto}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={acotado}
        aria-valuetext={texto}
        className={estilos.pista}
      >
        <div className={estilos.relleno} style={{ transform: `scaleX(${porcentaje / 100})` }} />
      </div>
    </div>
  );
}

/** Estados de un paso. No hay "atrasado" ni "fallido": AURA no penaliza. */
export type EstadoPaso = 'sin-empezar' | 'en-curso' | 'explorado';

const textoEstado: Record<EstadoPaso, string> = {
  'sin-empezar': 'Aún no exploras este paso',
  'en-curso': 'En curso',
  explorado: 'Explorado',
};

interface Paso {
  id: string;
  titulo: string;
  estado: EstadoPaso;
}

export function PasosProgreso({ etiqueta, pasos }: { etiqueta: string; pasos: Paso[] }) {
  return (
    <ol className={estilos.pasos} aria-label={etiqueta}>
      {pasos.map((paso) => (
        <li
          key={paso.id}
          className={cx(estilos.paso, estilos[paso.estado])}
          aria-current={paso.estado === 'en-curso' ? 'step' : undefined}
        >
          <span className={estilos.marcador} aria-hidden="true">
            {paso.estado === 'explorado' && <Icono nombre="check" tamano={14} />}
          </span>
          <span className={estilos.pasoTexto}>
            <span className={estilos.pasoTitulo}>{paso.titulo}</span>
            <span className={estilos.pasoEstado}>{textoEstado[paso.estado]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

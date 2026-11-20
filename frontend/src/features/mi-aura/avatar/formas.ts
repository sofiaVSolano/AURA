// Geometría del personaje (viewBox 0 0 200 220). Variantes controladas: cada
// forma y expresión comparte proporciones, así ninguna combinación se rompe.
import type { IdExpresion, IdForma } from '../dominio/modelo.ts';

/** Centro de la cabeza (la esfera original). */
export const CABEZA = { x: 100, y: 96, r: 46 };

export const CUERPOS: Record<IdForma, string> = {
  gota: 'M100 122 C128 132 150 162 144 186 C138 206 62 206 56 186 C50 162 72 132 100 122 Z',
  nube: 'M60 200 C40 198 38 170 58 165 C55 143 80 132 100 140 C120 132 145 143 142 165 C162 170 160 198 140 200 Z',
  brote: 'M100 124 C124 128 138 154 136 180 C134 200 118 208 100 208 C82 208 66 200 64 180 C62 154 76 128 100 124 Z',
  piedra: 'M58 172 C56 144 80 128 104 130 C132 132 148 152 144 178 C140 200 120 208 98 208 C74 208 59 196 58 172 Z',
};

/** Detalle propio de cada forma (aparece en Transformación). */
export const DETALLE_FORMA: Record<IdForma, string> = {
  gota: 'M100 46 C104 38 110 34 116 34 C112 40 108 46 100 52 Z',
  nube: 'M70 60 C66 52 74 46 80 50 C82 44 92 44 92 52 C86 54 76 58 70 60 Z',
  brote: 'M100 52 C100 40 96 32 88 28 C92 38 94 46 100 52 Z M100 52 C102 40 110 32 120 32 C114 40 108 48 100 52 Z',
  piedra: 'M122 58 C130 56 136 62 134 70 C128 68 124 64 122 58 Z',
};

/** Ojos abiertos (círculos con pupilas que siguen al puntero) o cerrados (arcos). */
export const OJOS: Record<IdExpresion, { tipo: 'abiertos'; radio: number } | { tipo: 'arcos'; d: string }> = {
  serena: { tipo: 'arcos', d: 'M80 94 Q87 99 94 94 M106 94 Q113 99 120 94' },
  curiosa: { tipo: 'abiertos', radio: 6.5 },
  alegre: { tipo: 'abiertos', radio: 5.5 },
  pensativa: { tipo: 'abiertos', radio: 5 },
};

export const BOCAS: Record<IdExpresion, string> = {
  serena: 'M93 110 Q100 115 107 110',
  curiosa: 'M97 111 Q100 116 103 111 Q100 108 97 111 Z',
  alegre: 'M89 107 Q100 120 111 107 Q100 112 89 107 Z',
  pensativa: 'M94 112 Q101 109 108 112',
};

export const ESTRELLA = 'M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z';
export const HOJA = 'M0 0 C6 -10 18 -12 24 -8 C18 0 8 4 0 0 Z';

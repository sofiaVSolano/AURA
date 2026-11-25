// Geometría del personaje (viewBox 0 0 200 220). Variantes controladas: cada
// forma y expresión comparte proporciones, así ninguna combinación se rompe.
import type { IdExpresion, IdForma } from '../dominio/modelo.ts';

/** Centro de la cabeza (la esfera original). */
export const CABEZA = { x: 100, y: 96, r: 46 };

export const CUERPOS: Record<IdForma, string> = {
  gota: 'M100 122 C128 132 150 162 144 186 C138 206 62 206 56 186 C50 162 72 132 100 122 Z',
  nube: 'M60 200 C40 198 38 170 58 165 C55 143 80 132 100 140 C120 132 145 143 142 165 C162 170 160 198 140 200 Z',
  brote: 'M100 124 C124 128 138 154 136 180 C134 200 118 208 100 208 C82 208 66 200 64 180 C62 154 76 128 100 124 Z',
  piedra: 'M48 182 C46 156 74 140 102 140 C134 140 156 158 152 182 C148 202 124 208 100 208 C72 208 50 200 48 182 Z',
};

/** Detalle propio de cada forma (aparece en Transformación). */
export const DETALLE_FORMA: Record<IdForma, string> = {
  gota: 'M96 52 C96 40 106 30 120 24 C116 36 112 46 106 53 C103 54 99 54 96 52 Z',
  nube: 'M68 66 C60 58 68 46 80 52 C82 40 98 36 104 48 C112 40 128 46 126 58 C136 60 134 70 128 70 C110 60 88 58 68 66 Z',
  brote: 'M100 52 C100 38 94 28 80 24 C84 38 92 48 100 52 Z M100 52 C102 38 112 28 128 28 C120 40 110 48 100 52 Z',
  piedra: 'M122 58 C130 56 136 62 134 70 C128 68 124 64 122 58 Z',
};

/** Ojos abiertos (círculos con pupilas que siguen al puntero) o cerrados (arcos). */
export const OJOS: Record<IdExpresion, { tipo: 'abiertos'; radio: number } | { tipo: 'arcos'; d: string }> = {
  serena: { tipo: 'arcos', d: 'M80 94 Q87 99 94 94 M106 94 Q113 99 120 94' },
  curiosa: { tipo: 'abiertos', radio: 7 },
  // Alegre: ojos felices (^ ^)
  alegre: { tipo: 'arcos', d: 'M80 96 Q87 87 94 96 M106 96 Q113 87 120 96' },
  pensativa: { tipo: 'abiertos', radio: 5 },
  tierna: { tipo: 'abiertos', radio: 6.2 },
  decidida: { tipo: 'abiertos', radio: 5.5 },
};

/** Cejas: lo que más distingue una expresión de otra. */
export const CEJAS: Record<IdExpresion, string> = {
  serena: 'M79 83 Q86 81 93 83 M107 83 Q114 81 121 83',
  curiosa: 'M79 78 Q86 72 93 76 M107 76 Q114 72 121 78',
  alegre: 'M79 82 Q86 77 93 80 M107 80 Q114 77 121 82',
  pensativa: 'M79 80 Q86 75 93 80 M107 85 Q114 84 121 85',
  tierna: 'M80 84 Q86 82 93 79 M107 79 Q114 82 120 84',
  decidida: 'M80 80 Q87 81 94 84 M106 84 Q113 81 120 80',
};

export const BOCAS: Record<IdExpresion, string> = {
  serena: 'M93 110 Q100 115 107 110',
  curiosa: 'M96.5 111 Q100 118 103.5 111 Q100 106 96.5 111 Z',
  alegre: 'M87 106 Q100 124 113 106 Q100 111 87 106 Z',
  pensativa: 'M99 112 Q104 111 110 108',
  tierna: 'M94 110 Q97 114 100 110 Q103 114 106 110',
  decidida: 'M93 111 Q101 115 109 108',
};

export const ESTRELLA = 'M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z';
export const HOJA = 'M0 0 C6 -10 18 -12 24 -8 C18 0 8 4 0 0 Z';

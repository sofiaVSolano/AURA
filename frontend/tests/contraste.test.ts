// Valida el contraste WCAG 2.2 AA de los pares de color reales de cada ámbito,
// leyendo directamente tokens.css y themes.css (sin duplicar valores).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const sinComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function propiedades(cuerpo: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of cuerpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) mapa.set(m[1]!, m[2]!.trim());
  return mapa;
}

const primitivos = propiedades(sinComentarios(leer('../src/design-system/styles/tokens.css')));

const temas = new Map<string, Map<string, string>>();
for (const m of sinComentarios(leer('../src/design-system/styles/themes.css')).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const props = propiedades(m[2]!);
  for (const sel of m[1]!.split(',')) {
    const ambito = /data-ambito='([\w-]+)'/.exec(sel)?.[1];
    if (ambito) temas.set(ambito, props);
  }
}

function resolver(valor: string, tema: Map<string, string>, profundidad = 0): string {
  assert.ok(profundidad < 10, `referencia circular en ${valor}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(valor)?.[1];
  if (!ref) return valor;
  const siguiente = tema.get(ref) ?? primitivos.get(ref);
  assert.ok(siguiente, `token no definido: ${ref}`);
  return resolver(siguiente, tema, profundidad + 1);
}

function luminancia(hex: string): number {
  assert.match(hex, /^#[0-9a-f]{6}$/i, `color no es hex sólido: ${hex}`);
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

// [primer plano, fondo, mínimo]
const TEXTO = 4.5;
const UI = 3;
const pares: Array<[string, string, number]> = [
  ['--color-texto', '--color-fondo', TEXTO],
  ['--color-texto', '--color-superficie', TEXTO],
  ['--color-texto', '--color-superficie-2', TEXTO],
  ['--color-texto-suave', '--color-fondo', TEXTO],
  ['--color-texto-suave', '--color-superficie', TEXTO],
  ['--color-texto-suave', '--color-superficie-2', TEXTO],
  ['--color-acento-texto', '--color-fondo', TEXTO],
  ['--color-acento-texto', '--color-superficie', TEXTO],
  ['--color-acento-texto', '--color-acento-suave', TEXTO],
  ['--color-sobre-acento', '--color-acento', TEXTO],
  ['--color-sobre-acento', '--color-acento-hover', TEXTO],
  ['--color-texto', '--color-resalte', TEXTO],
  ['--color-foco', '--color-fondo', UI],
  ['--color-foco', '--color-superficie', UI],
  ['--color-borde-control', '--color-superficie', UI],
  ['--color-borde-control', '--color-fondo', UI],
  ['--color-acento', '--color-superficie', UI],
  ['--color-exito', '--color-exito-fondo', TEXTO],
  ['--color-aviso', '--color-aviso-fondo', TEXTO],
  ['--color-error', '--color-error-fondo', TEXTO],
  ['--color-info', '--color-info-fondo', TEXTO],
  ['--color-error', '--color-superficie', TEXTO],
];

test('se definen los cuatro ámbitos', () => {
  assert.deepEqual([...temas.keys()].sort(), ['academico', 'emocional', 'inicio', 'mi-aura']);
});

for (const [ambito, tema] of temas) {
  test(`contraste AA en el ámbito "${ambito}"`, () => {
    const fallos: string[] = [];
    for (const [fg, bg, minimo] of pares) {
      const valorFg = tema.get(fg);
      const valorBg = tema.get(bg);
      assert.ok(valorFg && valorBg, `${ambito}: falta ${valorFg ? bg : fg}`);
      const ratio = contraste(resolver(valorFg, tema), resolver(valorBg, tema));
      if (ratio < minimo) fallos.push(`${fg} sobre ${bg}: ${ratio.toFixed(2)} < ${minimo}`);
    }
    assert.deepEqual(fallos, []);
  });
}

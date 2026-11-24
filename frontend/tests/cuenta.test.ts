import { test } from 'node:test';
import assert from 'node:assert/strict';
import { informeHtml, type Nombres } from '../src/features/cuenta/informeDatos.ts';

const nombres: Nombres = {
  video: (id) => (id === 'emocional.tengo-miedo.hablar-en-publico' ? 'Hablar en público (Tengo miedo)' : undefined),
  tema: (id) => (id === 'pregunta' ? 'La pregunta de investigación' : undefined),
  actividad: (c) => (c === 'lab-pregunta/ordenar' ? 'Ordena las partes · Laboratorio de la pregunta' : undefined),
  etapa: 'Descubrimiento',
  opcion: (g, id) => ({ color: { morado: 'Morado', cielo: 'Cielo' }, forma: { gota: 'Gota' }, expresion: { tierna: 'Tierna' }, momento: {}, experiencia: { 'contenido-explorado': 'Explorar un contenido' } })[g][id as never],
};

export const EJEMPLO = {
  exportado: '2026-11-23T15:00:00.000Z',
  cuenta: { correo: 'ana@aura.test', creado: '2026-10-01T10:00:00.000Z', consentimiento_version: '2', consentimiento_fecha: '2026-10-01T10:00:00.000Z' },
  datos: {
    'mi-aura': {
      version: 1,
      preferencias: { nombre: 'Lumi', colorPrincipal: 'morado', colorComplementario: 'cielo', forma: 'gota', expresion: 'tierna', decoraciones: [] },
      onboarding: { completado: true, momentoProyecto: null, fechaInicio: '2026-10-02T10:00:00.000Z' },
      experiencias: [{ id: 'e1', tipo: 'contenido-explorado', dimension: 'emocional', refId: 'video:emocional.tengo-miedo.hablar-en-publico', fecha: '2026-10-03T10:00:00.000Z' }],
    },
    emocional: {
      version: 1,
      guardados: ['emocional.tengo-miedo.hablar-en-publico'],
      vistos: { 'emocional.tengo-miedo.hablar-en-publico': { fraccion: 0.42, completado: false } },
      aprendizajes: [{ id: 'a1', videoId: 'emocional.tengo-miedo.hablar-en-publico', texto: 'Respirar <antes> de hablar & "ensayar"', fecha: '2026-10-03T10:00:00.000Z' }],
    },
    academica: { version: 1, temas: { pregunta: 'explorado' }, avances: [], actividades: { 'lab-pregunta/ordenar': '2026-10-04T10:00:00.000Z' } },
  },
};

test('exportación legible: nombres de personas, no ids técnicos', () => {
  const html = informeHtml(EJEMPLO, nombres);
  assert.match(html, /<title>Tus datos en AURA<\/title>/);
  assert.match(html, /Lumi/);
  assert.match(html, /Morado y Cielo/);
  assert.match(html, /Tierna/);
  assert.match(html, /Etapa actual/);
  assert.match(html, /Hablar en público \(Tengo miedo\)/);
  assert.match(html, /42 % visto/);
  assert.match(html, /La pregunta de investigación/);
  assert.match(html, /Ya lo exploré/);
  assert.match(html, /Ordena las partes/);
  assert.match(html, /Imprimir o guardar como PDF/);
  assert.doesNotMatch(html, /contenido-explorado|"fraccion"|lab-pregunta\/ordenar/);
});

test('exportación legible: el texto escrito por la persona se escapa', () => {
  const html = informeHtml(EJEMPLO, nombres);
  assert.match(html, /Respirar &lt;antes&gt; de hablar &amp; &quot;ensayar&quot;/);
  assert.doesNotMatch(html, /<antes>/);
});

test('exportación legible: sin datos, mensajes amables en lugar de secciones vacías', () => {
  const html = informeHtml({ exportado: '2026-11-23T15:00:00.000Z', cuenta: {}, datos: {} }, nombres);
  assert.match(html, /Todavía no le has dado vida a tu AURA/);
  assert.match(html, /No has guardado videos/);
  assert.match(html, /No has marcado temas/);
  assert.equal(informeHtml(null, nombres).includes('Tus datos en AURA'), true);
});

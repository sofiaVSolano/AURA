import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  contarPalabras,
  evaluarClasificar,
  evaluarElegir,
  evaluarMarcar,
  evaluarOrdenar,
  evaluarRespuestaSimulador,
} from '../src/features/academica/dominio/evaluar.ts';
import {
  agregarAvance,
  completarActividad,
  ESTADO_ACADEMICO_INICIAL as A0,
  marcarTema,
  validarEstadoAcademico,
} from '../src/features/academica/dominio/estadoAcademico.ts';
import type { Actividad, Guia, Laboratorio, Ruta } from '../src/features/academica/dominio/modelo.ts';
import { validarGuia, validarLaboratorio, validarRuta } from '../src/features/academica/dominio/validar.ts';

const raiz = fileURLToPath(new URL('../../content/', import.meta.url));
const json = (r: string): unknown => JSON.parse(readFileSync(raiz + r, 'utf8'));
const ids = (dir: string) => readdirSync(raiz + dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

function cargarTodo() {
  const rutas = ids('academica/rutas').map((id) => validarRuta(json(`academica/rutas/${id}.json`), id));
  const guias = ids('academica/temas').map((id) => validarGuia(json(`academica/temas/${id}.json`), id));
  const labs = ids('academica/laboratorios').map((id) => validarLaboratorio(json(`academica/laboratorios/${id}.json`), id));
  return { rutas, guias, labs };
}

test('todas las rutas, guías y laboratorios son válidos', () => {
  const { rutas, guias, labs } = cargarTodo();
  const errores = [...rutas, ...guias, ...labs].flatMap((r) => (r.ok ? [] : r.errores));
  assert.deepEqual(errores, []);
  assert.ok(ids('academica/rutas').includes('general'), 'existe la ruta general');
});

test('referencias cruzadas coherentes (guías ↔ ruta ↔ laboratorios)', () => {
  const { rutas, guias, labs } = cargarTodo();
  const general = rutas.find((r) => r.ok && r.valor.id === 'general');
  assert.ok(general?.ok);
  const temasRuta = new Set((general.valor as Ruta).etapas.flatMap((e) => e.temas.map((t) => t.id)));
  const labIds = new Set(labs.flatMap((l) => (l.ok ? [l.valor.id] : [])));
  for (const g of guias) {
    if (!g.ok) continue;
    const guia = g.valor as Guia;
    assert.ok(temasRuta.has(guia.id), `la guía "${guia.id}" está en la ruta`);
    if (guia.laboratorio) assert.ok(labIds.has(guia.laboratorio), `${guia.id}: laboratorio "${guia.laboratorio}" existe`);
    for (const r of guia.relacionados) assert.ok(temasRuta.has(r), `${guia.id}: relacionado "${r}" existe en la ruta`);
  }
  for (const l of labs) {
    if (l.ok && (l.valor as Laboratorio).tema) assert.ok(temasRuta.has((l.valor as Laboratorio).tema!), `${l.valor.id}: tema existe`);
  }
  assert.equal(general.valor.etapas.length, 5, 'la ruta inicial tiene 5 etapas');
});

test('cada tema de la ruta general tiene su carpeta de video académico (y no hay huérfanas)', () => {
  const general = validarRuta(json('academica/rutas/general.json'), 'general');
  assert.ok(general.ok);
  const esperadas = general.valor.etapas.flatMap((e) => e.temas.map((t) => `${e.id}/${t.id}`)).sort();
  const enDisco = readdirSync(raiz + 'videos/academico', { recursive: true, encoding: 'utf8' })
    .map((r) => r.replaceAll('\\', '/'))
    .filter((r) => r.endsWith('/metadata.json'))
    .map((r) => r.replace(/\/metadata\.json$/, ''))
    .sort();
  assert.deepEqual(enDisco, esperadas);
  for (const c of enDisco) for (const f of ['script.md', 'storyboard.md', 'animation.md']) assert.ok(existsSync(`${raiz}videos/academico/${c}/${f}`));
});

const ordenar: Extract<Actividad, { tipo: 'ordenar' }> = {
  tipo: 'ordenar', id: 'o', titulo: 't', consigna: 'c',
  items: [{ id: 'a', texto: 'A', pista: 'pista A' }, { id: 'b', texto: 'B', pista: 'pista B' }, { id: 'c', texto: 'C', pista: 'pista C' }],
  ordenEsperado: ['a', 'b', 'c'],
};

test('ordenar: retroalimentación por posición, con pistas (sin nota)', () => {
  const bien = evaluarOrdenar(ordenar, ['a', 'b', 'c']);
  assert.equal(bien.logrados, 3);
  const r = evaluarOrdenar(ordenar, ['b', 'a', 'c']);
  assert.equal(r.logrados, 1);
  assert.equal(r.items.find((i) => i.id === 'b')?.mensaje, 'pista B');
  assert.match(r.sugerencia, /pistas/);
});

test('clasificar, elegir y marcar explican cómo mejorar', () => {
  const clas: Extract<Actividad, { tipo: 'clasificar' }> = {
    tipo: 'clasificar', id: 'c', titulo: 't', consigna: 'c',
    categorias: [{ id: 'x', nombre: 'Equis' }, { id: 'y', nombre: 'Ye' }],
    items: [{ id: 'i1', texto: 't', categoria: 'x', explicacion: 'Es equis porque…' }],
  };
  const rc = evaluarClasificar(clas, { i1: 'y' });
  assert.equal(rc.items[0]?.estado, 'revisar');
  assert.match(rc.items[0]!.mensaje, /Lo ubicaste en «Ye»\. Es equis porque/);

  const eleg: Extract<Actividad, { tipo: 'elegir' }> = {
    tipo: 'elegir', id: 'e', titulo: 't', consigna: 'c',
    preguntas: [{ id: 'p', enunciado: '?', opciones: [{ id: 'a', texto: 'Conocer', adecuada: false, explicacion: 'No verificable.' }, { id: 'b', texto: 'Describir', adecuada: true, explicacion: 'Verificable.' }] }],
  };
  assert.match(evaluarElegir(eleg, { p: 'a' }).items[0]!.mensaje, /Compara con: «Describir»/);
  assert.equal(evaluarElegir(eleg, { p: null }).items[0]!.estado, 'revisar');

  const marc: Extract<Actividad, { tipo: 'marcar' }> = {
    tipo: 'marcar', id: 'm', titulo: 't', consigna: 'c',
    items: [{ id: 's', texto: 'Sí', marcar: true, explicacion: 'Falta.' }, { id: 'n', texto: 'No', marcar: false, explicacion: 'Está.' }],
  };
  const rm = evaluarMarcar(marc, new Set(['n']));
  assert.deepEqual(rm.items.map((i) => [i.id, i.estado]), [['s', 'revisar'], ['n', 'revisar']]);
  assert.equal(evaluarMarcar(marc, new Set(['s'])).logrados, 1);
});

test('simulador: detecta aspectos presentes, sugiere los ausentes y estima el tiempo', () => {
  const p = { id: 'x', categoria: 'Metodología', texto: '¿Por qué?', claves: [
    { descripcion: 'la razón', sugerencia: 'Explica por qué.', palabras: ['porque'] },
    { descripcion: 'alternativas', sugerencia: 'Menciona alternativas.', palabras: ['alternativa', 'descart'] },
  ] };
  const corta = evaluarRespuestaSimulador(p, 'Porque sí.', 75);
  assert.match(corta.sugerencia, /muy breve/);
  const larga = 'Elegí un enfoque mixto porque mi pregunta necesitaba medir y comprender a la vez. ' .repeat(6) + 'Descarté una encuesta sola.';
  const r = evaluarRespuestaSimulador(p, larga, 75);
  assert.equal(r.logrados, 2);
  assert.ok(contarPalabras(larga) > 25);
  assert.match(r.sugerencia, /tomaría unos \d+ s/);
  assert.match(evaluarRespuestaSimulador(p, larga, 300).sugerencia, /espacio para desarrollarla/, 'compara con el tiempo sugerido');
  const sinTildes = evaluarRespuestaSimulador({ ...p, claves: [{ descripcion: 'x', sugerencia: 'y', palabras: ['opción'] }] }, 'otra OPCION distinta', 75);
  assert.equal(sinTildes.logrados, 1, 'ignora tildes y mayúsculas');
});

test('estado académico: ruta flexible, actividades una vez, avances validados', () => {
  let e = marcarTema(A0, 'resumen', 'explorado');
  e = marcarTema(e, 'problema', 'en-curso');
  assert.deepEqual(Object.keys(marcarTema(e, 'resumen', null).temas), ['problema'], 'desmarcar no penaliza, solo reorganiza');
  const c1 = completarActividad(e, 'resumen/ordenar-fragmentos', '2026-11-20T10:00:00.000Z');
  assert.equal(c1.nueva, true);
  assert.equal(completarActividad(c1.estado, 'resumen/ordenar-fragmentos', '2026-11-21T10:00:00.000Z').nueva, false);
  assert.equal(agregarAvance(A0, { id: 'av-00000001', temaId: 'resumen', texto: '  ', fecha: '2026-11-20T10:00:00.000Z' }).ok, false);
  const v = validarEstadoAcademico({ version: 1, temas: { resumen: 'explorado', X: 'otro' }, actividades: { 'a/b': '2026-11-20T10:00:00.000Z', malo: 'x' }, avances: [{ id: 'x' }] });
  assert.ok(v.ok);
  assert.deepEqual(v.valor.temas, { resumen: 'explorado' });
  assert.deepEqual(Object.keys(v.valor.actividades), ['a/b']);
  assert.equal(v.valor.avances.length, 0);
});

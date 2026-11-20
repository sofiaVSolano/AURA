import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siguienteSubtema, unirConVideos, validarCategorias } from '../src/features/emocional/dominio/categorias.ts';
import {
  agregarAprendizaje,
  alternarGuardado,
  borrarAprendizaje,
  ESTADO_EMOCIONAL_INICIAL as E0,
  registrarAvance,
  validarEstadoEmocional,
} from '../src/features/emocional/dominio/estadoEmocional.ts';

const V = 'emocional.tengo-miedo.hablar-en-publico';

test('guardar y quitar de guardados', () => {
  const g = alternarGuardado(E0, V);
  assert.deepEqual(g.guardados, [V]);
  assert.deepEqual(alternarGuardado(g, V).guardados, []);
  assert.equal(alternarGuardado(E0, 'javascript:alert(1)'), E0);
});

test('el progreso visto nunca retrocede y completa al 90 %', () => {
  let r = registrarAvance(E0, V, 0.5);
  assert.equal(r.recienCompletado, false);
  r = registrarAvance(r.estado, V, 0.2);
  assert.equal(r.estado.vistos[V]?.fraccion, 0.5);
  r = registrarAvance(r.estado, V, 0.92);
  assert.equal(r.recienCompletado, true);
  assert.equal(registrarAvance(r.estado, V, 1).recienCompletado, false, 'solo se completa una vez');
});

test('aprendizajes: validación, guardado y borrado', () => {
  const malo = agregarAprendizaje(E0, { id: 'apr-00000001', videoId: V, texto: '   ', fecha: '2026-11-20T10:00:00.000Z' });
  assert.equal(malo.ok, false);
  const bueno = agregarAprendizaje(E0, { id: 'apr-00000001', videoId: V, texto: '  Respirar antes de hablar me ayuda.  ', fecha: '2026-11-20T10:00:00.000Z' });
  assert.ok(bueno.ok);
  assert.equal(bueno.valor.aprendizajes[0]?.texto, 'Respirar antes de hablar me ayuda.');
  assert.equal(borrarAprendizaje(bueno.valor, 'apr-00000001').aprendizajes.length, 0);
});

test('normaliza datos guardados manipulados', () => {
  const r = validarEstadoEmocional({
    version: 1,
    guardados: [V, V, 'malo'],
    vistos: { [V]: { fraccion: 0.95 }, otro: { fraccion: 2 } },
    aprendizajes: [{ id: 'x', videoId: V, texto: 'a', fecha: 'no' }],
  });
  assert.ok(r.ok);
  assert.deepEqual(r.valor.guardados, [V]);
  assert.deepEqual(Object.keys(r.valor.vistos), [V]);
  assert.equal(r.valor.vistos[V]?.completado, true);
  assert.equal(r.valor.aprendizajes.length, 0);
});

test('categorías: validación, unión con videos y siguiente subtema', () => {
  const cat = {
    version: 1,
    pregunta: '¿Cómo te sientes hoy?',
    categorias: [{ id: 'a', nombre: 'A', descripcion: 'd', matiz: 10, relacionadas: [], subtemas: [{ id: 's1', titulo: 'S1' }, { id: 's2', titulo: 'S2' }] }],
  };
  const r = validarCategorias(cat);
  assert.ok(r.ok);
  assert.equal(validarCategorias({ ...cat, categorias: [{ ...cat.categorias[0], relacionadas: ['zzz'] }] }).ok, false);
  const unido = unirConVideos(r.valor, [], () => true).get('a')!;
  assert.equal(unido[0]?.disponible, false, 'sin video no hay nada disponible');
  assert.equal(siguienteSubtema(unido, 's2')?.id, 's1');
});

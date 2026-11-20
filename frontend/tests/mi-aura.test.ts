import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEvolucion, experienciasSignificativas } from '../src/features/mi-aura/dominio/evolucion.ts';
import type { Experiencia, TipoExperiencia } from '../src/features/mi-aura/dominio/modelo.ts';
import { TIPOS_EXPERIENCIA } from '../src/features/mi-aura/dominio/modelo.ts';
import { validarEstadoAura, validarNombre } from '../src/features/mi-aura/dominio/validar.ts';

let n = 0;
function exp(tipo: TipoExperiencia, refId: string, dia: number, dimension?: 'emocional' | 'academica'): Experiencia {
  n++;
  return {
    id: `exp-prueba-${String(n).padStart(4, '0')}`,
    tipo,
    dimension: dimension ?? TIPOS_EXPERIENCIA[tipo].dimension ?? 'emocional',
    refId,
    fecha: new Date(Date.UTC(2026, 10, dia, 12)).toISOString(),
  };
}

test('sin experiencias, tu AURA está en Origen', () => {
  const ev = calcularEvolucion([]);
  assert.equal(ev.etapa.id, 'origen');
  assert.equal(ev.progreso?.siguiente.id, 'descubrimiento');
  assert.equal(ev.reposo, false);
});

test('repetir el mismo contenido no suma (no se premian clics)', () => {
  const repetidas = Array.from({ length: 20 }, (_, i) => exp('contenido-explorado', 'video:respirar', 1 + (i % 5)));
  assert.equal(experienciasSignificativas(repetidas).length, 1);
  assert.equal(calcularEvolucion(repetidas).etapa.id, 'origen');
});

test('las etapas avanzan con cantidad y diversidad de experiencias', () => {
  const cinco = [1, 2, 3, 4, 5].map((i) => exp('contenido-explorado', `guia:${i}`, i, 'academica'));
  // 5 experiencias de un solo tipo: Descubrimiento, no Reconocimiento (falta diversidad)
  assert.equal(calcularEvolucion(cinco).etapa.id, 'descubrimiento');
  const conReflexion = [...cinco, exp('reflexion-registrada', 'reflexion:1', 6)];
  assert.equal(calcularEvolucion(conReflexion).etapa.id, 'reconocimiento');
});

test('Mi AURA exige recorrer lo emocional y lo académico', () => {
  const academicas = [
    ...[1, 2, 3, 4, 5].map((i) => exp('ejercicio-completado', `ej:${i}`, i)),
    ...[1, 2, 3, 4, 5].map((i) => exp('avance-academico', `av:${i}`, 5 + i)),
    ...[1, 2, 3, 4].map((i) => exp('sustentacion-practicada', `sus:${i}`, 10 + i)),
  ];
  const ev = calcularEvolucion(academicas);
  assert.equal(ev.etapa.id, 'transformacion');
  assert.equal(ev.progreso?.dimensionPendiente, 'emocional');
  assert.equal(calcularEvolucion([...academicas, exp('reflexion-registrada', 'r:1', 20)]).etapa.id, 'mi-aura');
});

test('las pausas y emociones difíciles nunca restan', () => {
  const base = [1, 2, 3, 4, 5].map((i) => exp('reflexion-registrada', `r:${i}`, i));
  base.push(exp('contenido-explorado', 'video:frustracion', 6, 'emocional'));
  const ahora = calcularEvolucion(base, new Date(Date.UTC(2026, 10, 7)));
  const tresMesesDespues = calcularEvolucion(base, new Date(Date.UTC(2027, 1, 7)));
  assert.equal(tresMesesDespues.etapa.id, ahora.etapa.id);
  assert.equal(tresMesesDespues.desbloqueadas.length, ahora.desbloqueadas.length);
  assert.equal(tresMesesDespues.reposo, true, 'la pausa se representa como reposo, no como pérdida');
});

test('los hitos registran fecha y experiencias que contribuyeron', () => {
  const lista = [exp('sustentacion-practicada', 'sus:1', 3), exp('contenido-explorado', 'v:1', 4, 'emocional')];
  const ev = calcularEvolucion(lista);
  const etapa = ev.hitos.find((h) => h.tipo === 'etapa');
  assert.ok(etapa && etapa.tipo === 'etapa');
  assert.equal(etapa.etapa, 'descubrimiento');
  assert.equal(etapa.contribuciones.length, 2);
  assert.deepEqual(ev.desbloqueadas, ['estrellas']);
});

test('el estado guardado se valida y normaliza (los datos del cliente no son confiables)', () => {
  const r = validarEstadoAura({
    version: 1,
    preferencias: { nombre: '<script>', colorPrincipal: 'rojo-falso', forma: 'nube', decoraciones: ['anillo', 'corona', 'anillo'] },
    onboarding: { completado: true },
    experiencias: [
      exp('ejercicio-completado', 'ej:1', 1),
      { ...exp('ejercicio-completado', 'ej:2', 2), dimension: 'emocional' },
      { tipo: 'clics', refId: 'x' },
    ],
    ultimaEtapaVista: 'inexistente',
  });
  assert.ok(r.ok);
  const { estado, descartadas } = r.valor;
  assert.equal(estado.preferencias.nombre, 'Aura');
  assert.equal(estado.preferencias.colorPrincipal, 'morado');
  assert.equal(estado.preferencias.forma, 'nube');
  assert.deepEqual(estado.preferencias.decoraciones, ['anillo']);
  assert.equal(estado.experiencias.length, 1);
  assert.equal(descartadas, 2);
  assert.equal(estado.ultimaEtapaVista, 'origen');
  assert.equal(validarEstadoAura({ version: 2 }).ok, false);
});

test('validación del nombre del avatar', () => {
  assert.equal(validarNombre('Lumi'), null);
  assert.equal(validarNombre('Ñandú de María'), null);
  assert.notEqual(validarNombre('   '), null);
  assert.notEqual(validarNombre('a'.repeat(25)), null);
  assert.notEqual(validarNombre('<b>hola</b>'), null);
});

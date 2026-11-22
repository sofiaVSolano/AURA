// Valida el esquema de contenidos y TODOS los metadata.json, perfiles y categorías reales del repositorio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { archivosRequeridos } from '../src/content/videos/esquema.ts';
import { estaPublicado, validarMetadatosVideo } from '../src/content/videos/validar.ts';
import { hrefContacto, validarPerfil } from '../src/content/perfiles/validar.ts';
import { idVideo, validarCategorias } from '../src/features/emocional/dominio/categorias.ts';

const raiz = fileURLToPath(new URL('../../content/', import.meta.url));
const leerJson = (ruta: string): unknown => JSON.parse(readFileSync(raiz + ruta, 'utf8'));

const carpeta = 'emocional/tengo-miedo/hablar-en-publico';
const base = {
  version: 2,
  id: 'emocional.tengo-miedo.hablar-en-publico',
  area: 'emocional',
  categoria: 'tengo-miedo',
  subtema: 'hablar-en-publico',
  titulo: 'Hablar en público',
  descripcion: 'Idea principal.',
  estado: 'guion',
  duracionObjetivoSegundos: 45,
  duracionSegundos: null,
  archivos: { video: null, videoAlterno: null, poster: null, subtitulos: {}, transcripcion: null },
  perfiles: ['*'],
  etiquetas: [],
  creditos: [],
  actualizado: '2026-11-20',
};
const completo = {
  ...base,
  estado: 'publicado',
  duracionSegundos: 48,
  perfiles: ['uni-ejemplo'],
  archivos: { video: 'video.mp4', videoAlterno: 'video.webm', poster: 'poster.webp', subtitulos: { es: 'subtitulos.es.vtt' }, transcripcion: 'transcripcion.es.md' },
};

test('acepta metadatos válidos en preparación (no publicados)', () => {
  const r = validarMetadatosVideo(base, carpeta);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(estaPublicado(r.valor, 'default'), false);
});

test('no permite publicar sin video, póster, subtítulos, transcripción y duración', () => {
  const r = validarMetadatosVideo({ ...base, estado: 'publicado' }, carpeta);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.errores.filter((e) => e.includes('publicado:')).length, 5);
});

test('acepta un video publicado completo y lo filtra por perfil', () => {
  const r = validarMetadatosVideo(completo, carpeta);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(estaPublicado(r.valor, 'uni-ejemplo'), true);
  assert.equal(estaPublicado(r.valor, 'otra'), false);
  assert.equal(archivosRequeridos(r.valor).length, 5);
});

test('duración controlada: objetivo 30–360 s y máximo absoluto 360 s', () => {
  assert.equal(validarMetadatosVideo({ ...completo, duracionSegundos: 361 }, carpeta).ok, false);
  assert.equal(validarMetadatosVideo({ ...completo, duracionSegundos: 283 }, carpeta).ok, true);
  assert.equal(validarMetadatosVideo({ ...base, duracionObjetivoSegundos: 25 }, carpeta).ok, false);
  assert.equal(validarMetadatosVideo({ ...base, duracionObjetivoSegundos: 400 }, carpeta).ok, false);
});

test('rechaza rutas con carpetas o "..", formatos no permitidos y carpetas que no coinciden', () => {
  assert.equal(validarMetadatosVideo({ ...base, archivos: { ...base.archivos, video: '../../secreto.mp4' } }, carpeta).ok, false);
  assert.equal(validarMetadatosVideo({ ...base, archivos: { ...base.archivos, video: 'video.mov' } }, carpeta).ok, false);
  assert.equal(validarMetadatosVideo(base, 'emocional/otra/hablar-en-publico').ok, false);
});

const metadatosEnDisco = readdirSync(raiz + 'videos', { recursive: true, encoding: 'utf8' })
  .map((r) => r.replaceAll('\\', '/'))
  .filter((r) => r.endsWith('/metadata.json') && !r.startsWith('_plantilla/'))
  .map((r) => r.replace(/\/metadata\.json$/, ''));

test('todos los metadata.json del repositorio son válidos', () => {
  assert.ok(metadatosEnDisco.length > 0, 'no se encontraron metadatos');
  const errores = metadatosEnDisco.flatMap((c) => {
    const res = validarMetadatosVideo(leerJson(`videos/${c}/metadata.json`), c);
    return res.ok ? [] : res.errores;
  });
  assert.deepEqual(errores, []);
});

test('solo se publican videos cuyos archivos existen realmente', () => {
  const faltantes = metadatosEnDisco.flatMap((c) => {
    const res = validarMetadatosVideo(leerJson(`videos/${c}/metadata.json`), c);
    if (!res.ok || res.valor.estado !== 'publicado') return [];
    return archivosRequeridos(res.valor)
      .filter((a) => !existsSync(`${raiz}videos/${c}/${a}`))
      .map((a) => `${c}/${a}`);
  });
  assert.deepEqual(faltantes, []);
});

test('AURA emocional: 7 categorías × 4 subtemas, cada uno con su carpeta de video', () => {
  const r = validarCategorias(leerJson('emocional/categorias.json'));
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.valor.categorias.length, 7);
  for (const c of r.valor.categorias) assert.equal(c.subtemas.length, 4, c.id);
  const esperadas = r.valor.categorias.flatMap((c) => c.subtemas.map((s) => idVideo(c.id, s.id).replaceAll('.', '/')));
  const emocionales = metadatosEnDisco.filter((c) => c.startsWith('emocional/'));
  assert.deepEqual([...emocionales].sort(), [...esperadas].sort(), 'cada subtema tiene una carpeta y no hay carpetas huérfanas');
  for (const c of emocionales) {
    for (const f of ['script.md', 'storyboard.md', 'animation.md']) assert.ok(existsSync(`${raiz}videos/${c}/${f}`), `${c}/${f}`);
  }
});

test('todos los perfiles institucionales son válidos', () => {
  const perfiles = readdirSync(raiz + 'perfiles').filter((f) => f.endsWith('.json'));
  assert.ok(perfiles.includes('default.json'));
  for (const f of perfiles) {
    const r = validarPerfil(leerJson('perfiles/' + f), f.replace(/\.json$/, ''));
    assert.ok(r.ok, JSON.stringify(r));
  }
});

test('los contactos solo admiten https, correo o teléfono (nunca javascript:)', () => {
  const perfil = (contacto: unknown) => ({
    version: 1,
    id: 'prueba',
    nombre: 'Prueba',
    institucion: null,
    recursos: { introduccion: null, contactos: [contacto] },
    proyecto: { nombreTrabajo: null, ruta: 'general' },
  });
  const web = { nombre: 'X', descripcion: 'Y', tipo: 'web', valor: 'javascript:alert(1)', horario: null };
  assert.equal(validarPerfil(perfil(web), 'prueba').ok, false);
  assert.equal(validarPerfil(perfil({ ...web, valor: 'http://inseguro.example' }), 'prueba').ok, false);
  assert.equal(validarPerfil(perfil({ ...web, valor: 'https://bienestar.example' }), 'prueba').ok, true);
  assert.equal(hrefContacto('telefono', '+57 (1) 234-5678'), 'tel:+5712345678');
});

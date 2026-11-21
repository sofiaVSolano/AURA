// Validación de ruta, guías y laboratorios. Pura; errores con ruta del campo.
import { exito, fallo, type Result } from '../../../lib/result.ts';
import { esListaDe, esRegistro, esSlug, esTexto, esUno } from '../../../lib/validacion.ts';
import { TIPOS_ACTIVIDAD, type Guia, type Laboratorio, type Ruta } from './modelo.ts';

type Errores = string[];
const texto = (e: Errores, v: unknown, campo: string, max = 4000) => {
  if (!esTexto(v, max)) e.push(`${campo}: texto obligatorio (máx. ${max})`);
};
const slug = (e: Errores, v: unknown, campo: string) => {
  if (!esSlug(v)) e.push(`${campo}: debe ser kebab-case`);
};
const lista = (e: Errores, v: unknown, campo: string, cada: (x: unknown, c: string) => void, minimo = 1) => {
  if (!Array.isArray(v) || v.length < minimo) return void e.push(`${campo}: lista con al menos ${minimo} elemento(s)`);
  v.forEach((x, i) => cada(x, `${campo}[${i}]`));
};
const objeto = (e: Errores, v: unknown, campo: string, campos: Record<string, number>) => {
  if (!esRegistro(v)) return void e.push(`${campo}: debe ser un objeto`);
  for (const [k, max] of Object.entries(campos)) texto(e, v[k], `${campo}.${k}`, max);
};
const unicos = (e: Errores, ids: unknown[], campo: string) => {
  if (new Set(ids).size !== ids.length) e.push(`${campo}: ids repetidos`);
};

export function validarRuta(d: unknown, idArchivo: string): Result<Ruta> {
  const e: Errores = [];
  if (!esRegistro(d) || d.version !== 1) return fallo([`${idArchivo}: versión no reconocida (se espera 1)`]);
  if (d.id !== idArchivo) e.push(`id debe ser "${idArchivo}"`);
  texto(e, d.nombre, 'nombre', 80);
  texto(e, d.nota, 'nota', 400);
  lista(e, d.etapas, 'etapas', (et, c) => {
    if (!esRegistro(et)) return void e.push(`${c}: objeto`);
    slug(e, et.id, `${c}.id`);
    texto(e, et.titulo, `${c}.titulo`, 60);
    texto(e, et.descripcion, `${c}.descripcion`, 240);
    lista(e, et.temas, `${c}.temas`, (t, ct) => {
      if (!esRegistro(t)) return void e.push(`${ct}: objeto`);
      slug(e, t.id, `${ct}.id`);
      texto(e, t.titulo, `${ct}.titulo`, 60);
      texto(e, t.resumen, `${ct}.resumen`, 200);
    });
  });
  if (Array.isArray(d.etapas)) {
    unicos(e, d.etapas.map((x) => (esRegistro(x) ? x.id : null)), 'etapas');
    unicos(e, d.etapas.flatMap((x) => (esRegistro(x) && Array.isArray(x.temas) ? x.temas.map((t) => (esRegistro(t) ? t.id : null)) : [])), 'temas');
  }
  return e.length ? fallo(e.map((m) => `${idArchivo}: ${m}`)) : exito(d as unknown as Ruta);
}

export function validarGuia(d: unknown, idArchivo: string): Result<Guia> {
  const e: Errores = [];
  if (!esRegistro(d) || d.version !== 1) return fallo([`${idArchivo}: versión no reconocida (se espera 1)`]);
  if (d.id !== idArchivo) e.push(`id debe ser "${idArchivo}"`);
  texto(e, d.titulo, 'titulo', 60);
  texto(e, d.queEs, 'queEs', 800);
  texto(e, d.paraQueSirve, 'paraQueSirve', 800);
  lista(e, d.queDebeIncluir, 'queDebeIncluir', (x, c) => objeto(e, x, c, { elemento: 60, descripcion: 400 }));
  lista(e, d.comoSeOrganiza, 'comoSeOrganiza', (x, c) => objeto(e, x, c, { paso: 80, descripcion: 400 }));
  if (!esRegistro(d.ejemplo)) e.push('ejemplo: objeto');
  else {
    texto(e, d.ejemplo.contexto, 'ejemplo.contexto', 400);
    lista(e, d.ejemplo.fragmentos, 'ejemplo.fragmentos', (x, c) => objeto(e, x, c, { elemento: 60, texto: 800, explicacion: 400 }));
  }
  lista(e, d.erroresFrecuentes, 'erroresFrecuentes', (x, c) => objeto(e, x, c, { enLugarDe: 300, prueba: 300, porque: 300 }));
  lista(e, d.recomendaciones, 'recomendaciones', (x, c) => texto(e, x, c, 300));
  lista(e, d.dependeDe, 'dependeDe', (x, c) => texto(e, x, c, 300));
  lista(e, d.orientativo, 'orientativo', (x, c) => objeto(e, x, c, { dato: 60, valor: 200 }), 0);
  if (d.laboratorio !== null && !esSlug(d.laboratorio)) e.push('laboratorio: null o id de laboratorio');
  if (!esListaDe(d.relacionados, esSlug)) e.push('relacionados: lista de ids de tema');
  return e.length ? fallo(e.map((m) => `${idArchivo}: ${m}`)) : exito(d as unknown as Guia);
}

export function validarLaboratorio(d: unknown, idArchivo: string): Result<Laboratorio> {
  const e: Errores = [];
  if (!esRegistro(d) || d.version !== 1) return fallo([`${idArchivo}: versión no reconocida (se espera 1)`]);
  if (d.id !== idArchivo) e.push(`id debe ser "${idArchivo}"`);
  texto(e, d.titulo, 'titulo', 80);
  texto(e, d.descripcion, 'descripcion', 300);
  if (d.tema !== null && !esSlug(d.tema)) e.push('tema: null o id de tema');
  lista(e, d.actividades, 'actividades', (a, c) => {
    if (!esRegistro(a)) return void e.push(`${c}: objeto`);
    slug(e, a.id, `${c}.id`);
    texto(e, a.titulo, `${c}.titulo`, 80);
    texto(e, a.consigna, `${c}.consigna`, 400);
    if (!esUno(a.tipo, TIPOS_ACTIVIDAD)) return void e.push(`${c}.tipo: uno de ${TIPOS_ACTIVIDAD.join(', ')}`);
    switch (a.tipo) {
      case 'ordenar': {
        lista(e, a.items, `${c}.items`, (x, ci) => objeto(e, x, ci, { id: 40, texto: 600, pista: 300 }), 2);
        const ids = Array.isArray(a.items) ? a.items.map((x) => (esRegistro(x) ? x.id : null)) : [];
        unicos(e, ids, `${c}.items`);
        if (!Array.isArray(a.ordenEsperado) || [...a.ordenEsperado].sort().join() !== [...ids].sort().join()) {
          e.push(`${c}.ordenEsperado: debe contener exactamente los ids de items`);
        }
        break;
      }
      case 'clasificar': {
        lista(e, a.categorias, `${c}.categorias`, (x, ci) => objeto(e, x, ci, { id: 40, nombre: 60 }), 2);
        const cats = Array.isArray(a.categorias) ? a.categorias.map((x) => (esRegistro(x) ? x.id : null)) : [];
        lista(e, a.items, `${c}.items`, (x, ci) => {
          objeto(e, x, ci, { id: 40, texto: 600, categoria: 40, explicacion: 400 });
          if (esRegistro(x) && !cats.includes(x.categoria)) e.push(`${ci}.categoria: no existe`);
        });
        break;
      }
      case 'elegir':
        lista(e, a.preguntas, `${c}.preguntas`, (p, cp) => {
          objeto(e, p, cp, { id: 40, enunciado: 600 });
          if (!esRegistro(p)) return;
          lista(e, p.opciones, `${cp}.opciones`, (o, co) => {
            objeto(e, o, co, { id: 40, texto: 600, explicacion: 400 });
            if (esRegistro(o) && typeof o.adecuada !== 'boolean') e.push(`${co}.adecuada: booleano`);
          }, 2);
          if (Array.isArray(p.opciones) && !p.opciones.some((o) => esRegistro(o) && o.adecuada === true)) {
            e.push(`${cp}: al menos una opción adecuada`);
          }
        });
        break;
      case 'marcar':
        lista(e, a.items, `${c}.items`, (x, ci) => {
          objeto(e, x, ci, { id: 40, texto: 600, explicacion: 400 });
          if (esRegistro(x) && typeof x.marcar !== 'boolean') e.push(`${ci}.marcar: booleano`);
        }, 2);
        break;
      case 'redactar':
        texto(e, a.elemento, `${c}.elemento`, 60);
        if (typeof a.palabrasMin !== 'number' || typeof a.palabrasMax !== 'number' || a.palabrasMin < 5 || a.palabrasMax < a.palabrasMin || a.palabrasMax > 1500) {
          e.push(`${c}.palabrasMin/palabrasMax: rango válido entre 5 y 1500`);
        }
        break;
      case 'simulador':
        if (typeof a.tiempoSugeridoSegundos !== 'number' || a.tiempoSugeridoSegundos < 15 || a.tiempoSugeridoSegundos > 300) {
          e.push(`${c}.tiempoSugeridoSegundos: entre 15 y 300`);
        }
        lista(e, a.preguntas, `${c}.preguntas`, (p, cp) => {
          objeto(e, p, cp, { id: 40, categoria: 40, texto: 400 });
          if (!esRegistro(p)) return;
          lista(e, p.claves, `${cp}.claves`, (k, ck) => {
            objeto(e, k, ck, { descripcion: 120, sugerencia: 300 });
            if (!esRegistro(k) || !esListaDe(k.palabras, (w): w is string => esTexto(w, 40)) || k.palabras.length === 0) {
              e.push(`${ck}.palabras: lista no vacía`);
            }
          });
        });
        break;
    }
  });
  if (Array.isArray(d.actividades)) unicos(e, d.actividades.map((a) => (esRegistro(a) ? a.id : null)), 'actividades');
  return e.length ? fallo(e.map((m) => `${idArchivo}: ${m}`)) : exito(d as unknown as Laboratorio);
}

import { exito, fallo, type Result } from '../../lib/result.ts';
import {
  esRegistro,
  esSlug,
  esTexto,
  esTextoONulo,
  esUno,
  esUrlSegura,
} from '../../lib/validacion.ts';
import { TIPOS_CONTACTO, type PerfilInstitucional } from './esquema.ts';

const esCorreo = (v: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
const esTelefono = (v: string) => /^\+?[0-9 ()-]{3,20}$/.test(v);

function validarContacto(c: unknown, i: number): string[] {
  if (!esRegistro(c)) return [`recursos.contactos[${i}] debe ser un objeto`];
  const e: string[] = [];
  if (!esTexto(c.nombre, 80)) e.push(`recursos.contactos[${i}].nombre es obligatorio`);
  if (!esTexto(c.descripcion, 240)) e.push(`recursos.contactos[${i}].descripcion es obligatoria`);
  if (!esUno(c.tipo, TIPOS_CONTACTO)) e.push(`recursos.contactos[${i}].tipo inválido`);
  if (!esTextoONulo(c.horario, 120)) e.push(`recursos.contactos[${i}].horario debe ser texto o null`);
  const v = c.valor;
  const valido =
    typeof v === 'string' &&
    ((c.tipo === 'web' && esUrlSegura(v)) ||
      (c.tipo === 'correo' && esCorreo(v)) ||
      (c.tipo === 'telefono' && esTelefono(v)) ||
      (c.tipo === 'presencial' && esTexto(v, 200)));
  // Solo https, mailto y tel: nunca javascript: ni otros esquemas.
  if (!valido) e.push(`recursos.contactos[${i}].valor no es válido para el tipo "${String(c.tipo)}"`);
  return e;
}

export function validarPerfil(datos: unknown, idArchivo: string): Result<PerfilInstitucional> {
  if (!esRegistro(datos)) return fallo([`${idArchivo}: el perfil debe ser un objeto`]);
  const d = datos;
  const e: string[] = [];
  if (d.version !== 1) e.push('version debe ser 1');
  if (d.id !== idArchivo || !esSlug(d.id)) e.push(`id debe coincidir con el nombre del archivo ("${idArchivo}")`);
  if (!esTexto(d.nombre, 120)) e.push('nombre es obligatorio');
  if (!esTextoONulo(d.institucion, 160)) e.push('institucion debe ser texto o null');

  if (!esRegistro(d.recursos)) {
    e.push('recursos debe ser un objeto');
  } else {
    if (!esTextoONulo(d.recursos.introduccion, 600)) e.push('recursos.introduccion debe ser texto o null');
    if (!Array.isArray(d.recursos.contactos)) e.push('recursos.contactos debe ser una lista');
    else d.recursos.contactos.forEach((c, i) => e.push(...validarContacto(c, i)));
  }

  if (!esRegistro(d.proyecto)) {
    e.push('proyecto debe ser un objeto');
  } else {
    if (!esTextoONulo(d.proyecto.nombreTrabajo, 60)) e.push('proyecto.nombreTrabajo debe ser texto o null');
    if (!esSlug(d.proyecto.ruta)) e.push('proyecto.ruta debe ser el id de una ruta académica (kebab-case)');
  }

  if (e.length > 0) return fallo(e.map((m) => `${idArchivo}: ${m}`));
  return exito(d as unknown as PerfilInstitucional);
}

/** Enlace seguro para un contacto validado. */
export function hrefContacto(tipo: string, valor: string): string | null {
  if (tipo === 'web') return valor;
  if (tipo === 'correo') return `mailto:${valor}`;
  if (tipo === 'telefono') return `tel:${valor.replace(/[^\d+]/g, '')}`;
  return null;
}

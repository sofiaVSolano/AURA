// Perfil institucional: adapta AURA a cada universidad y metodología sin asumir
// una estructura de tesis única. Archivo: content/perfiles/<id>.json.

export const TIPOS_CONTACTO = ['telefono', 'web', 'correo', 'presencial'] as const;
export type TipoContacto = (typeof TIPOS_CONTACTO)[number];

export interface ContactoAcompanamiento {
  nombre: string;
  descripcion: string;
  tipo: TipoContacto;
  /** Teléfono, URL https, correo o dirección, según el tipo. */
  valor: string;
  horario: string | null;
}

export interface PerfilInstitucional {
  version: 1;
  id: string;
  nombre: string;
  institucion: string | null;
  recursos: {
    /** Mensaje introductorio de la institución (opcional). */
    introduccion: string | null;
    /** Contactos oficiales. Vacío hasta que la institución los proporcione. */
    contactos: ContactoAcompanamiento[];
  };
  proyecto: {
    /** Nombre local del trabajo de grado (tesis, monografía, proyecto…). */
    nombreTrabajo: string | null;
    /** Ruta académica a usar (content/academica/rutas/<ruta>.json): varía por institución, disciplina o modalidad. */
    ruta: string;
  };
}

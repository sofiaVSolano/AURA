// Carga el perfil institucional activo (VITE_CONTENT_PROFILE) con respaldo al
// perfil "default" si falta o no es válido.
import { config } from '../../config/env.ts';
import type { PerfilInstitucional } from './esquema.ts';
import { validarPerfil } from './validar.ts';

const modulos = import.meta.glob<unknown>('../../../../content/perfiles/*.json', { eager: true, import: 'default' });

function cargar(id: string) {
  const datos = Object.entries(modulos).find(([ruta]) => ruta.endsWith(`/perfiles/${id}.json`))?.[1];
  return datos === undefined ? null : validarPerfil(datos, id);
}

function resolver(): PerfilInstitucional {
  const solicitado = cargar(config.contentProfile);
  if (solicitado?.ok) return solicitado.valor;
  if (import.meta.env.DEV) {
    console.warn(
      `[AURA] Perfil "${config.contentProfile}" no disponible; se usa "default".`,
      solicitado && !solicitado.ok ? solicitado.errores : '',
    );
  }
  const respaldo = cargar('default');
  if (respaldo?.ok) return respaldo.valor;
  throw new Error('No hay un perfil institucional válido (content/perfiles/default.json).');
}

export const perfilActivo: PerfilInstitucional = resolver();

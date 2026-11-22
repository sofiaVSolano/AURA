// Lleva a la cuenta lo hecho en este navegador (solo si la cuenta aún no tiene ese módulo).
// Las experiencias de Mi AURA se reenvían una a una: el servidor decide cuáles cuentan.
import { api, type ModuloRemoto } from '../../lib/api.ts';
import { crearAlmacenLocal } from '../../lib/almacenLocal.ts';

const MODULOS: ModuloRemoto[] = ['mi-aura', 'emocional', 'academica'];

export async function llevarDatosLocalesALaCuenta(): Promise<{ modulos: number; experiencias: number }> {
  const remotos = await api.datos();
  let modulos = 0;
  let experiencias = 0;
  for (const m of MODULOS) {
    const local = (await (await crearAlmacenLocal(m)).cargar()) as Record<string, unknown> | null;
    if (!local) continue;
    if (!remotos[m]) {
      await api.guardar(m, local).then(
        () => modulos++,
        () => undefined, // datos locales no válidos: se ignoran (la cuenta queda limpia)
      );
    }
    if (m === 'mi-aura' && Array.isArray(local.experiencias)) {
      for (const e of local.experiencias as Array<{ tipo?: string; refId?: string }>) {
        if (typeof e.tipo !== 'string' || typeof e.refId !== 'string') continue;
        await api.experiencia(e.tipo, e.refId).then(
          (r) => r.registrada && experiencias++,
          () => undefined,
        );
      }
    }
  }
  return { modulos, experiencias };
}

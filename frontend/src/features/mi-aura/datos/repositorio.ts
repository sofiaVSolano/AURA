// Acceso a datos de Mi AURA sobre el almacén local genérico (src/lib/almacenLocal.ts).
import { crearAlmacen, type Almacen } from '../../../lib/almacenLocal.ts';
import type { EstadoAura } from '../dominio/modelo.ts';

export type RepositorioAura = Almacen<EstadoAura>;

export const crearRepositorio = (): Promise<RepositorioAura> => crearAlmacen<EstadoAura>('mi-aura');

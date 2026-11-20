// Metadatos por ruta: el ámbito visual y el título de la pestaña.
export type Ambito = 'inicio' | 'emocional' | 'academico' | 'mi-aura';

export interface HandleRuta {
  ambito: Ambito;
  /** Título fijo; null si la página lo define (rutas dinámicas). */
  titulo?: string | null;
}

export function esHandleRuta(h: unknown): h is HandleRuta {
  return typeof h === 'object' && h !== null && 'ambito' in h;
}

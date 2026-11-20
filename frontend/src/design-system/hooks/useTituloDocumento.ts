import { useEffect } from 'react';

/** Actualiza el título de la pestaña (lo anuncian los lectores de pantalla al navegar). */
/** Con null no hace nada (la página hija define su propio título). */
export function useTituloDocumento(titulo: string | null | undefined) {
  useEffect(() => {
    if (titulo === null) return;
    document.title = titulo ? `${titulo} · AURA` : 'AURA';
  }, [titulo]);
}

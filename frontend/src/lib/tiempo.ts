/** Formato m:ss para duraciones de video (sin dependencias de la interfaz). */
export const formatoTiempo = (s: number) => {
  const t = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

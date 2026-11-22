import estilos from './VideoPendiente.module.css';

/** Marco en blanco para un video aún no producido: nunca se muestra como disponible. */
export function VideoPendiente({ matiz = 268 }: { matiz?: number }) {
  return (
    <div className={`${estilos.marco} textura-grano`} role="status" style={{ '--matiz': matiz } as React.CSSProperties}>
      {/* Una burbuja que respira mientras el video se prepara (decorativa) */}
      <span className={estilos.escena} aria-hidden="true">
        <span className={estilos.onda} />
        <span className={estilos.onda} />
        <span className={estilos.onda} />
        <span className={estilos.burbuja} />
      </span>
      <span className={estilos.texto}>
        <strong>Este video está en preparación.</strong>
        <span>Lo publicaremos cuando esté listo, con subtítulos y transcripción.</span>
      </span>
    </div>
  );
}

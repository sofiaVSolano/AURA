import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icono } from '../Icono/Icono.tsx';
import estilos from './Modal.module.css';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  /** Acciones al pie (botones). */
  acciones?: ReactNode;
}

/**
 * Diálogo modal sobre <dialog> nativo: atrapa el foco, cierra con Escape y
 * con clic en el fondo, y devuelve el foco al elemento que lo abrió.
 * Úsalo solo si la tarea necesita interrupción o foco protegido.
 */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, acciones }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const origen = useRef<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) {
      origen.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialogo.showModal();
    } else if (!abierto && dialogo.open) {
      dialogo.close();
    }
  }, [abierto]);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const alCerrar = () => {
      origen.current?.focus();
      if (abierto) onCerrar();
    };
    dialogo.addEventListener('close', alCerrar);
    return () => dialogo.removeEventListener('close', alCerrar);
  }, [abierto, onCerrar]);

  return (
    <dialog
      ref={ref}
      className={estilos.modal}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={descripcion ? `${id}-desc` : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className={estilos.contenido}>
        <header className={estilos.cabecera}>
          <h2 id={`${id}-titulo`} className={estilos.titulo}>
            {titulo}
          </h2>
          <button type="button" className={estilos.cerrar} onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </header>
        {descripcion && (
          <p id={`${id}-desc`} className={estilos.descripcion}>
            {descripcion}
          </p>
        )}
        {children}
        {acciones && <footer className={estilos.acciones}>{acciones}</footer>}
      </div>
    </dialog>
  );
}

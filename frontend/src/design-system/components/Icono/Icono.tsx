import type { ReactNode } from 'react';

// Iconos propios: rejilla 24, trazo 1.75, extremos redondeados. Un único estilo.
const trazos = {
  inicio: <path d="M4 11.5 12 5l8 6.5M6.5 9.5V19h11V9.5M10 19v-5h4v5" />,
  emocional: (
    <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6Z" />
  ),
  academica: (
    <>
      <path d="M4.5 6.5c2.6-1 5.1-.8 7.5.8 2.4-1.6 4.9-1.8 7.5-.8V18c-2.6-1-5.1-.8-7.5.8-2.4-1.6-4.9-1.8-7.5-.8Z" />
      <path d="M12 7.3v11.5" />
    </>
  ),
  aura: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5M12 20.5A8.5 8.5 0 0 1 3.5 12" />
    </>
  ),
  recursos: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.25" />
      <path d="m6.4 6.4 3.3 3.3m4.6 4.6 3.3 3.3m0-11.2-3.3 3.3m-4.6 4.6-3.3 3.3" />
    </>
  ),
  reproducir: <path d="M8 5.8v12.4a.6.6 0 0 0 .9.5l9.6-6.2a.6.6 0 0 0 0-1L8.9 5.3a.6.6 0 0 0-.9.5Z" />,
  cerrar: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  copiar: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.2" />
      <path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4.5 3.8 18.5h16.4Z" />
      <path d="M12 10v3.5m0 2.6v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5m0-8.2v.1" />
    </>
  ),
  flecha: <path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5" />,
  pausa: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  volumen: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3Z" />
      <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  silencio: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3Z" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </>
  ),
  subtitulos: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M7 12.5h3.5M12.5 12.5H17M7 15.5h6" />
    </>
  ),
  pantalla: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
  salirPantalla: <path d="M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5" />,
  siguiente: (
    <>
      <path d="M6 5.8v12.4a.6.6 0 0 0 .9.5l8.6-6.2a.6.6 0 0 0 0-1L6.9 5.3a.6.6 0 0 0-.9.5Z" />
      <path d="M18.5 5.5v13" />
    </>
  ),
  marcador: <path d="M7 4.5h10a.5.5 0 0 1 .5.5v14.3a.3.3 0 0 1-.5.2L12 16l-5 3.5a.3.3 0 0 1-.5-.2V5a.5.5 0 0 1 .5-.5Z" />,
  papelera: <path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7M10.5 10.5v5M13.5 10.5v5" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type NombreIcono = keyof typeof trazos;

interface IconoProps {
  nombre: NombreIcono;
  tamano?: number;
  /** Si se indica, el icono es significativo y se anuncia; si no, es decorativo. */
  titulo?: string;
  className?: string | undefined;
}

export function Icono({ nombre, tamano = 20, titulo, className }: IconoProps) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {trazos[nombre]}
    </svg>
  );
}

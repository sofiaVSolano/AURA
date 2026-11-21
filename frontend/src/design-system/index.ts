// Punto de entrada público del sistema de diseño de AURA.
export { Boton, BotonEnlace } from './components/Boton/Boton.tsx';
export { AreaTexto, CampoTexto, GrupoOpciones } from './components/Campo/Campo.tsx';
export { EncabezadoPagina } from './components/EncabezadoPagina/EncabezadoPagina.tsx';
export { EstadoVista, type TipoEstado } from './components/EstadoVista/EstadoVista.tsx';
export { Etiqueta, type TonoEtiqueta } from './components/Etiqueta/Etiqueta.tsx';
export { Halo } from './components/Halo/Halo.tsx';
export { Icono, type NombreIcono } from './components/Icono/Icono.tsx';
export { Modal } from './components/Modal/Modal.tsx';
export { Navegacion, type ItemNavegacion } from './components/Navegacion/Navegacion.tsx';
export { BarraProgreso, PasosProgreso, type EstadoPaso } from './components/Progreso/Progreso.tsx';
// ReproductorVideo se importa directamente desde su archivo (carga diferida por página).
export { Tarjeta, TarjetaEnlace } from './components/Tarjeta/Tarjeta.tsx';
export { VideoPendiente } from './components/VideoPendiente/VideoPendiente.tsx';
export { useEnVista } from './hooks/useEnVista.ts';
export { useParalaje } from './hooks/usePuntero.ts';
export { useTituloDocumento } from './hooks/useTituloDocumento.ts';
export { Esfera3D, type EstadoEsfera } from './components/Esfera3D/Esfera3D.tsx';
export { TransicionTinta } from './components/TransicionTinta/TransicionTinta.tsx';
export { movimientoReducido, suave, tramo, useMedidas, useProgresoScroll, type LecturaScroll } from './hooks/useProgresoScroll.ts';
export { PalabraAjustada } from './components/PalabraAjustada/PalabraAjustada.tsx';

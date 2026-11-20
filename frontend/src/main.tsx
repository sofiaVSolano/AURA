import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design-system/styles/index.css';
import { App } from './app/App.tsx';
import { comprobarSesion } from './lib/api.ts';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

// Se averigua si hay cuenta antes de pintar: así cada módulo carga sus datos del lugar correcto.
await comprobarSesion();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

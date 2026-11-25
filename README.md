# AURA

Acompañamiento Universitario, Reflexión y Aprendizaje. La documentación completa está en [`docs/`](docs/README.md).

```
frontend/   aplicación web (Vite + React + TypeScript) y su servidor de producción (puerto 4046)
backend/    API de cuentas y sincronización (Node.js 24 + SQLite, sin dependencias; puerto 4054)
content/    contenido editorial compartido: videos, rutas académicas, laboratorios, perfiles
docs/       documentación del proyecto
```

## Inicio rápido

### Con Docker (todo de una vez)

```bash
cp backend/.env.example backend/.env                   # configura orígenes, clave de IA, etc.
cp frontend/.env.servidor.example frontend/.env.servidor  # opcional
docker compose up -d --build                           # API + web en http://<servidor>:4046
```

`compose.yaml` levanta el API (solo en la red interna) y la web (puerto 4046), que le reenvía `/api`. La base de datos queda en `backend/datos/` y los videos se leen de `content/` (volúmenes). Detalles, actualización y copias de seguridad: [docs/15](docs/15-backend-y-despliegue.md#despliegue-con-docker).

Backend: `cd backend && cp .env.example .env && npm start`. Arquitectura, seguridad y despliegue: [docs/15](docs/15-backend-y-despliegue.md).

### Frontend

```bash
cd frontend
npm ci            # instala exactamente lo que fija package-lock.json
npm run dev       # servidor de desarrollo
npm run check     # typecheck + pruebas + build de producción (dist/ + medios publicados)
npm run preview   # sirve dist/ en local (con las cabeceras de seguridad)
npm run test:e2e        # prueba funcional en navegador (requiere Chrome/Edge y `npm run fixture:video`)
npm run test:integracion  # cuentas y sincronización (backend + servidor de producción)
npm run test:auditoria  # accesibilidad (axe), CSP, rendimiento y responsive sobre la pila de producción
npm run servir          # servidor de producción (dist/ + proxy /api), puerto 4046
```

Requisitos: Node.js ≥ 22.12. La configuración por entorno se explica en `frontend/.env.example` y en [docs/08-despliegue.md](docs/08-despliegue.md).

Política de dependencias: `frontend/.npmrc` desactiva los scripts de instalación y fija versiones exactas. Antes de añadir un paquete hay que seguir el proceso de [docs/04-riesgos.md](docs/04-riesgos.md).

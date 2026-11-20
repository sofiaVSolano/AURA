# AURA

Acompañamiento Universitario, Reflexión y Aprendizaje. La documentación completa está en [`docs/`](docs/README.md).

```
frontend/   aplicación web (Vite + React + TypeScript)
backend/    reservado; aún sin implementar (ver backend/README.md)
content/    contenido editorial compartido: videos, rutas académicas, laboratorios, perfiles
docs/       documentación del proyecto
```

## Inicio rápido (frontend)

```bash
cd frontend
npm ci            # instala exactamente lo que fija package-lock.json
npm run dev       # servidor de desarrollo
npm run check     # typecheck + pruebas + build de producción (dist/ + medios publicados)
npm run preview   # sirve dist/ en local
```

Requisitos: Node.js ≥ 22.12. La configuración por entorno se explica en `frontend/.env.example` y en [docs/08-despliegue.md](docs/08-despliegue.md).

Política de dependencias: `frontend/.npmrc` desactiva los scripts de instalación y fija versiones exactas. Antes de añadir un paquete hay que seguir el proceso de [docs/04-riesgos.md](docs/04-riesgos.md).

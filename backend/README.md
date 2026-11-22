# AURA · backend

API de cuentas, sincronización de datos y validación del progreso. Usa Node.js 24 **sin dependencias en ejecución** (`node:http`, `node:sqlite`, `node:crypto`).

```bash
cp .env.example .env   # configuración (no se versiona)
npm start              # http://127.0.0.1:4054
npm test               # 10 pruebas del API
npm run typecheck
```

- **Código:** `src/servidor.ts` (entrada), `src/app.ts` (rutas), `src/auth.ts` (scrypt y sesiones), `src/seguridad.ts` (límites, origen y CORS), `src/bd.ts` (SQLite y migraciones), `src/contenido.ts` (validación de referencias contra `content/`).
- **Reglas compartidas:** reutiliza los validadores y reglas puras de `frontend/src/…`, así cliente y servidor aplican las mismas.
- **Documentación completa** (API, seguridad, ejecución local y despliegue): [docs/15-backend-y-despliegue.md](../docs/15-backend-y-despliegue.md).

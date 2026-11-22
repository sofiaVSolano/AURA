# 15 · Backend, cuentas y despliegue

## Arquitectura

```
Navegador ──HTTP(S)──► frontend/servidor/servidor.mjs  (puerto 4046, público)
                        ├─ sirve dist/ (cabeceras de seguridad, caché, gzip, rangos, fallback SPA)
                        └─ /api/*  ──►  backend/src/servidor.ts  (puerto 4054, solo 127.0.0.1)
                                         ├─ cuentas y sesiones
                                         ├─ datos por módulo (mi-aura, emocional, academica)
                                         ├─ experiencias validadas (progreso de Mi AURA)
                                         └─ SQLite (node:sqlite)  backend/datos/aura.db
content/  ◄── lo leen ambos (el backend lo usa para validar referencias)
```

- **Mismo origen:** el navegador solo habla con el puerto 4046, que reenvía `/api` al backend. Así la cookie de sesión no necesita CORS y la CSP `connect-src 'self'` se mantiene.
- **Sin dependencias en ejecución.** El backend usa solo `node:http`, `node:sqlite` y `node:crypto`; el servidor del frontend, solo `node:http`, `node:fs` y `node:zlib`. Como dependencias de desarrollo, el backend solo tiene `typescript` y `@types/node`, ya auditadas.
- **Reglas compartidas:** el backend importa los validadores y reglas puras del frontend (`frontend/src/features/*/dominio`, `frontend/src/content/**/validar.ts` y `frontend/src/lib/consentimiento.ts`). Cliente y servidor aplican **exactamente las mismas reglas**.
- **Sin cuenta, AURA funciona igual que antes,** con los datos en el navegador. Con cuenta, cada módulo guarda en el servidor (`src/lib/almacenLocal.ts` elige el almacén) y las pantallas no cambian.

## API (`/api`)

| Método y ruta | Sesión | CSRF | Descripción |
|---|---|---|---|
| `GET /salud` | — | — | Estado del servicio |
| `POST /auth/registro` | — | origen | `{ correo, contrasena, consentimiento: true, versionConsentimiento }` |
| `POST /auth/ingreso` | — | origen | `{ correo, contrasena }` |
| `POST /auth/salida` | sí | sí | Cierra la sesión |
| `GET /auth/yo` | — | — | `{ usuario, csrf }` o `{ usuario: null }` |
| `GET /datos` | sí | — | Los 3 módulos; Mi AURA incluye las experiencias **del servidor** |
| `PUT /datos/:modulo` | sí | sí | Guarda un módulo validado; en Mi AURA **se ignoran las experiencias enviadas** |
| `DELETE /datos/:modulo` | sí | sí | Borra los datos de un módulo |
| `POST /experiencias` | sí | sí | `{ tipo, refId }` → solo cuenta si apunta a contenido real; la dimensión y la etapa se calculan en el servidor |
| `GET /cuenta/exportar` | sí | — | Todos los datos de la cuenta en JSON (portabilidad) |
| `DELETE /cuenta` | sí | sí | `{ contrasena }` → elimina la cuenta y **todos** sus datos |

**Validación del progreso en el servidor** (`backend/src/contenido.ts`):

| Experiencia | Cuenta solo si… |
|---|---|
| Ejercicio | Existe el laboratorio y la actividad |
| Práctica de sustentación | Existe la pregunta del simulador |
| Avance | Existe el tema en la ruta |
| Reflexión | Existe el video |
| Video visto | El video está **publicado** |
| Compartir | Nunca, porque esa función aún no existe |

Además:
- Cada experiencia cuenta una sola vez.
- Hay un máximo de 120 por hora.
- **Límite conocido:** el servidor no comprueba las respuestas de los laboratorios, solo que la actividad existe. Para hacerlo, el laboratorio tendría que enviar sus respuestas y el servidor evaluarlas con `evaluar.ts`, que ya es puro.

## Seguridad (implementada y probada)

| Control | Detalle |
|---|---|
| Contraseñas | scrypt (N=2¹⁵, r=8, p=1, sal de 16 bytes). Comparación en tiempo constante, con un hash de relleno si el correo no existe. Longitud entre 10 y 128 |
| Sesiones | Token aleatorio de 32 bytes; **en la base solo se guarda su SHA-256**. Cookie `HttpOnly`, `SameSite=Lax` y `Secure` (prefijo `__Host-`). Caducan a los 14 días y las vencidas se limpian cada hora |
| CSRF | Origen permitido obligatorio en toda petición que modifica algo, más el token CSRF en la cabecera `X-CSRF-Token` |
| Límites | 300 peticiones por minuto por IP; 8 intentos de ingreso cada 15 minutos por IP y correo; 5 registros por hora por IP; 120 experiencias por hora por usuario |
| Entradas | JSON obligatorio (si no, 415); 256 KB como máximo (413; 4 KB en autenticación); los datos se validan con los esquemas de cada módulo; consultas SQL preparadas |
| Respuestas | `no-store`, `nosniff`, CSP `default-src 'none'` y `Referrer-Policy: no-referrer`. Los errores son genéricos: sin trazas ni datos personales en respuestas ni registros |
| Privacidad | Consentimiento explícito y versionado al registrarse; exportación y borrado total. No se guarda cómo se siente la persona ni las respuestas del simulador |
| Servidor web | CSP estricta y cabeceras (`servidor/cabeceras.json`); HSTS con `HTTPS_PUBLICO=true`; no sirve nada fuera de `dist/`; `X-Forwarded-For` se reescribe con la IP real |

**Pendiente y obligatorio antes de usarlo con estudiantes:**
- **HTTPS.** Sin él, las contraseñas y la cookie de sesión viajan sin cifrar.
- Copias de seguridad de la base de datos y permisos restrictivos sobre ella.
- Revisión institucional del texto de consentimiento y de la política de datos.

## Ejecutar todo en local

```bash
# Terminal 1 · backend (puerto 4054)
cd backend
cp .env.example .env          # en local se puede usar tal cual
npm start

# Terminal 2 · frontend en desarrollo (Vite reenvía /api al backend)
cd frontend
npm run dev

# …o el frontend tal como irá en producción (puerto 4046)
cd frontend
npm run build && npm run servir
```

**Pruebas** (en `frontend/`):

| Comando | Qué ejecuta |
|---|---|
| `npm run check` | Tipos, 35 pruebas unitarias y build |
| `npm run test:e2e` | 61 comprobaciones sin cuenta |
| `npm run test:integracion` | 15 comprobaciones de cuenta y sincronización entre dos navegadores |
| `npm run test:auditoria` | 152 comprobaciones de accesibilidad, CSP, caché, gzip y rendimiento sobre la pila real |

En `backend/`, `npm test` ejecuta las 10 pruebas del API.

## Despliegue en el servidor del profesor (pasos; **no ejecutados todavía**)

Datos recibidos: el servidor tiene una IP pública, usuario `sofia` y los puertos **4046** (frontend) y **4054** (API). La IP y las credenciales **no se guardan en el repositorio**: van solo en los `.env` del servidor. Faltan por confirmar: sistema operativo, si `4054` es el puerto de SSH o el del API, si hay dominio o HTTPS, y si hay firewall.

1. **Node.js 24 LTS** en el servidor (`node --version` ≥ 24). No hace falta nada más: sin base de datos externa ni servidor web adicional.
2. Copiar el repositorio (por `git clone` o `scp`) a, por ejemplo, `~/aura`.
3. **Frontend:**
   ```bash
   cd ~/aura/frontend && npm ci && npm run build
   cp .env.servidor.example .env.servidor   # PUERTO=4046, HOST=0.0.0.0, API_URL=http://127.0.0.1:4054
   ```
4. **Backend:**
   ```bash
   cd ~/aura/backend && npm ci --omit=dev
   cp .env.example .env
   # PUERTO=4054, HOST=127.0.0.1 (no se expone), ORIGENES_PERMITIDOS=http://<IP>:4046
   # COOKIE_SEGURA=true con HTTPS; sin HTTPS habría que poner false (INSEGURO: solo para pruebas internas)
   chmod 600 .env
   ```
5. **Arrancar ambos servicios** de forma persistente. Si el servidor usa systemd, con dos unidades (`ExecStart=/usr/bin/node src/servidor.ts` en `backend/` y `ExecStart=/usr/bin/node servidor/servidor.mjs` en `frontend/`, ambas con `Restart=on-failure` y `User=sofia`). Si no, con el gestor de procesos que exista en el servidor.
6. **Firewall:** abrir solo el 4046 (y el SSH). El 4054 escucha en `127.0.0.1` y no debe abrirse.
7. **HTTPS (muy recomendado):** con un dominio, un proxy TLS delante del 4046 (Let's Encrypt). Después, poner `HTTPS_PUBLICO=true` en el frontend, `COOKIE_SEGURA=true` en el backend y el origen `https://…` en `ORIGENES_PERMITIDOS`.
8. **Copias de seguridad:** `backend/datos/aura.db` (y sus archivos `-wal`/`-shm`). Copiarla con el servicio detenido o con `sqlite3 aura.db ".backup copia.db"`.
9. **Comprobar:** `curl http://<IP>:4046/api/salud` → `{"ok":true}`. Abrir `http://<IP>:4046`, crear una cuenta de prueba y eliminarla.

**Actualizar:** `git pull`, `npm ci && npm run build` en `frontend/`, y reiniciar ambos servicios. Las migraciones de la base se aplican solas al arrancar el backend.

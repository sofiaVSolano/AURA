# 08 · Entornos y despliegue

Estado: AURA solo se desarrolla y prueba en local. **No hay nada configurado en el servidor.** No se asume Docker, Nginx, Apache ni ninguna otra infraestructura hasta conocer el servidor.

## Entornos

| | Desarrollo | Producción |
|---|---|---|
| Comando | `npm run dev` | `npm run build`, que genera `dist/` |
| Variables | `.env.development` (+ `.env.local`) | `.env.production` (+ `.env.production.local`) |
| Sourcemaps | Sí | No |
| Exponer en la red local | `AURA_DEV_EXPOSE=true` (para probar en el móvil) | — |

**Variables** (documentadas en `.env.example`):

| Variable | Uso |
|---|---|
| `VITE_BASE_PATH` | Ruta pública de la app: `/` en la raíz del dominio o `/aura/` si se publica en un subdirectorio. Se valida en `vite.config.ts`. |
| `VITE_MEDIA_BASE_URL` | Origen de los videos. Si está vacía, se usa `<base>media/` (el mismo servidor). |
| `VITE_CONTENT_PROFILE` | Perfil institucional (universidad o metodología) para cargar el contenido correspondiente. |
| `AURA_DEV_EXPOSE` | Solo afecta al servidor de desarrollo y no llega al navegador. |

Reglas:
- Toda variable `VITE_*` **es pública**, porque se incrusta en el JavaScript. **Nunca deben contener secretos.** Las credenciales vivirán en el futuro backend, no en el frontend.
- En el código no hay rutas absolutas del equipo ni dependencia de `localhost`: todo usa `import.meta.env.BASE_URL` y `mediaUrl()` (`src/config/env.ts`).
- Comprobado: compilar con `VITE_BASE_PATH=/aura/` genera rutas `/aura/assets/...`.
- En Git Bash (Windows) hay que usar `MSYS_NO_PATHCONV=1` al pasar rutas como `/aura/` por la línea de comandos, porque si no la shell las convierte en rutas de Windows. `vite.config.ts` rechaza ese caso.

## Resultado de la compilación

`npm run build` también copia a `dist/media/videos/` los archivos de los videos publicados (`scripts/publicar-medios.ts`). `dist/` es un sitio **100% estático** (HTML, JS, CSS y recursos). Lo puede servir cualquier servidor web capaz de entregar archivos estáticos, sin Node en producción. Los videos se copian aparte en `<raíz web>/media/` o en el origen indicado por `VITE_MEDIA_BASE_URL` (ver `public/media/README.md`).

Cuando haya enrutado en la app (F1) hará falta una de estas dos opciones: configurar el servidor para que devuelva `index.html` en las rutas desconocidas (*fallback* SPA), o usar enrutado por hash. Se decidirá según el servidor.

## Cabeceras de seguridad (obligatorias en el servidor)

Están definidas y verificadas en `frontend/vite.config.ts` (`CABECERAS_SEGURIDAD`): `npm run test:auditoria` comprueba que la app funciona con ellas. Deben replicarse en el servidor web:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains   (solo con HTTPS)
```

Si los medios se alojan en otro origen (`VITE_MEDIA_BASE_URL`), añádelo a `media-src` (y a `connect-src` para la transcripción). El servidor también debe aceptar **peticiones por rangos** en los videos y aplicar el **fallback SPA** (devolver `index.html` en rutas como `/emocional/tengo-miedo`).

## Requisitos técnicos

- **Para compilar** (en local o en el servidor): Node.js ≥ 22.12 (en desarrollo se usa la 24.18) y npm. La instalación se hace con `npm ci`, que respeta el lockfile.
- **Para servir:** un servidor web de archivos estáticos con HTTPS. Tipos MIME correctos para `.js`, `.mjs`, `.webp`, `.avif`, `.vtt` y `.mp4`. Soporte de *range requests* para que los videos se puedan saltar y buscar.
- **Recomendado:** cabeceras de seguridad (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`), caché larga para `/assets/*` (los nombres llevan hash) y caché corta para `index.html`.

## Información que necesitamos del servidor

| Dato | Por qué |
|---|---|
| Sistema operativo y versión | Para elegir el método de instalación y servicio |
| CPU, RAM y **disco disponible** | Los videos ocupan mucho (la grabación de referencia pesa ~200 MB) |
| Acceso SSH (usuario, método de autenticación, permisos sudo o no) | Para desplegar y automatizar |
| Dominio o subdominio, y si la app irá en la raíz o en una subruta | Para definir `VITE_BASE_PATH` |
| Certificado HTTPS (¿existe? ¿Let's Encrypt?) | Es obligatorio para un servicio con datos personales |
| Servidor web instalado (Nginx, Apache, IIS u otro) y quién lo administra | Para la configuración del *fallback* SPA, las cabeceras y la caché |
| Node.js instalado (¿versión?) | Para decidir si se compila en el servidor o se sube `dist/` ya compilado |
| Otros servicios (base de datos, Docker, firewall, puertos abiertos) | Para planificar el futuro backend |
| Política institucional de datos y privacidad | Afecta a la persistencia en el servidor (R11) |
| Copias de seguridad y monitorización | Para la continuidad del servicio |

## Limitación del almacenamiento local (MVP)

El MVP guarda los datos **solo en el navegador** (IndexedDB). Esto implica:
- Los datos **no se sincronizan** entre dispositivos ni entre navegadores.
- Se **pierden** si se borran los datos del sitio, se usa el modo privado o se cambia de equipo.
- No hay copia de seguridad ni acceso institucional (lo cual es correcto para la privacidad de los registros emocionales).
- **No equivale a una base de datos centralizada.**

### Cómo se mantendrá fácil la migración a un servidor

1. **Repositorios con interfaz asíncrona** (`src/lib/`): la interfaz de usuario nunca habla con IndexedDB directamente, sino con funciones como `experiences.list()` o `reflections.delete(id)`, que devuelven `Promise`. Para pasar a un servidor solo habría que cambiar la implementación por una que use HTTP.
2. **Identificadores generados en el cliente** (`crypto.randomUUID()`) y fechas en ISO 8601 (UTC), compatibles con cualquier base de datos.
3. **Esquema versionado** (`schemaVersion`) en cada registro, con migraciones explícitas.
4. **Exportar e importar en JSON** desde el MVP. Sirve como derecho de acceso y portabilidad, y también como vía de migración.
5. **El estado de Mi AURA se deriva**, no se guarda: se recalcula a partir de las experiencias (docs/05), así que no hay estado duplicado que sincronizar.
6. **Separación de datos:** el contenido editorial (guías y videos, compartido y por perfil institucional) va aparte de los datos personales (privados y eliminables).

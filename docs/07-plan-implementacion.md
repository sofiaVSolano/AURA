# 07 · Plan de implementación por fases

Cada fase termina con una revisión y la aprobación antes de pasar a la siguiente.

| Fase | Objetivo | Entregables | Skills |
|---|---|---|---|
| **F0 · Preparación** | Base segura | Resolver D1–D3; ubicar el repositorio fuera de OneDrive; `git init` y `.gitignore`; crear el proyecto con Vite + React + TS (revisando cada dependencia); `.npmrc` (con `ignore-scripts`); lint, format y test; CI con `npm ci`, `npm audit` y gitleaks | — |
| **F1 · Sistema de diseño** | Una base visual coherente | `tokens.css` con contraste validado; temas noche y día; tipografía; componentes base (Button, Card, Dialog, Link, Layout); navegación principal; DESIGN.md | impeccable |
| **F2 · Prototipo de Mi AURA** | Validar el corazón emocional del producto | Esfera en SVG con grano y respiración; 4–5 estados de ejemplo; estado de reposo; versión con movimiento reducido; descripción accesible; pruebas del cálculo del estado | svg-animations, emil-design-eng |
| **F3 · AURA emocional** | Acompañamiento | Categorías y situaciones (contenido de ejemplo); reproductor de video accesible con subtítulos y transcripción; transición de foco; ruta de ayuda inmediata; aviso de que no es un servicio clínico | impeccable, emil-design-eng |
| **F4 · AURA académica** | Aprendizaje | Guías por etapa del proyecto de grado; ejemplos; motor de ejercicios (ordenar, elegir, completar, reflexión) sin arrastre obligatorio | impeccable |
| **F5 · Conexión y persistencia** | Evolución real | Registro de `Experience` en IndexedDB; Mi AURA que evoluciona; historial ("tu recorrido"); exportar y borrar los datos propios | svg-animations |
| **F6 · Pulido y auditoría** | Calidad | Auditoría WCAG 2.2 AA (axe, NVDA, teclado); Lighthouse y Web Vitals dentro del presupuesto; revisión de animaciones; pruebas E2E | impeccable (+ review-animations, opcional) |
| **F7 · Backend y despliegue** *(opcional)* | Escala | Autenticación, sincronización con consentimiento, hosting de videos, despliegue con cabeceras de seguridad (CSP, HSTS) | — |

## Decisiones tomadas (2026-11-20)

D1 el código vive en `C:\dev\aura` · D2 Vite + React + TS · CSS propio con tokens, sin librerías visuales · avatar en SVG con evolución progresiva · D3 MVP solo local, sin backend ni autenticación; los registros emocionales son voluntarios, privados y eliminables, y se minimizan · D4 videos locales en `public/media/` (el alojamiento se decide después) · D7 en español, responsive para móvil y escritorio, con **contenido adaptable a cada universidad o metodología** (`VITE_CONTENT_PROFILE`, sin una única estructura de tesis) · morado como identidad, con las tres experiencias diferenciadas · recursos de acompañamiento configurables, sin contactos inventados · despliegue futuro en el servidor del profesor (docs/08).

**F0 completada.** El código vive ahora en `C:\dev\aura`.

**F1 completada:** sistema de diseño, componentes base, motion, estructura de contenidos (docs/09 y docs/10).

**F2 completada:** bienvenida, onboarding y Mi AURA evolutivo (docs/11). Ilustraciones narrativas y reproducciones: en blanco hasta que estén listas.

**F3 completada:** AURA emocional, catálogo de 28 videos (todos pendientes), reproductor y publicación de medios (docs/12).

**F4 completada:** AURA académica, con ruta configurable, 4 guías completas, 4 laboratorios y simulador (docs/13). El repositorio se separó en `frontend/` y `backend/` (este último aún sin implementar; ver backend/README.md); `content/` y `docs/` son compartidos.

**F5 completada:** auditoría de integración, seguridad, rendimiento y accesibilidad, con pruebas de navegador versionadas (docs/14).

**Backend implementado** (cambia la decisión D3 a petición del equipo): cuentas con correo y contraseña, sincronización de todos los datos con consentimiento y validación del progreso en el servidor (docs/15). El despliegue en el servidor del profesor está documentado, pero no se ha ejecutado.

## Decisiones pendientes (histórico)

| ID | Decisión | Recomendación |
|---|---|---|
| D1 | Ubicación del código (OneDrive) | Mover el código a `C:\dev\aura` y dejar las referencias en OneDrive |
| D2 | Stack | Vite + React + TS (Astro como alternativa) |
| D3 | Backend y datos | MVP solo local; definir más tarde el marco legal y el consentimiento |
| D4 | Origen de los videos de acompañamiento (quién los produce, dónde se alojan, subtítulos) | Definir con el equipo de contenido; mientras tanto, usar placeholders |
| D5 | Análisis de los reels | Compartir grabaciones o capturas de los 12 reels (sobre todo #1, #5, #8, #10 y #12, que no son accesibles) |
| D6 | Ilustraciones finales | Encargadas o con licencia verificada; las referencias actuales no se publicarán |
| D7 | Institución, idioma y dispositivos objetivo | Confirmar si es solo en español, si es prioritariamente móvil y el contexto universitario |
| D8 | Contactos de ayuda inmediata | Obtener del servicio de bienestar universitario los números y canales oficiales |

## Siguiente paso

Cuando se apruebe, empezará **F0**: resolver D1 y D2, inicializar Git y crear el proyecto base revisando cada dependencia según la política de [04-riesgos.md](04-riesgos.md).

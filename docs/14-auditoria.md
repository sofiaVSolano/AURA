# 14 · Auditoría de integración, seguridad, rendimiento y accesibilidad (F5)

**Fecha:** 2026-11-20 · **Rama:** `fase-5-auditoria` · **Alcance:** solo el frontend (no hay backend). En esta fase no se añadieron funcionalidades: solo correcciones, pruebas y documentación.

> **Límite de esta auditoría:** es una revisión **parcial**. No incluye pruebas en Safari, Firefox ni dispositivos iOS/Android reales; tampoco lectores de pantalla reales (NVDA/VoiceOver) ni una revisión de seguridad del servidor, que aún no existe. **No se afirma que la aplicación sea completamente segura ni accesible.**

## 1. Cómo reproducirla

```bash
cd frontend
npm run check            # tipos + 35 pruebas unitarias + build de producción
npm run fixture:video    # (una vez) video de prueba para el reproductor; requiere ffmpeg
npm run test:e2e         # 61 comprobaciones funcionales en el servidor de desarrollo
npm run test:auditoria   # 138 comprobaciones sobre el build de producción con cabeceras de seguridad
```

Las pruebas de navegador usan Chrome o Edge mediante DevTools Protocol, sin dependencias. Encuentran el navegador solas o mediante `AURA_NAVEGADOR`. Los resultados quedan en `frontend/tests/e2e/.salida/`, incluido `auditoria.json`.

## 2. Funcionalidades verificadas (ejecutadas en esta fase)

| Área | Qué se comprobó | Resultado |
|---|---|---|
| Inicio | Frase, invitación, camino guiado por scroll, saludo con un AURA ya nacida | ✅ |
| Onboarding | 7 pasos; nombre, colores, forma y expresión; omitir lo opcional; respuesta de acompañamiento; nacimiento | ✅ |
| Mi AURA | Persistencia tras recargar; repetir no suma; celebración; etapa 5; galería; avatar en la cabecera | ✅ |
| AURA emocional | Pregunta, 7 categorías, 4 subtemas, ninguno «disponible», video pendiente sin `<video>`, guardar, aprendizaje (persistente y sumado a Mi AURA), 404 | ✅ |
| Reproductor | Sin descarga antes de pulsar, reproducción con gesto real, subtítulos (por defecto y alternables), K, búsqueda, silencio, siguiente | ✅ (con video de prueba) |
| AURA académica | 5 etapas, 26 temas, 4 laboratorios, guía completa (8 secciones), ejemplo con teclado, comparaciones, marca, avance, guía pendiente | ✅ |
| Laboratorios y simulador | Ordenar (mover y comentarios), elegir, navegación libre, simulador con estimación de tiempo; ejercicio, sustentación y avance registrados en Mi AURA | ✅ |
| Coherencia de datos | «Borrar todo» limpia los 3 almacenes; datos corruptos → aviso y «Empezar de nuevo»; datos manipulados → normalizados | ✅ |
| Medios (desarrollo) | Rangos 206; *path traversal* → 404 (verificado con `curl --path-as-is`) | ✅ |

## 3. Pruebas y resultados

| Conjunto | Herramienta | Resultado |
|---|---|---|
| Unitarias (dominio, contenido, contraste) | `node:test` | **35/35** |
| Funcional E2E (desarrollo) | CDP + Edge | **61/61**, 0 errores de consola, estable en ejecuciones repetidas |
| Auditoría (build de producción) | CDP + Edge + axe-core | **138/138**, 0 errores de consola |
| Tipos | `tsc -b` (estricto) | Sin errores |

**No se ejecutó:** Lighthouse (habría que descargar un paquete externo; se midió con las APIs nativas del navegador), pruebas en Safari o Firefox, dispositivos reales, ni lectores de pantalla reales.

## 4. Cadena de suministro

| Comprobación | Resultado |
|---|---|
| `npm audit` | **0 vulnerabilidades** |
| `npm audit signatures` | 32 paquetes con firma del registro verificada; 19 con atestación de procedencia |
| Origen e integridad | Las 83 entradas del lockfile vienen de `registry.npmjs.org` con integridad `sha512` |
| Scripts de instalación | Solo `fsevents` (macOS, opcional; no se instala en Windows) y además bloqueado por `ignore-scripts=true` |
| Duplicados | Ninguno |
| Typosquatting | Los nombres coinciden con los paquetes oficiales |
| Deprecados | Ninguno |
| Mantenimiento | Todos tuvieron actividad en 2025–2026, salvo `picocolors@1.1.1` (2024): estable, sin dependencias, solo de compilación (lo usa `postcss`). Varios paquetes de compilación tienen un solo mantenedor: riesgo bajo, vigilado con `npm audit` |
| Licencias | MIT, Apache-2.0, MPL-2.0 (lightningcss y axe-core), ISC, BSD-3, 0BSD; fuentes OFL-1.1. Compatibles con el uso previsto |
| Desactualizados | `react-router` 8.5.2 (publicada hace 2 días; se mantiene 8.5.1 por la regla de 7 días) y `@types/node` 26 (se mantiene 24 = versión de Node). **No se actualizó nada de forma masiva** |

**Dependencia incorporada en F5:** `axe-core@4.14.0` (solo de desarrollo y no llega al bundle). Viene de Deque (`dequelabs/axe-core`), no tiene dependencias ni scripts de instalación, su firma está verificada y se publicó hace más de 7 días; se descartó la 4.14.1, de hace 4 días.

**Binarios externos:** `ffmpeg` (ya instalado en el equipo, build de gyan.dev) se usa solo para generar el video de prueba. Edge es el instalado en el sistema. **No se ejecutó ningún instalador remoto.** El lanzador de la skill *impeccable*, que descarga un binario, no se ejecutó en ninguna fase.

## 5. Seguridad de la aplicación

| Aspecto | Estado |
|---|---|
| XSS | Sin `innerHTML`, `dangerouslySetInnerHTML`, `eval` ni `document.write`. React escapa todo el texto; transcripciones y aprendizajes se muestran como texto |
| URLs | Los contactos solo admiten `https`, `mailto` y `tel` (`javascript:` se rechaza; está probado). `target="_blank"` siempre con `rel="noopener noreferrer"`. Los nombres de archivo de medios se validan (sin `/` ni `..`) |
| Entradas | Límites de longitud y validación en el nombre (24), los aprendizajes (1000) y los avances (1500); el simulador no guarda las respuestas |
| Datos guardados | IndexedDB se valida y normaliza al cargar; si el formato es desconocido, se ofrece reiniciar. Hay borrado total. No se guarda cómo se siente la persona |
| Secretos | No hay ninguno en el código ni en el bundle (la única coincidencia era el tipo `password` de React). Las variables `VITE_*` son públicas y solo contienen configuración |
| Source maps | No se publican en producción |
| CSP y cabeceras | Definidas en `vite.config.ts` (`CABECERAS_SEGURIDAD`) y **verificadas**: la app funciona sin errores bajo `script-src 'self'` (sin scripts en línea ni eval) y con `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y COOP. **Deben configurarse en el servidor real** (docs/08) |
| Progreso | El cliente no debe conceder progreso: hoy es local y solo afecta a la propia persona. Con backend, el servidor validará cada experiencia (backend/README.md) |
| Autenticación, sesiones, CSRF, CORS y *rate limiting* | **No aplican todavía** (no hay backend). Son requisitos obligatorios del backend: sesión segura (cookies `HttpOnly`, `Secure`, `SameSite`), protección CSRF, CORS restringido al origen de la app, límites por IP o usuario en los endpoints, contraseñas con hash adaptativo (argon2id o bcrypt) si no hay SSO institucional, y validación en el servidor con las mismas reglas puras |
| Medios en desarrollo | El middleware solo sirve tipos permitidos, admite rangos y bloquea el *traversal*. No existe en producción |

## 6. Rendimiento (build de producción, móvil 390 px, 4G lenta y CPU ×4, carga en frío)

| Ruta | LCP | CLS | TBT | JS transferido | Total | Videos al cargar |
|---|---|---|---|---|---|---|
| `/` | 1,5 s | 0,011 | 0 ms | 120 KB | 202 KB | 0 |
| `/emocional` | 1,9 s | **0** (antes 0,076) | 0 ms | 132 KB | 218 KB | 0 |
| `/academica` | 1,9 s | 0 | 0 ms | 143 KB | 227 KB | 0 |
| `/academica/documento/resumen` | 1,9 s | 0 | 0 ms | 145 KB | 230 KB | 0 |
| `/mi-aura` | 2,0 s | 0 | 0 ms | 125 KB | 211 KB | 0 |

Las cifras varían ±0,3 s entre ejecuciones.

**Mejoras aplicadas en F5:**
- Precarga de las dos fuentes latinas visibles al inicio: el CLS de `/emocional` bajó de 0,076 a 0.
- Favicon: elimina un 404 en cada carga.

**Comportamiento confirmado:**
- Carga diferida por ruta.
- Videos con `preload="none"`: ninguna descarga antes de pulsar.
- Solo se descargan los subconjuntos latinos de las fuentes (`unicode-range`).
- El grano es un SVG en `data:`, sin imágenes pesadas.
- Las animaciones en bucle se pausan fuera de pantalla.

**Corrección de un dato anterior:** en F3 informé de que el JS inicial era de unos 79 KB. Era el tamaño del *chunk* `index` solamente: React Router y parte de React van en otro *chunk* compartido (`validacion-*.js`, 42 KB comprimidos) que también se carga siempre. **El JS inicial real es de 120–145 KB comprimidos**, dentro del presupuesto de 150 KB pero con poco margen.

## 7. Accesibilidad y responsive

- **axe-core (WCAG 2.0/2.1/2.2 A y AA, más buenas prácticas): 0 violaciones** en 43 combinaciones: 13 rutas × móvil (390), tableta (768) y escritorio (1440), más 4 estados interactivos (celebración abierta, Mi AURA en etapa 5, inicio con un AURA ya nacida y laboratorio con comentarios).
- **Teclado:** el primer Tab va a «Saltar al contenido», que lleva al contenido principal. Hay foco visible en los 25 primeros elementos tabulables de una guía, el ejemplo desglosado se opera con teclado y el reproductor tiene atajos.
- **Estructura:** un solo `h1` y un título de pestaña en cada página auditada.
- **`prefers-reduced-motion`:** 0 animaciones en bucle en Inicio, Mi AURA y Emocional.
- **Responsive:** ningún elemento se sale del ancho de pantalla en las 13 rutas × 3 dispositivos. La comprobación se endureció en F4 para medir elementos, no solo el `scrollWidth`.
- **Contraste:** 22 pares por ámbito × 4 ámbitos en las pruebas unitarias, más la verificación en el render real con axe.
- **Subtítulos:** activos por defecto en español, en una capa propia y siempre legibles; además hay transcripción.

## 8. Problemas encontrados y corregidos en F5

| # | Problema | Cómo se detectó | Corrección |
|---|---|---|---|
| 1 | **Las alternativas de «Errores frecuentes» siempre eran visibles:** el `display: grid` de la clase anulaba el atributo `hidden`, así que el botón «revelar» no ocultaba nada | axe (contraste en elementos que debían estar ocultos) | Regla global `[hidden] { display: none !important }`; la prueba funcional ahora comprueba la visibilidad real |
| 2 | Contraste insuficiente en el texto «porque» (`opacity: 0.9`) | axe | Se eliminó la opacidad |
| 3 | CLS de 0,076 en `/emocional` por el cambio de fuente | Métricas de rendimiento | Precarga de fuentes (plugin `precargarFuentes`) |
| 4 | 404 de `favicon.ico` en cada carga | Registro de red | `public/favicon.svg` |
| 5 | Pruebas de navegador fuera del repositorio (no reproducibles) | Revisión del proceso | Versionadas en `frontend/tests/e2e/` con `npm run test:e2e` y `npm run test:auditoria` |

Sigue vigente lo corregido en fases anteriores y verificado de nuevo aquí: el desbordamiento en móvil, los subtítulos tapados, el error falso al reproducir sin gesto, el tiempo del simulador y los botones con etiquetas largas.

## 9. Riesgos y problemas conocidos (pendientes)

1. **Sin backend:** el progreso y los datos son locales (no hay sincronización, se pierden al borrar el navegador) y nada se valida en un servidor. Este es el riesgo principal para el uso institucional.
2. **Navegadores sin probar:** Safari y Firefox. Las View Transitions y `animation-timeline` degradan a navegación instantánea o contenido estático, pero no se ha verificado.
3. **Lectores de pantalla reales sin probar:** axe no sustituye a NVDA o VoiceOver.
4. **iOS:** en la pantalla completa nativa se usan los subtítulos del sistema; hay que verificarlo en un dispositivo real.
5. **Margen de JS ajustado** (145/150 KB en la página más pesada). Antes de añadir más, conviene separar el reproductor del *barrel* del sistema de diseño y revisar la división en *chunks*.
6. **Contenido:** 54 videos y 22 guías siguen pendientes. Los textos que redacté (ideas principales, guías y laboratorios) necesitan revisión docente y del equipo de bienestar.
7. **Las cabeceras de seguridad dependen del servidor:** no tienen efecto hasta configurarlas allí (docs/08).
8. **Sin ESLint:** el tipado estricto y axe cubren gran parte. Si se añade, verificar antes sus ~100 dependencias transitivas.

## 10. Siguientes pasos

1. Obtener los datos del servidor (docs/08), configurar las cabeceras y el *fallback* SPA, y desplegar `dist/`.
2. Diseñar el backend (autenticación institucional, validación del progreso y datos con consentimiento) reutilizando los módulos de dominio puros.
3. Probar con usuarios reales (estudiantes) y con lectores de pantalla; probar en Safari, Firefox, iOS y Android.
4. Producir los videos y completar las guías con revisión experta.

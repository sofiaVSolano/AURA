# 04 · Riesgos técnicos y de seguridad

Escala: **A** alto · **M** medio · **B** bajo.

## Entorno y repositorio

| ID | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| R1 | El proyecto está dentro de **OneDrive**: sincronizar `node_modules/` y `.git/` provoca bloqueos de archivos (EBUSY/EPERM), conflictos, corrupción del índice de Git y lentitud | A | Mover el código a una carpeta fuera de OneDrive (p. ej. `C:\dev\aura`) y conservar en OneDrive solo las referencias, o excluir esas carpetas de la sincronización. **Decisión D1.** |
| R2 | Sin control de versiones | A | Hacer `git init` antes de la primera línea de código, con un `.gitignore` (node_modules, dist, .env*) y un repositorio remoto privado. |
| R3 | La tilde en `EstiloAnimación` causa problemas de codificación en herramientas y URLs | B | Usar rutas ASCII para el código y los recursos. |
| R4 | La licencia de las imágenes de referencia es desconocida | M | Usarlas solo como inspiración. Las ilustraciones finales deben ser propias, encargadas o de una fuente con licencia verificada. |
| R5 | Los reels no se pudieron analizar; además, existe el riesgo de copiar diseños de terceros | M | Pedir grabaciones o capturas. Inspirarse en principios, no reproducir composiciones. |

## Cadena de suministro

| ID | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| R6 | Dependencias maliciosas, con typosquatting o abandonadas | A | Lista mínima de dependencias. Antes de añadir cada una: revisar el paquete oficial, el repositorio, los mantenedores, la última versión, `npm audit` y el árbol transitivo (`npm ls`). |
| R7 | Scripts de instalación (`postinstall`) | M | Revisar los scripts con `npm view <pkg> scripts` antes de instalar. Valorar `ignore-scripts=true` en `.npmrc` del proyecto y autorizar excepciones explícitas. |
| R8 | Versiones recién publicadas (posible secuestro de cuenta) | M | No adoptar versiones con menos de unos 7 días de antigüedad. Fijar versiones exactas, usar `package-lock.json` en Git e instalar en CI con `npm ci`. |
| R9 | Skills de agente con scripts (CDP, control de navegador) | M | Ejecutarlas solo contra `localhost`, leer los scripts antes de ejecutarlos y no usar `synced` hasta revisarla. |
| R10 | Instaladores remotos (`curl \| bash`, `npx` de paquetes desconocidos) | A | Prohibido sin revisión previa. No se ejecutó ninguno en esta fase. |

## Datos, privacidad y bienestar

| ID | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| R11 | **Datos emocionales = datos sensibles** (salud mental) | A | Minimizar los datos: el MVP funciona en local (IndexedDB) y no envía emociones a ningún servidor. Si se añade un backend: consentimiento informado explícito, cifrado y política de retención. Aplicar el marco legal de la jurisdicción (p. ej. Ley 1581/2012 en Colombia o el RGPD en la UE). **Decisión D3.** |
| R12 | Que AURA se perciba como un servicio clínico | A | Aviso visible de que AURA no sustituye la atención profesional. Ruta de **ayuda inmediata** (líneas de crisis y bienestar universitario) accesible desde cualquier pantalla del módulo emocional. Redacción que no diagnostique. |
| R13 | Gamificación dañina (rachas, castigos, comparación) | A | Principio de diseño: **Mi AURA solo suma**. Las pausas tienen un estado propio ("reposo") igual de bello, no hay rankings y los registros de emociones no tienen valor positivo ni negativo. |
| R14 | Secretos en el repositorio (claves de video o de backend) | M | `.env` fuera de Git, `.env.example` sin valores reales y escaneo de secretos (gitleaks) en CI. |
| R15 | XSS en el contenido de las guías o ejercicios, si se renderiza HTML o Markdown de usuarios | M | Contenido editorial compilado (MDX/JSON) en lugar de HTML de usuarios. Si hay entrada libre: escapar por defecto y aplicar una CSP estricta. |

## Rendimiento y accesibilidad

| ID | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| R16 | El avatar animado (desenfoque, grano, partículas) consume CPU/GPU en equipos modestos | M | SVG/CSS optimizados, ritmo bajo, pausa cuando la pestaña no es visible y una versión estática con `prefers-reduced-motion`. WebGL solo si hace falta, con alternativa. |
| R17 | Videos pesados que afectan a los datos móviles y al LCP | M | Carga diferida, póster ligero, varias resoluciones, sin reproducción automática con sonido. Subtítulos y transcripción obligatorios. |
| R18 | Fondos con grano en imágenes grandes (como las referencias de 2048 px) | B | Generar el grano con un filtro SVG o un mosaico pequeño (<10 KB). |

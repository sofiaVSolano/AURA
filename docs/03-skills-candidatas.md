# 03 · Skills candidatas y justificación

## Método y seguridad

- `find-skills` funciona ejecutando `npx skills find`, que **descarga y ejecuta un paquete remoto**. Antes de hacerlo se revisaron sus metadatos en npm sin ejecutarlo:
  - `skills@1.9.0`, repositorio `vercel-labs/skills`, mantenedores `rauchg` y `quuu`, 3 dependencias directas (`tar`, `yaml`, `nostics`). Última publicación: 2026-11-16, es decir, 4 días antes de esta revisión.
  - Decisión: **no se ejecutó**. Se consultó en su lugar el catálogo público https://skills.sh/ (en modo lectura). Su búsqueda por parámetro (`?q=`) no devuelve resultados, así que solo se revisó el ranking visible.
- Las skills instaladas se cruzaron con `~/.agents/.skill-lock.json` (origen en GitHub y hash) y se buscaron scripts ejecutables en cada una.
- **No se instaló ni se ejecutó ninguna skill ni ningún script.**

## Skills ya instaladas

| Skill | Origen | Scripts | Valoración para AURA |
|---|---|---|---|
| **impeccable** | pbakaus/impeccable | 5 JS (control de navegador) | ✅ **Recomendada (principal).** Cubre auditoría UX, jerarquía, color, tipografía, motion, accesibilidad, responsive, estados vacíos y sistemas de diseño (DESIGN.md y tokens). Es la que más se ajusta a una app con pantallas de producto. |
| **emil-design-eng** | emilkowalski/skills | 0 (solo instrucciones) | ✅ **Recomendada.** Criterios para decidir animaciones (duración, easing, cuándo no animar). Riesgo mínimo porque no trae código. |
| **svg-animations** | supermemoryai/skills | 0 (solo instrucciones) | ✅ **Recomendada para Mi AURA.** Gradientes, filtros (`feTurbulence`, `feGaussianBlur`), morphing y máscaras en SVG: lo necesario para la esfera difuminada y su evolución. |
| design-taste-frontend | leonxlnx/taste-skill | 8 `.mjs` (inspector vía Chrome DevTools Protocol) | 🟡 **Solo para la landing pública**, si la hay. La propia skill declara que no está pensada para pantallas de app. Revisar los scripts antes de ejecutarlos. |
| redesign-existing-projects | leonxlnx/taste-skill | 0 | ⛔ No aplica: no hay un proyecto previo que rediseñar. |
| hyperframes / media-use / remotion-best-practices / it-reelsmaker | heygen-com, remotion-dev, … | 6–69 cada una | ⛔ Son para producir video, no para la web. Solo serían útiles si el equipo genera los videos de acompañamiento (decisión D4). |
| page-mascot | nilbuild/page-mascot | 6 | ⛔ No aplica: Mi AURA es una esfera abstracta, no un personaje chibi. |
| synced | No verificado en esta revisión | 172 archivos de script | ⛔ **No usar** hasta revisar su origen y su contenido. |

## Candidatas del catálogo (no instaladas)

| Skill | Instalaciones | Motivo | Recomendación |
|---|---|---|---|
| emilkowalski/skills@**review-animations** | 323.9K | Mismo autor que una skill ya instalada; sirve para revisar animaciones | 🟡 Opcional para la fase de pulido (F6). Revisar su SKILL.md antes de instalar. |
| emilkowalski/skills@**improve-animations** | 288.6K | Igual que la anterior | 🟡 Opcional; probablemente se solapa con `emil-design-eng`. |
| vercel-labs/agent-skills@**web-design-guidelines** | 885.6K | Fuente oficial (Vercel) | 🟡 Candidata para la auditoría de F6; su contenido no se ha verificado. |
| anthropics/skills@frontend-design | 1.1M | Fuente oficial | ⛔ Se solapa con `impeccable` y `design-taste-frontend`. |
| Accesibilidad (WCAG) | — | **No aparece ninguna en el ranking visible** | Cubrir con `impeccable` más herramientas deterministas (axe-core, Lighthouse) en lugar de con una skill. |
| Rendimiento web | — | Solo `vercel-react-best-practices`, cuyo alcance no se ha verificado | Cubrir con Lighthouse/Web Vitals y presupuestos (doc 06). |

## Recomendación final

Usar **impeccable + emil-design-eng + svg-animations**, que ya están instaladas, por lo que no hay que instalar nada. Si en la fase F6 hace falta, valorar `review-animations` o `web-design-guidelines`, siempre después de leer su SKILL.md y revisar sus scripts.

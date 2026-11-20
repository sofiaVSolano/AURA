# 05 · Arquitectura y estructura propuestas

> Es una propuesta y está pendiente de aprobación (decisión D2). No se ha instalado nada.

## Stack recomendado

| Capa | Recomendación | Por qué |
|---|---|---|
| Base | **Vite + React + TypeScript** | La parte interactiva pesa más que la de contenido: ejercicios, estado del avatar y progreso. El ecosistema es maduro y tiene pocas dependencias. Node 24 y npm ya están disponibles. |
| Enrutado | React Router | Tres áreas con subrutas (categorías, situaciones, guías y ejercicios). |
| Estilos | **CSS nativo con custom properties (tokens) + CSS Modules** | Sin dependencias. Los temas emocional y académico, y los modos claro y oscuro, se resuelven con variables. |
| Animación | **CSS + Web Animations API + View Transitions API** primero; `motion` (motion.dev) solo si aparece una necesidad concreta | Cada dependencia debe justificarse (R6). |
| Avatar | **SVG** (gradiente radial con `feTurbulence` y `feGaussianBlur`) | Se ajusta a la referencia estilo1.2, es ligero y accesible. Canvas/WebGL quedaría como mejora opcional. |
| Contenido | Archivos **JSON/MDX** versionados en el repositorio | Es contenido editorial, revisable y sin necesidad de un CMS al principio. |
| Persistencia (MVP) | **IndexedDB local** (con un envoltorio mínimo propio o `idb-keyval`, previa revisión) | Los datos emocionales no salen del dispositivo (R11). |
| Calidad | ESLint, Prettier, Vitest, Testing Library, Playwright y axe-core | Pruebas, accesibilidad automatizada y E2E. |

**Alternativa:** si el contenido crece mucho y la interactividad se limita a algunos elementos sueltos, **Astro con islas de React** ofrece mejor rendimiento inicial. Ventaja de React con Vite: el estado del avatar está presente en todas las pantallas y es más sencillo compartirlo en una SPA.

**Backend (fase posterior, decisión D3):** cuentas, sincronización entre dispositivos y analítica agregada y anónima para la universidad. No forma parte del MVP.

## Estructura propuesta

```
aura/
├── docs/                         documentación (esta carpeta)
├── public/                       favicons, pósters de video
├── src/
│   ├── app/                      router, layout raíz, proveedores
│   ├── design-system/
│   │   ├── tokens.css            color, tipo, espacio, radios, motion
│   │   ├── themes.css            emocional (noche) / académico (día)
│   │   └── components/           Button, Card, Dialog, VideoPlayer, …
│   ├── features/
│   │   ├── emocional/            categorías, situaciones, videos
│   │   ├── academica/            guías, ejemplos, motor de ejercicios
│   │   └── mi-aura/              avatar, reglas de evolución, historial
│   ├── content/                  JSON/MDX de emociones, guías y ejercicios
│   ├── lib/                      almacenamiento (IndexedDB), utilidades
│   └── styles/                   reset y estilos globales
├── tests/                        e2e (Playwright) y accesibilidad
└── .npmrc / .gitignore / package-lock.json
```

## Modelo de dominio (borrador)

```ts
EmotionCategory { id, nombre, descripcion, tono }        // p. ej. ansiedad, bloqueo, orgullo
Situation       { id, categoriaId, titulo, videoIds[] }  // p. ej. "antes de la sustentación"
SupportVideo    { id, src, poster, duracion, subtitulos, transcripcion }
Guide           { id, etapa, titulo, secciones[], ejemploIds[], ejercicioIds[] }
Exercise        { id, tipo: 'ordenar'|'elegir'|'completar'|'reflexion', … }
Experience      { id, tipo: 'video_visto'|'emocion_explorada'|'guia_leida'|'ejercicio_hecho'|'pausa', fecha, refId }
AuraState       { matiz, luminosidad, capas, textura, ultimaActualizacion }   // derivado de Experience[]
```

## Mi AURA: reglas de evolución

- `AuraState` es una **función pura** del historial de `Experience`: es reproducible, se puede probar y no hay "puntos" ocultos.
- **Solo suma, nunca resta.** Explorar cualquier emoción, incluidas la tristeza o la frustración, añade color o capas. Las emociones difíciles aportan profundidad (tonos más saturados y oscuros), no deterioro.
- **Las pausas son un estado**: tras días sin actividad, la esfera pasa a un "reposo" que respira más lento. Es igual de bello y no pierde nada.
- Correspondencia inicial propuesta: la dimensión emocional define el **matiz y la textura**; la académica, la **luminosidad y el número de capas o anillos**. Así ambas dimensiones se ven conectadas en un solo objeto.

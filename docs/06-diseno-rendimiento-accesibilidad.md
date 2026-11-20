# 06 · Estrategia de diseño, rendimiento y accesibilidad

## Dirección visual

**Concepto:** *"un foco que acompaña, no que expone"*. Las referencias usan el foco y el halo para aislar a alguien que se siente juzgado (estilo1, estilo1.3). AURA invierte el gesto: el halo es el espacio propio y seguro del estudiante.

| Ámbito | Ambiente | Referencias |
|---|---|---|
| AURA emocional | Noche: fondo azul noche profundo, luz cian pálida y halos violetas | estilo1.3, estilo1 |
| AURA académica | Día y tono editorial: crema, ocre y tinta, con grano | estilo1.1 |
| Mi AURA | Esfera con gradiente azul→violeta y grano | estilo1.2 |
| Común | Ilustración plana con grano, siluetas simples y acento coral | todas |

### Tokens de color iniciales (medidos en las referencias; falta validar el contraste)

| Token | Valor | Origen |
|---|---|---|
| `--noche-900` | `#1E163B` | estilo1.3 (fondo) |
| `--noche-700` | `#3C386A` | estilo1 |
| `--violeta-500` | `#8177C4` | estilo1 |
| `--violeta-300` | `#ADABE2` | estilo1 |
| `--luz-100` | `#DBF5FC` | estilo1.3 (foco) |
| `--aura-azul` | `#407AF9` | estilo1.2 |
| `--aura-violeta` | `#927AFA` | estilo1.2 |
| `--tinta-900` | `#27200E` | estilo1.1 |
| `--ocre-500` | `#B5943D` | estilo1.1 |
| `--crema-200` | `#F2D492` | estilo1.1 |
| `--coral-400` | coral (falta medirlo aislado) | acento en estilo1, 1.1 y 1.3 |

Todo par de texto y fondo debe cumplir **4.5:1** (texto normal) o **3:1** (texto grande y componentes de interfaz). Por ejemplo, `--ocre-500` sobre `--crema-200` probablemente **no** llega al mínimo para texto y debe reservarse para elementos decorativos.

**Tipografía:** una sans humanista, legible y cálida, autoalojada (sin dependencias de terceros en tiempo de ejecución), con una variable como máximo. Texto base de 16–18 px e interlineado de 1.5 o más.

## Principios de motion

1. **La respiración como ritmo base:** el avatar late en ciclos de 4–6 s, cercanos a una respiración calmada, con easing suave.
2. **Interfaz ágil:** las microinteracciones duran 120–200 ms y las transiciones entre vistas 250–400 ms, con `ease-out` al entrar y salidas más cortas que las entradas.
3. **El foco como transición:** al entrar en una situación emocional, un halo o cono se abre (View Transitions) y el resto se atenúa.
4. **Cambio de ámbito:** pasar de la parte emocional (noche) a la académica (día) es un "amanecer", una transición de tema animada (relacionada con el reel #6).
5. **Animar solo `transform`, `opacity` y `filter`**, y nunca algo que bloquee la lectura.
6. **`prefers-reduced-motion`:** el avatar se muestra estático (con su estado visible igualmente) y las transiciones se convierten en fundidos cortos o desaparecen.
7. **Sin destellos** de más de 3 por segundo (WCAG 2.3.1).

## Accesibilidad (objetivo: WCAG 2.2 AA)

- Navegación completa con teclado, foco visible y personalizado (que no quede tapado; criterio 2.4.11), un enlace para saltar al contenido y un orden lógico.
- **Videos:** subtítulos sincronizados, transcripción, controles accesibles y nada de reproducción automática con sonido.
- **Avatar:** `role="img"` con una descripción textual de su estado ("Tu AURA hoy: violeta suave, tres capas, en reposo").
- **Ejercicios:** se pueden resolver sin arrastrar (criterio 2.5.7) y los errores se explican con texto, no solo con color.
- Objetivos táctiles de 24×24 px como mínimo, que en la práctica serán 44 px.
- Lenguaje claro y no culpabilizador, y `lang="es"`.
- Verificación: axe-core en las pruebas, revisión manual con NVDA y con teclado, y Lighthouse.

## Presupuestos de rendimiento

| Métrica | Objetivo (móvil de gama media, 4G) |
|---|---|
| LCP | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| JS inicial (gzip) | < 150 KB |
| CSS inicial | < 30 KB |
| Animación del avatar | 60 fps en escritorio y ≥ 30 fps en gama baja; se pausa con `visibilitychange` |

Tácticas: dividir el código por área (`emocional`, `academica`), cargar los videos de forma diferida con póster AVIF/WebP, autoalojar las fuentes con `font-display: swap`, generar el grano con un filtro SVG en lugar de imágenes y usar `content-visibility` en listas largas.

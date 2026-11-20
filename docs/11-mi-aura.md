# 11 · Bienvenida, onboarding y Mi AURA (F2)

## Rutas

| Ruta | Qué hace |
|---|---|
| `/` | Bienvenida: la escena responde al puntero, la frase está siempre visible, saluda a tu AURA si ya nació, el **camino guiado por scroll** muestra al personaje transformándose en sus 5 etapas y hay dos puertas (emocional y académica) que se inclinan en 3D |
| `/comenzar` | Onboarding de 7 pasos con vista previa viva: nombre, colores, forma y expresión, momento del proyecto (opcional), cómo llegas (opcional, **no se guarda**) y nacimiento |
| `/mi-aura` | El avatar actual (interactivo), cómo crece, la personalización, la galería y los recuerdos, tus datos, la celebración de cada transformación y un simulador (solo en desarrollo) |

En el resto de páginas, tu AURA aparece en miniatura en la cabecera.

## Código (`src/features/mi-aura/`)

```
dominio/   modelo.ts (variantes, etapas, experiencias, decoraciones) · evolucion.ts (reglas puras) · validar.ts
datos/     repositorio.ts — interfaz asíncrona; IndexedDB, o memoria si no está disponible
estado/    MiAuraContexto.tsx — carga, errores, guardado y punto único registrarExperiencia()
avatar/    Personaje.tsx + formas.ts — personaje SVG evolutivo
componentes/  Selectores, ComoCrece, Personalizacion, Galeria, TusDatos, SimuladorDev (solo dev)
onboarding/   OnboardingPage
```

## Evolución

Es una **función pura del historial** (`calcularEvolucion`): reproducible, probada y ejecutable en un futuro servidor.

| Etapa | Qué aparece | Cómo se obtiene |
|---|---|---|
| 1 Origen | Esfera orgánica difuminada | Al nacer |
| 2 Descubrimiento | Silueta con la forma elegida | 2 experiencias significativas |
| 3 Reconocimiento | Rasgos faciales (expresión elegida) | 5 experiencias, de ≥ 2 tipos |
| 4 Transformación | Mejillas, patrón y detalle propio de la forma | 9 experiencias, de ≥ 3 tipos |
| 5 Mi AURA | Contorno definido; admite aurora | 14 experiencias, de ≥ 3 tipos, **en lo emocional y en lo académico** |

**Experiencias que cuentan:**
- Explorar un contenido.
- Escribir una reflexión.
- Compartir una experiencia.
- Completar un ejercicio.
- Practicar la sustentación.
- Registrar un avance.

**Reglas:**
- **Cada par (tipo, contenido) cuenta una sola vez:** repetir no suma, y los clics y el tiempo conectado no cuentan.
- **Nada resta:** no hay estados negativos. Tras 7 días sin actividad, tu AURA entra en *reposo* (respira más lento y se muestra un mensaje cálido), sin perder nada.
- **Consistencia:** el nombre, los colores, la forma y la expresión se conservan en todas las etapas. Cada etapa añade capas que aparecen de forma continua (opacidad y transformaciones), sin cambios bruscos.

**Elementos desbloqueables:**

| Elemento | Cómo se desbloquea |
|---|---|
| Estrellas | Practicar la sustentación una vez |
| Luciérnagas | Escribir 2 reflexiones |
| Hojas | Registrar 2 avances |
| Anillo orbital | Completar 3 ejercicios |
| Flor | Compartir una experiencia |
| Aurora | Llegar a la etapa Mi AURA |

La interfaz explica cómo se obtiene cada uno.

## Datos y privacidad

- Se guardan las preferencias, el estado del onboarding (y el momento del proyecto, si se elige), las experiencias (`tipo`, `dimension`, `refId`, `fecha`) y la última etapa ya celebrada.
- **No se guarda cómo te sientes** en el onboarding. Las experiencias no almacenan el contenido de las reflexiones: eso será responsabilidad de cada módulo (F3), con borrado propio.
- **Validación al cargar:** los datos guardados en el navegador no son confiables, así que se normalizan (los valores desconocidos vuelven a su valor por defecto y las experiencias inválidas se descartan). Si el formato no es reconocible, se ofrece **empezar de nuevo**; nunca se borra en silencio.
- Hay un botón «Borrar todos mis datos», con confirmación.
- Si el navegador no permite IndexedDB (por ejemplo, en modo privado), la app funciona en memoria y avisa de que no se guardará.

## Seguridad del progreso

- **Hoy no hay autenticación ni servidor, y no se simula ninguna.** El progreso vive en el dispositivo y solo afecta a lo que ve la propia persona, de modo que alterarlo no perjudica a nadie.
- Todo el progreso entra por `registrarExperiencia()`. Con backend, ese punto enviará el evento al servidor, que verificará la experiencia (p. ej. un ejercicio realmente completado) y calculará la etapa con el mismo `evolucion.ts`. **El cliente nunca concederá progreso por sí mismo.**
- El simulador de experiencias solo existe con `import.meta.env.DEV` y no entra en el build de producción.

## Motion

| Elemento | Comportamiento |
|---|---|
| Personaje | Respira y parpadea; la mirada y la cabeza siguen al puntero (rAF, sin re-render); al tocarlo, salta con estiramiento; al transformarse, lanza anillos de luz una vez; las decoraciones titilan u orbitan. Todo se pausa fuera de pantalla |
| Inicio | Entrada escalonada (personaje, frase, texto, acciones); paralaje del halo; camino guiado por scroll; puertas con inclinación 3D y brillo que sigue al cursor; indicador para bajar |
| Onboarding | Cada paso entra desde la dirección del avance; la barra de progreso se rellena; la vista previa se transforma en vivo y, al final, renace como esfera |
| `prefers-reduced-motion` | Personaje estático (su estado sigue visible y descrito), sin paralaje ni inclinación, y fundidos breves |

## Accesibilidad

- El personaje es un `role="img"` con una descripción completa (nombre, etapa, colores, forma, expresión y decoraciones). En su versión interactiva es un `<button>` («Toca para saludar») con anuncio cortés.
- Todos los selectores son radios o casillas nativos (navegables con teclado), con foco visible y nombre de color en texto.
- En el onboarding, el foco va al título de cada paso. La celebración usa el `Modal` accesible.

## Pruebas

- `tests/mi-aura.test.ts` (8 pruebas) cubre:
  - etapas por cantidad y diversidad, y ambas dimensiones para Mi AURA;
  - que repetir no suma y que las pausas no restan;
  - los hitos con sus contribuciones;
  - la normalización de datos manipulados;
  - la validación del nombre.
- **E2E de humo** con Edge headless y DevTools Protocol, sin dependencias (14 comprobaciones, 0 errores de consola): onboarding completo, persistencia tras recargar, que repetir no suma, celebración, llegada a la etapa 5, galería, móvil real a 390 px sin desbordamiento, avatar en la cabecera y borrado. El script vive fuera del repositorio; se propone incorporarlo como prueba versionada en F6 (requiere decidir la herramienta).

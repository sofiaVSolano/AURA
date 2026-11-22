# 12 · AURA emocional y videos (F3)

## Rutas

| Ruta | Qué hace |
|---|---|
| `/emocional` | «¿Cómo te sientes hoy?»: constelación de 7 orbes orgánicos con desfase vertical, paralaje según el puntero y descripción al acercarse. **Elegir solo navega; no se guarda.** Incluye «Tus guardados» y un aviso de que no es un espacio de diagnóstico |
| `/emocional/:categoria` | El orbe viaja desde la entrada (View Transitions). Muestra las situaciones en filas editoriales con portada (en blanco hasta que exista), idea principal, duración, estado, «Guardado» y progreso visto, además de las categorías relacionadas |
| `/emocional/:categoria/:subtema` | Reproductor (o marco en blanco si el video está en preparación), guardar para después, siguiente, «¿Qué te llevas de aquí?» (aprendizajes privados) y más de la categoría |

Las tres rutas se cargan de forma diferida. (Corrección en F5: el JS inicial real es de 120–145 KB comprimidos, no 79 KB; ver docs/14 § 6.)

## Contenido

- **Taxonomía:** `content/emocional/categorias.json` contiene 7 categorías × 4 subtemas, con su color (sin rojos de alarma) y las categorías relacionadas.
- **Un video por subtema:** `content/videos/emocional/<categoria>/<subtema>/` con `metadata.json`, `script.md`, `storyboard.md`, `animation.md` y `assets/`. El esquema v2 está en docs/10.
- **Estado actual: los 28 videos están en `idea`. Ninguno se publica ni se muestra como disponible.** Cada `script.md` trae la idea principal y una estructura de 45 s con pausas, pendiente de redacción y de revisión por el equipo de contenido y bienestar.
- **Las pruebas exigen:**
  - correspondencia 1:1 entre la taxonomía y las carpetas, sin carpetas huérfanas;
  - los tres documentos en cada carpeta;
  - duración objetivo de 30–360 s y máximo absoluto de 360 s (6 min);
  - que todo video publicado tenga sus archivos en disco.

## Reproductor (`design-system/components/ReproductorVideo`)

| Aspecto | Comportamiento |
|---|---|
| Controles | Reproducir/pausar, progreso con búsqueda, tiempo y duración, volumen y silencio, subtítulos, siguiente video, pantalla completa |
| Estados | Inicial (botón grande sobre la portada), cargando (respiración), error con «Reintentar», y fin con el siguiente video |
| Autoplay | **Nunca reproduce solo.** Si el navegador exige un gesto, vuelve a ofrecer el botón (no muestra un error) |
| Carga | `preload="none"`: no descarga nada hasta pulsar; la portada se muestra como `poster`. La fuente WebM (AV1/VP9), si existe, se ofrece antes que la MP4 |
| Subtítulos | Activos por defecto en español. Se dibujan en una capa propia sobre los controles, porque los nativos quedaban tapados |
| Teclado | Con el foco dentro: espacio/K reproducir, ←/→ ±5 s, M silencio, C subtítulos, F pantalla completa. Controles nombrados, con `aria-pressed` y rango con `aria-valuetext` |
| Progreso | Se informa cada ~4 s, al pausar y al terminar. Al pasar del 90 % de un video **publicado**, suma una sola vez a Mi AURA (`contenido-explorado`) |

## Datos personales (almacén `emocional`)

- Se guardan los videos guardados, el progreso visto (la fracción máxima, que nunca retrocede) y los aprendizajes (texto, video y fecha).
- **No se guarda cómo se siente la persona.** Los aprendizajes son voluntarios, privados y borrables uno a uno, y se borran también con «Borrar todos mis datos» en Mi AURA.
- El primer aprendizaje de cada video suma a Mi AURA como `reflexion-registrada`. Escribir varios sobre el mismo video no suma de nuevo, y borrar uno no resta progreso.
- Los datos se validan al cargar, igual que en Mi AURA. El almacén local es ahora genérico (`src/lib/almacenLocal.ts`, base `aura` v2) y lo comparten ambos módulos mediante `useEstadoPersistente`.

## Medios

- **Desarrollo:** un middleware de Vite sirve `content/videos/**` en `<base>media/videos/`.
  - Solo atiende tipos permitidos (mp4, webm, vtt, webp, avif, jpg, md y txt); `metadata.json` no se sirve.
  - Soporta peticiones por rangos (206), necesarias para buscar en el video.
  - Bloquea el *path traversal*: verificado con `curl --path-as-is`, devuelve 404.
- **Producción:** `npm run build` ejecuta `scripts/publicar-medios.ts`, que copia a `dist/media/videos/` **solo los archivos de videos publicados y válidos**. El build falla si un video publicado no tiene alguno de sus archivos.
- **Video de prueba:** `npm run fixture:video` genera con ffmpeg `tests/fixtures/prueba.mp4`, que no se versiona. **No es contenido de AURA**: solo se usa en `/sistema` (desarrollo) y en el E2E.

## Pruebas

- `tests/emocional.test.ts` (5 pruebas): guardados; progreso que no retrocede y se completa una sola vez; validación y borrado de aprendizajes; normalización de datos manipulados; categorías y siguiente subtema.
- `tests/contenido.test.ts` (10 pruebas): esquema v2, duraciones, publicación, archivos en disco, taxonomía ↔ carpetas, perfiles y contactos.
- **E2E** (36 comprobaciones, 0 errores de consola, estable en ejecuciones repetidas):
  - Entrada, categoría y video pendiente.
  - Guardar y aprendizaje, con persistencia tras recargar y la experiencia sumada en Mi AURA.
  - Ruta inexistente.
  - Reproductor con clic real: subtítulos, atajos, búsqueda, silencio y siguiente.
  - Rangos 206 y móvil a 390 px sin desbordamiento.
  - Borrado total.

## Pendientes

- Producir los videos (guion → storyboard → animación → revisión) con ilustración propia, subtítulos y transcripción.
- Las portadas quedan en blanco por ahora (indicación del equipo).
- En la pantalla completa nativa de iOS (`webkitEnterFullscreen`) se usan los subtítulos del sistema. Hay que verificarlo en un dispositivo real.

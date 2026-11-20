# 10 · Contenidos: videos y perfiles institucionales

Los contenidos viven en `content/`, fuera de `src/`, y se validan en la compilación y en las pruebas (`npm test`).

## Videos de acompañamiento

**Un video por subtema, con una sola idea principal.**

```
content/emocional/categorias.json            taxonomía emocional (categorías → subtemas)
content/videos/
├── _plantilla/                              copia esta carpeta para cada video nuevo
├── emocional/<categoria>/<subtema>/
└── academico/<categoria>/<subtema>/
    ├── metadata.json                        obligatorio (esquema v2)
    ├── script.md                            narración, diálogos y textos en pantalla
    ├── storyboard.md                        escenas y duración
    ├── animation.md                         movimientos, expresiones, cámara y transiciones
    ├── assets/                              solo recursos autorizados
    └── video.mp4 · video.webm · poster.webp · subtitulos.es.vtt · transcripcion.es.md   (al publicar)
```

Los nombres van en kebab-case ASCII. Los archivos de video no se versionan en Git.

### Esquema `metadata.json` (versión 2)

| Campo | Regla |
|---|---|
| `version` | `2` |
| `id` | `"<area>.<categoria>.<subtema>"`; debe coincidir con la carpeta |
| `area`, `categoria`, `subtema` | `emocional` \| `academico`; kebab-case |
| `titulo` (≤ 90) y `descripcion` (idea principal, ≤ 280) | Obligatorios |
| `estado` | `idea` → `guion` → `storyboard` → `animacion` → `revision` → `publicado` |
| `duracionObjetivoSegundos` | 30–60 (duración a la que se ajusta el guion) |
| `duracionSegundos` | `null` o 1–60: **60 s es el máximo absoluto** |
| `archivos.video` | **Ruta del recurso**: `.mp4` (H.264/AAC) o `null` |
| `archivos.videoAlterno` | `.webm` optimizado (AV1/VP9) o `null` |
| `archivos.poster` | `.webp`, `.avif` o `.jpg`, o `null` |
| `archivos.subtitulos` | `{ "es": "subtitulos.es.vtt" }` |
| `archivos.transcripcion` | Archivo de texto o `null` |
| `perfiles` | `["*"]` o ids de perfil institucional |
| `etiquetas`, `creditos` | Listas de texto |
| `actualizado` | `AAAA-MM-DD` |

**Publicar** exige video, póster, subtítulos en español, transcripción y duración real. Además, `npm test` y `npm run build` verifican que esos archivos **existan en disco**. El catálogo solo muestra los videos publicados para el perfil activo; el resto se presenta como «En preparación» y nunca se reproduce.

### Flujo editorial

1. Copiar `_plantilla/` a `content/videos/<area>/<categoria>/<subtema>/` y ajustar `metadata.json`. Si es emocional, añadir el subtema en `categorias.json`.
2. Avanzar el estado a medida que se completan el guion (ajustado a ≤ 60 s con pausas naturales), el storyboard y la animación.
3. Revisión: lenguaje empático, no clínico ni culpabilizador; subtítulos sincronizados; recursos autorizados.
4. Añadir los archivos finales, pasar el estado a `publicado` y ejecutar `npm test`.

## Perfiles institucionales (`content/perfiles/<id>.json`)

AURA no asume una estructura de tesis única. Cada universidad o metodología es un perfil y se selecciona con `VITE_CONTENT_PROFILE` (por defecto, `default`).

| Campo | Contenido |
|---|---|
| `id`, `nombre`, `institucion` | Identificación (`id` = nombre del archivo) |
| `recursos.introduccion` | Mensaje propio de la institución (o `null`) |
| `recursos.contactos[]` | `{ nombre, descripcion, tipo: telefono\|web\|correo\|presencial, valor, horario }`. Las webs deben ser **solo `https`**; se rechaza cualquier otro esquema (p. ej. `javascript:`) |
| `proyecto.nombreTrabajo` | «tesis», «monografía», «proyecto de grado»… (o `null`) |
| `proyecto.ruta` | Id de la ruta académica (`content/academica/rutas/<ruta>.json`) según institución, disciplina o modalidad (docs/13) |

El perfil `default` usa la ruta `general` y **no tiene contactos a propósito**: AURA no inventa contactos institucionales. La interfaz lo dice con claridad y deja visible el aviso de que no es un servicio clínico.

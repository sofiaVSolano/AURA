# 13 · AURA académica (F4)

## Rutas

| Ruta | Qué hace |
|---|---|
| `/academica` | La **ruta**: 5 estaciones conectadas por un camino que se dibuja al hacer scroll, cada una con un anillo de progreso. Los temas son fichas que muestran si están explorados o en curso y si su guía está en preparación. Incluye los laboratorios (el simulador, destacado) y los avances recientes. Se recorre en cualquier orden |
| `/academica/:etapa/:tema` | La **guía** con la plantilla completa, más un índice que sigue la lectura, una marca personal («Lo estoy trabajando» / «Ya lo exploré»), el video «En un minuto», «Aplícalo a tu proyecto» y los contenidos relacionados |
| `/academica/laboratorios/:lab` | El **laboratorio**: actividades navegables en cualquier orden, con comentarios formativos |

## Plantilla de cada tema (`content/academica/temas/<tema>.json`)

| Campo | Cómo se muestra |
|---|---|
| `queEs` | Entradilla bajo el título |
| `paraQueSirve` | «Para qué sirve» |
| `queDebeIncluir[]` | Piezas desplegables |
| `comoSeOrganiza[]` | Pasos numerados |
| `ejemplo` | **Ejemplo desglosado**: texto continuo con fragmentos seleccionables (ratón o teclado) que explican su función, y una vista «todo desglosado» |
| `erroresFrecuentes[]` | Comparaciones «En lugar de…» que, al pedirlo, revelan la alternativa y su porqué |
| `recomendaciones[]` | Lista |
| `dependeDe[]` y `orientativo[]` | «**Depende de tu institución**»: normas que **no son universales** y datos marcados como *orientativos* |
| `laboratorio` | «Actividad práctica» enlazada |
| `relacionados[]` | Contenidos relacionados |

**Guías completas hoy:** Planteamiento del problema, Objetivos, Resumen y Preguntas del jurado. Los otros 22 temas están en la ruta con su resumen y se presentan como «Guía en preparación»; aun así, se pueden registrar avances en ellos.

## Laboratorios (`content/academica/laboratorios/<lab>.json`)

Las actividades son declarativas y un único motor las interpreta:

| Tipo | Interacción | Usado en |
|---|---|---|
| `ordenar` | Subir y bajar fragmentos (teclado; no exige arrastrar), con animación FLIP | Resumen: ordenar fragmentos |
| `clasificar` | Asignar una categoría a cada fragmento | Planteamiento: contexto, situación, causas, consecuencias, delimitación |
| `elegir` | Elegir entre opciones (incluye comparar dos versiones) | Objetivos: verbos y ambigüedad; Planteamiento: qué es investigable |
| `marcar` | Marcar elementos | Resumen: faltantes y errores; Objetivos: coherencia |
| `simulador` | Responder por escrito a preguntas del jurado: palabras, tiempo estimado en voz alta y cronómetro opcional | Simulador de sustentación |

**Retroalimentación formativa** (`dominio/evaluar.ts`):
- Muestra «X de Y aspectos bien encaminados»: no es una nota.
- Cada punto «para revisar» explica cómo mejorar.
- Los estados usan verde suave u ocre, nunca rojo.
- En el simulador, las palabras clave se detectan sin importar tildes ni mayúsculas, y el tiempo hablado se estima a 130 palabras por minuto y se compara con el sugerido.

**Voz:** la práctica es por escrito. No se usa reconocimiento de voz porque en los navegadores actuales envía el audio a servicios externos; se habilitará solo si la infraestructura lo permite de forma privada.

## Integración con Mi AURA

| Acción | Experiencia (una vez por elemento) |
|---|---|
| Revisar una actividad de laboratorio | `ejercicio-completado` (`lab:<lab>/<actividad>`) |
| Revisar una respuesta del simulador | `sustentacion-practicada` (`sim:<pregunta>`) |
| Guardar un avance en un tema | `avance-academico` (`avance:<tema>`) |
| Ver ≥ 90 % de un video académico publicado | `contenido-explorado` (dimensión académica) |

**Ruta flexible:**
- Marcar o desmarcar un tema solo sirve para orientarse: no suma puntos ni penaliza.
- No hay orden obligatorio ni estados negativos.
- Las respuestas del simulador **no se guardan**.
- Los avances son privados y se pueden borrar uno a uno o con «Borrar todos mis datos».

## Videos académicos

Usan el mismo esquema que los emocionales: `content/videos/academico/<etapa>/<tema>/`. Hay 26 carpetas, todas en `idea`. Cada idea principal **complementa la guía sin repetirla** (p. ej. Resumen: «Escríbelo al final: es el único texto que muchos leerán completo»). La duración es de 30–60 s, con un máximo de 60.

## Cómo agregar contenido sin tocar la interfaz

1. **Un tema nuevo:** añádelo a la etapa correspondiente en `content/academica/rutas/<ruta>.json` (`id`, `titulo`, `resumen`) y crea la carpeta `content/videos/academico/<etapa>/<tema>/` a partir de `_plantilla/`. Aparece en la ruta como «Guía en preparación».
2. **Su guía:** crea `content/academica/temas/<tema>.json` con la plantilla anterior. La página se genera sola.
3. **Un laboratorio:** crea `content/academica/laboratorios/<lab>.json` con actividades de los 5 tipos y enlázalo desde `laboratorio` en la guía.
4. **Otra institución, disciplina o modalidad:** crea `content/academica/rutas/<ruta>.json` y apúntala desde `proyecto.ruta` en `content/perfiles/<perfil>.json`. Los momentos del onboarding también salen de esa ruta.
5. Ejecuta `npm test` en `frontend/`. Valida esquemas, referencias cruzadas (guía ↔ ruta ↔ laboratorio ↔ relacionados) y que cada tema tenga su carpeta de video.

## Pruebas

- `tests/academica.test.ts` (7 pruebas) cubre:
  - validez del contenido y referencias cruzadas;
  - correspondencia 1:1 entre los temas y las carpetas de video;
  - la evaluación formativa de los 5 tipos (incluidos el tiempo y las tildes en el simulador);
  - el estado académico.
- **E2E** (55 comprobaciones; 0 errores de consola; estable): ruta, guía (índice, piezas, ejemplo con teclado, comparaciones, marca, avance), guía en preparación, laboratorios (ordenar con movimiento, elegir y navegar libremente), simulador, registro en Mi AURA, rutas inexistentes y móvil a 390 px.
- **La comprobación de desbordamiento** ahora mide si algún elemento se sale de la pantalla. Detectó y permitió corregir dos fallos reales: columnas de cuadrícula que no podían encogerse y botones con etiquetas largas.

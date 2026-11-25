# Animación — No sé cómo presentar resultados

## Intención

- Momento principal: Presentar resultados es contar una historia: qué buscabas, qué encontraste y qué significa.
- Recurso guía: el teatrito de papel (kamishibai): en cada capítulo entra una lámina de la historia; en el cierre, la última.
- Ritmo calmado; transiciones de 0,3–0,8 s; sin destellos (máx. 3 por segundo, WCAG 2.3.1). Nada animado pasa por encima de los textos.

## Producción

- Proyecto HyperFrames: `aura-videos/presentar-resultados` (`tools/escenas.mjs` + `_guiones/motivado-cerca/armar.py` → `tools/build.mjs`).
- Personaje: Lu con el look de «Estoy cerca del final» (`tools/kit.mjs`, `PERSONAS.lu`).
- Mezcla: voz a −20 LUFS, música a 1.0 entre frases y 0.3 bajo la voz; masterizado a −16 LUFS (loudnorm).

## Entregables

- [x] `video.mp4` (H.264/AAC, 1080p) · `poster.webp` · `subtitulos.es.vtt` · `transcripcion.es.md`

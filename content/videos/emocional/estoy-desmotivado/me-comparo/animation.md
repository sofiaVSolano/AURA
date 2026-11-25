# Animación — Me comparo con otros

## Intención

- Momento principal: Cada proyecto tiene su propio ritmo y contexto; compararte muestra solo una parte de la historia.
- Recurso guía: «el telescopio que encuentra su estrella»: en cada tarjeta de capítulo un telescopio en la azotea deja de apuntar a las estrellas ajenas y gira hasta encontrar una estrella propia, que se enciende en el capítulo 3. En el cierre Lu la mira junto al telescopio.
- Ritmo calmado; transiciones de 0,3–0,8 s; sin destellos (máx. 3 por segundo, WCAG 2.3.1). Nada animado pasa por encima de los textos.

## Producción

- Proyecto HyperFrames: `aura-videos/me-comparo` (`tools/escenas.mjs` + `_guiones/desmotivado/armar.py` → `tools/build.mjs`).
- Personaje: Lu con el look de «Estoy desmotivado» (`tools/kit.mjs`, `PERSONAS.lu`).
- Mezcla: voz a −20 LUFS, arpa a 0.6 entre frases y 0.18 bajo la voz; masterizado a −16 LUFS (loudnorm).

## Entregables

- [x] `video.mp4` (H.264/AAC, 1080p) · `poster.webp` · `subtitulos.es.vtt` · `transcripcion.es.md`

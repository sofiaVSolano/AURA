# Animación — Estoy cansado de corregir

## Intención

- **Momento principal (uno solo):** plano 2B, cuando Lu ve el tramo del camino que ya recorrió. Es el giro del video: de «no puedo más» a «estoy en medio del camino».
- El video pasa de quietud (1) a movimiento suave y avance (3–5): cada paso del bloque 3 termina con algo que se completa, se apaga o se ilumina. Sensación de progreso.
- Ritmo calmado; transiciones de 0,3–0,8 s; sin destellos (máx. 3 por segundo, WCAG 2.3.1). Zoom máx. ~5 % por plano.

## Por plano

| Plano | Movimientos | Expresión | Cámara | Salida |
|---|---|---|---|---|
| 1A | Burbujas flotan y se detienen; halo aparece | Cansancio → levanta la mirada | Empuje lento | Fundido a lila |
| 2A | Lu camina; nubes a la deriva | Tranquila | Paneo lateral lento | Corte suave |
| 2B | Luces del tramo recorrido se encienden hacia atrás | Mira atrás, alivio | Grúa ascendente | Disolvencia |
| 3A | Burbuja se separa de Lu; respiración | Calma | Plano medio estático | Número «1» entra |
| 3B | Burbujas caen en cestas; las rápidas se apagan | Concentración | Cenital | Número «2» |
| 3C | Avión de papel vuela | Leve sonrisa | Plano general | Número «3» |
| 3D | Documento se pliega; temporizador; Lu se levanta | Alivio | Plano medio | Número «4» |
| 3E | Tachados; luces en el sendero | Satisfacción tranquila | Primer plano → general | Número «5» |
| 3F | Tres viñetas que entran una tras otra | Serena | Estático | Fundido |
| 4A | Hojas que se mecen, gestos mínimos | Escucha, sonrisa | General estático | Fundido |
| 5A | Halo que se abre, luz que sube | Esperanza | Plano medio | Fundido a negro (1 s) |

Los números y títulos de cada paso (bloque 3) se ponen en **montaje** con la tipografía de AURA, arriba a la izquierda, entrando con un fundido de 0,4 s.

## Indicaciones de producción

1. **Hoja de personaje de Lu** (frente, perfil, ¾, sentada, caminando) con el prompt de estilo; úsala como referencia en todas las imágenes.
2. **Un fotograma clave por plano** (11 imágenes, 1920×1080).
3. **Imagen‑a‑video** por plano (clips de 5–10 s; los planos de 15–18 s se arman con 2 clips o con un clip + zoom lento en montaje).
4. **Locución** con el texto corrido de `script.md`.
5. **Montaje** (Remotion/HyperFrames o CapCut/DaVinci): clips, voz, música, textos en pantalla (nunca generados por IA).
6. **Subtítulos** `subtitulos.es.vtt` revisados a mano; `transcripcion.es.md` = texto corrido.
7. **Póster** `poster.webp` del plano 2B.

### Prompt de estilo (añadir a todos)

```
Flat vector editorial illustration, modern minimal style, purple and violet palette
(#3B2F7A, #5B4BB5, #8E7CE6, #B9A8FF) with magenta accent (hue 300), soft turquoise
(#6FD6D6) and soft coral (#FF8A80) accents, diagonal thin line hatching in the background,
rounded organic clouds, stylized leaf plants, small white four-point sparkles, subtle print
grain, simplified characters with dark hair, no outlines, soft circular halo of light behind
the main character, calm hopeful mood, 16:9, no text, no letters, no watermark
```

### Personaje

```
Lu, a university student around 23, dark messy hair in a loose bun, turquoise sweatshirt
with collar, pale lavender skin tone, simplified face with line eyes and tiny mouth,
consistent character design
```

### Prompts por plano

| Plano | Imagen (fotograma clave) | Movimiento (imagen‑a‑video) |
|---|---|---|
| 1A | Night room in deep purple, Lu at a desk with a laptop, soft coral speech-bubble shapes floating around her, she looks up, faint halo behind her | Bubbles drift then slow to a stop, Lu slowly raises her head, halo fades in |
| 2A | Wide landscape of rolling purple hills with a winding path going up and down, Lu walking in a low part of the path, lilac dusk sky with clouds | Lu walks slowly, clouds drift, slow lateral pan |
| 2B | High view of the winding hill path, the long stretch behind Lu glowing softly with small lights, the next hill ahead, Lu looking back, space at top for a title | Lights along the travelled path turn on one by one toward the camera, camera rises |
| 3A | Lu sitting calmly, a coral speech bubble gently detaching from her silhouette and landing on a sheet of paper, a soft round clock | Bubble floats away and lands, Lu breathes slowly, clock hand moves |
| 3B | Top-down desk with three round baskets, coral speech bubbles sorted into them, laptop and cup | Bubbles fall softly into baskets, bubbles in the first basket fade out one by one |
| 3C | Lu at the laptop sending a paper plane toward a window where a friendly teacher silhouette waits | Paper plane flies across the frame, teacher catches it and nods |
| 3D | A large document folding into itself until one glowing section remains, round timer beside it, Lu standing up toward a window | Document folds, timer fills, Lu stands and stretches |
| 3E | Close-up of a checklist with items crossed out, in the background the hill path with lights | Lines cross out items one by one, more lights turn on along the path |
| 3F | Three-panel composition: Lu sleeping peacefully, Lu eating at a table, Lu walking on campus among trees | Each panel fades in one after another, gentle breathing and walking motion |
| 4A | Lu on a campus bench talking with another student shown as a kind silhouette, stylized trees, daylight lilac sky | Leaves sway, small hand gestures, static camera |
| 5A | Dawn in pink-violet tones, Lu standing on top of a hill on the winding path looking forward, large soft halo opening behind her, empty space on the right for text | Halo expands slowly, light rises, sparkles appear gently, hair moves in the wind |

**Negativo:** `text, letters, logos, red, blood, harsh shadows, photorealistic, 3D render, flashing lights, distorted hands, extra fingers`.

### Voz y sonido

- **Locución:** español neutro latinoamericano, voz cálida y cercana (~130 palabras/min), como alguien que acompaña, no como un anuncio. Los `…` son pausas de 0,5–1 s; 1 s de silencio antes de cada número.
- **Música:** piano ambiental suave a −20 dB bajo la voz; más tenue en el bloque 1, se va iluminando (más notas, tonalidad mayor) desde el bloque 3 y sube un poco en el cierre.
- **Efectos:** sonido suave de «completado» en 3B y 3E (sin campanas estridentes); pájaros lejanos en 5A.
- **Mezcla final:** −14 LUFS integrados.

## Entregables (al publicar)

- [ ] `video.mp4` (H.264/AAC, 1080p) · opcional `video.webm` (AV1/VP9)
- [ ] `poster.webp`
- [ ] `subtitulos.es.vtt` sincronizados y revisados
- [ ] `transcripcion.es.md`
- [ ] Fuentes editables y recursos **autorizados** en `assets/` (ver decisión D6)

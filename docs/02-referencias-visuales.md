# 02 · Referencias visuales y estado de acceso

## A. Imágenes locales (`EstiloAnimación/`)

Se revisaron las cuatro imágenes. Los colores dominantes se extrajeron por cuantización (Pillow, 7 colores, % del área). Son valores medidos, no estimados a ojo.

### estilo1.jpeg — Ilustración vectorial plana, monocromo violeta
- **Escena:** una persona habla en un atril ante un grupo, con una gota de sudor (ansiedad al exponer). Un **halo circular translúcido** la rodea y la separa del entorno.
- **Composición:** simétrica y centrada; capas de nubes y colinas superpuestas; siluetas sin rostro en primer plano.
- **Textura:** **rayado diagonal fino** en el cielo y destellos de cuatro puntas.
- **Paleta:** `#8177C4` 30% · `#655EAC` 20% · `#3C386A` 18% · `#ADABE2` 13% · `#7269BD` 11%, con acentos de coral (atril) y turquesa (camisa) que no aparecen en la cuantización por su área pequeña.
- **Para AURA:** el **halo** es una metáfora directa de "aura" y sirve como motivo del avatar y del foco. Las capas planas superpuestas funcionan bien para parallax suave.

### estilo1.1.jpeg — Ilustración editorial a mano, ocre y negro
- **Escena:** un aula o sustentación con un ponente, bocadillos con "?" y "!", una mano levantada y una sombra proyectada enorme.
- **Composición:** diagonal y dinámica, con perspectiva desde el público; mucho contraste entre luz y sombra.
- **Textura:** **grano y trazo irregular** (aspecto de serigrafía).
- **Paleta:** `#27200E` 28% · `#B5943D` 27% · `#F2D492` 22% · `#92772E` 16% · `#884E30` 3%, más acentos de coral y rosa pálido.
- **Para AURA:** su tono editorial y cálido encaja con **AURA académica** (guías, ejemplos). Los bocadillos sirven como recurso para preguntas y pistas en los ejercicios.

### estilo1.2.jpeg — Gradiente con grano (azul → violeta)
- **Contenido:** un fondo sin figuras con un gradiente diagonal y **ruido tipo reacción-difusión / punteado**.
- **Paleta:** `#407AF9` → `#5B7AF8` → `#737AF8` → `#927AFA`. El verde se mantiene constante y solo cambia el rojo: el tono rota de azul a violeta con una luminosidad casi constante.
- **Para AURA:** es la **referencia más directa para "Mi AURA" como esfera difuminada**: un gradiente radial con grano, generado con `feTurbulence` en SVG o un shader, sin descargar imágenes de 2048 px.

### estilo1.3.jpeg — Foco de luz sobre fondo nocturno
- **Escena:** una persona sola y cabizbaja dentro de un cono de luz, señalada desde los lados por siluetas (juicio social).
- **Composición:** centrada, con mucho espacio negativo y un cono de luz como eje vertical.
- **Textura:** grano sutil en las formas planas.
- **Paleta:** `#1E163B` ~62% (azul noche) · `#DBF5FC` 24% (luz cian pálida) · `#221A48` 10% · `#494981` 3%, con acentos de azul `#3B86E0` aprox. y coral.
- **Para AURA:** es la base para **AURA emocional en modo oscuro**: un fondo profundo con el foco como gesto de "estar presente". Los triángulos que señalan representan agresión. **No deben usarse literalmente** en un espacio de acompañamiento; sí sirven para ilustrar una situación ("me siento juzgado/a") siempre que el siguiente paso visual sea de contención.

### Rasgos comunes
Ilustración plana con grano, siluetas sin rostro detallado, un foco o halo que aísla a la persona, y paletas frías (violeta y azul noche) con un acento cálido (coral).

## B. Reels de Instagram (`EstiloPagina/estilos.tex`)

Método: se descargó cada URL sin sesión iniciada (HTTP 200 en todos los casos). **No fue posible ver ningún video.** Solo se obtuvo el texto de la página: cuenta, caption y alt text generado automáticamente por Instagram. **Por tanto, no hay análisis de navegación, transiciones, microinteracciones ni comportamiento responsive de los videos.** Para hacerlo hacen falta grabaciones de pantalla o capturas (ver decisión pendiente D5).

| # | Reel | Acceso | Cuenta | Lo que dice el texto accesible |
|---|---|---|---|---|
| 1 | DfwXdo9u_H5 | ❌ Página vacía | — | — |
| 2 | DfnhU-qyxY6 | ⚠️ Solo texto | diego.a.does | Consejos de paleta y "squint test" (entrecerrar los ojos para comprobar la jerarquía) en sitios web |
| 3 | Df0mqL3IfMG | ⚠️ Solo texto | online.by.annie | Mejora del diseño de un sitio web de ramen (formato antes/después) |
| 4 | Dfk6kaSMrM1 | ⚠️ Solo texto | enkywebstudio | Etiquetado como "AI content"; sin descripción |
| 5 | De1njZtRl4t | ❌ Página vacía | — | — |
| 6 | Dfi-rt5Jt_R | ⚠️ Solo texto | codemure.official | POV: hacer más interesante el **cambio de tema claro/oscuro** |
| 7 | DfIV2BMoMZb | ⚠️ Solo texto | online.by.annie | Mejora del diseño de un sitio web de galletas (formato antes/después) |
| 8 | Df2yTRnsEHO | ❌ Página vacía | — | — |
| 9 | DfiFvOpscjW | ⚠️ Solo texto | enkywebstudio | Etiquetado como "AI content"; sin descripción |
| 10 | Dfti5XjTaeq | ❌ Página vacía | — | — |
| 11 | Dee1YrKocWA | ⚠️ Solo texto | louis_rlee | Herramienta que convierte un enlace en un "árbol de vóxeles" sobre un código QR, con estaciones |
| 12 | DfXzDd2Iiji | ❌ Página vacía | — | — |

**Resumen:** 0 de 12 reels se pudieron ver; 7 de 12 tienen texto descriptivo; 5 de 12 no son accesibles.

**Lo que se puede afirmar con el texto disponible (sin inferir el contenido visual):**
- El #6 apunta a una **transición animada entre temas claro y oscuro**. Es relevante porque AURA puede alternar entre un ambiente nocturno (emocional) y uno diurno (académico).
- El #11 describe un objeto que **cambia con las estaciones**. Conceptualmente se parece a la evolución de "Mi AURA", pero solo se conoce por su caption.
- El #2 refuerza el uso del "squint test" para validar la jerarquía visual.
- El #3 y el #7 son rediseños de sitios comerciales: su valor para AURA depende de lo que muestren los videos.

## C. Grabación de pantalla `EstiloPagina/EstilosPaginas.mp4` (3 min 13 s, 1920×1032)

La grabación recorre unos 15 reels: algunos de la lista (B) y otros nuevos. Se analizaron fotogramas cada 4 s, así que **las transiciones de menos de 4 s no se observaron en detalle**, y el audio no se analizó. Esto es lo que se ve:

| Reel o cuenta | Lo que se ve |
|---|---|
| diego.a.does (#2) | Tarjetas de paleta (marrón y crema, salvia y blanco roto, rojo) junto a la maqueta del sitio que generan |
| online.by.annie (#3, #7 y otro de mochi) | Interfaces **ilustradas y maximalistas**: vitrina de galletas, cajas de ramen y de mochi. El usuario **elige objetos** que se colocan en una caja o pedido. Sensación táctil |
| samansastudios | "Future of web design": escenas cinematográficas a pantalla completa (cortina roja, figura, botellas de color). El caption menciona scroll cinematográfico, 3D inmersivo e interacciones inesperadas |
| codemure (#6) | El mismo sitio ("Designing quiet interfaces for loud ideas") en modo oscuro y en modo claro. La transición exacta no se aprecia con este muestreo |
| enkywebstudio (#4, #9 y otros) | **Narrativa guiada por scroll**: el producto se mueve o transforma (café que se vierte, pasta que gira, ingredientes que flotan) mientras cambian titulares serif grandes ("Let it bloom", "Sip the unexpected", "The ingredient ballet", "Love at first twirl") |
| smartduke_technologies | Un plato que **gira como menú circular** y cambia de receta |
| polarseem.tech | Un gofre que se construye por capas ("Built on the grid"); el caption dice que el producto "se arma paso a paso" |
| louis_rlee (#11) | Árbol de vóxeles con **selector de estaciones** (primavera, verano, otoño) y muestras de color; el árbol **se pliega y se convierte** en un QR |
| web_bykaim | Remolino de chocolate y elemento circular, en escenas de producto en 3D |

**Patrones aplicables a AURA** (adaptados, no copiados):
1. **Narrativa con scroll:** cada guía académica y cada situación emocional se cuenta en escenas que avanzan con el scroll (`animation-timeline: scroll()`/`view()` nativo, con alternativa estática).
2. **Construcción por capas o paso a paso** (gofre, árbol): es la metáfora de Mi AURA, que gana capas con cada experiencia, y del proyecto de grado, que se construye por etapas.
3. **Elegir objetos con las manos** (cajas de annie): sirve para los ejercicios (ordenar o elegir elementos) y para seleccionar emociones de forma táctil, con alternativa por teclado.
4. **Estados con transformación** (estaciones y plegado del árbol): Mi AURA cambia de forma progresiva y continua, sin cortes.
5. **Tipografía display grande sobre una escena** y transición entre temas oscuro y claro (emocional ↔ académica).

**Límite deliberado:** estas referencias usan 3D y video pesados. En AURA se resolverán con SVG, CSS y WAAPI dentro del presupuesto del doc 06, sin librerías 3D.

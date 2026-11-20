# 09 · Arquitectura del código y sistema de diseño (F1)

Catálogo vivo: `npm run dev` → `/sistema`. Solo existe en desarrollo y no entra en el build.

## Arquitectura

> Desde F4, el código del cliente vive en `frontend/` (las rutas `src/…` de este documento son relativas a esa carpeta). `content/` y `docs/` están en la raíz y `backend/` está reservado.

```
src/
├── app/              Enrutado (App.tsx), estructura común (Diseno.tsx), errores, metadatos de ruta
├── design-system/    Presentación reutilizable: estilos (tokens, temas, base, motion), componentes, hooks
├── features/         Un módulo por dominio, con sus páginas y componentes propios
│   ├── inicio/  emocional/  academica/  mi-aura/  recursos/  sistema/ (solo dev)
├── content/          Acceso a datos de contenido: esquemas, validación pura y catálogos
│   ├── videos/       esquema.ts · validar.ts (puro) · catalogo.ts (Vite)
│   └── perfiles/     esquema.ts · validar.ts (puro) · perfil.ts (Vite)
├── lib/              Utilidades puras (cx, Result, validadores)
└── config/env.ts     Configuración pública por entorno
content/              Datos editoriales (fuera de src): videos/ y perfiles/  → docs/10
tests/                node:test (sin dependencias): contraste y contenidos
```

**Reglas**
- **Presentación, lógica y datos separados.** Los componentes del sistema de diseño no conocen dominios. Las páginas de `features/` componen y leen datos solo a través de `content/*`. La validación es pura (`validar.ts`) y se prueba fuera de Vite.
- **Errores explícitos.** Las operaciones que pueden fallar devuelven `Result<T>`. Los datos inválidos se excluyen y se avisan en desarrollo; nunca rompen la app. `ErrorRuta` evita las pantallas en blanco.
- **Estados.** Toda vista que dependa de datos contempla cargando, vacío, error y éxito con `EstadoVista`.
- **Tipado estricto:** `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` y `erasableSyntaxOnly`. Esta última permite que Node ejecute los `.ts` de las pruebas sin compilarlos.
- **Nombres en español,** con archivos `PascalCase.tsx` para componentes y CSS Modules junto al componente (`Componente.module.css`).
- **Ámbito visual por ruta:** `handle: { ambito, titulo }` en `App.tsx`. `Diseno.tsx` lo aplica en `<html data-ambito>`. Cualquier contenedor puede abrir un ámbito anidado con `data-ambito="..."`.
- **Base para F2–F5:** la persistencia local irá en `src/lib/` detrás de repositorios asíncronos (docs/08).

## Identidad visual

**El morado es la identidad, no el fondo de todo.** Se reserva para las acciones, el foco, los estados activos y el halo. Las superficies son claras (lavanda o papel) u oscuras (índigo), con mucho espacio.

| Ámbito | Escena de uso | Fondo | Acento |
|---|---|---|---|
| `inicio` | Primer contacto, de día | Lavanda 50 | Morado 600 |
| `academico` | Leer y escribir con calma | Papel 50 (editorial) | Morado 600 con resalte ocre |
| `emocional` | Momentos sensibles, a menudo de noche | Índigo 950 | Morado 300 con foco de luz cian |
| `mi-aura` | El espacio propio | Índigo 975 (cosmos) | Violeta 300 |

- **Tipografía** (autoalojada, licencia OFL, sin peticiones a terceros):
  - **Fraunces Variable**: serif editorial con eje óptico, para títulos y momentos.
  - **Atkinson Hyperlegible Next Variable**: diseñada para la legibilidad, para el texto.
- **Textura:** grano tipo impresión (`.textura-grano`), estático y por debajo del contenido. La opacidad la decide cada ámbito.
- **Formas:** orgánicas (`--radio-organico` y el componente `Halo`). Son geometría, no ilustración. **Las ilustraciones narrativas con personajes serán piezas reales** (decisión D6); no se imitan con SVG.
- **Frase de inicio:** «No tienes que recorrer este camino a ciegas.» (h1 de la página de inicio).

### Tokens (`src/design-system/styles/`)

| Archivo | Contenido |
|---|---|
| `tokens.css` | Primitivos: escalas de morado, violeta, lavanda, índigo, papel y tinta, acentos (luz, coral, ocre), estados (éxito, aviso, error, info), tipografía fluida, espacio en base 4, radios, sombras, motion y capas |
| `themes.css` | Tokens semánticos por ámbito (`--color-fondo`, `--color-texto`, `--color-acento`, `--color-foco`, estados…). **Los componentes solo usan tokens semánticos.** |
| `base.css` | Reset, tipografía, superficies del navegador (selección, caret, scrollbar, foco), salto al contenido |
| `motion.css` | Transiciones de vista, grano y la ruta de movimiento reducido |

**Contraste:** `tests/contraste.test.ts` lee los CSS y verifica 22 pares por ámbito: texto ≥ 4.5:1 y elementos de interfaz o foco ≥ 3:1. Si se añade un token sin contraste suficiente, la prueba falla.

## Componentes (`src/design-system/components/`)

| Componente | Uso | Accesibilidad y estados |
|---|---|---|
| `Boton`, `BotonEnlace` | Acción y navegación; variantes primario, secundario y sutil; tamaños sm, md y lg | Escala 0.97 al presionar; `cargando` mantiene el ancho y usa `aria-busy`; objetivo táctil ≥ 44 px |
| `Tarjeta`, `TarjetaEnlace` | Contenedor; variante interactiva con enlace que ocupa toda la tarjeta | Un único destino de foco; el foco se dibuja alrededor de toda la tarjeta |
| `CampoTexto`, `AreaTexto`, `GrupoOpciones` | Formularios | Etiqueta asociada, ayuda y error unidos con `aria-describedby`, `aria-invalid`, contador cortés y radios nativos (navegables con flechas) |
| `Modal` | Solo para interrupciones necesarias (p. ej. confirmar un borrado) | `<dialog>` nativo: foco atrapado, Escape, clic en el fondo y devolución del foco |
| `Navegacion` | Principal: barra inferior en móvil y cabecera desde 48rem | `aria-current`, iconos con texto |
| `Etiqueta` | Categorías y estados | Tonos según el ámbito |
| `BarraProgreso`, `PasosProgreso` | Avance de lectura y etapas | `role="progressbar"` con texto; los pasos **no tienen estados negativos** (sin empezar, en curso, explorado) |
| `EstadoVista` | Cargando, vacío, error y éxito | `role="status"` o `role="alert"`; la carga es una respiración, no un spinner |
| `ReproductorVideo` | Video de acompañamiento | `<video>` nativo, sin reproducción automática, subtítulos en español por defecto y transcripción bajo demanda (con carga y error). **Si no está publicado, muestra «En preparación»** |
| `Halo` | Composición de inicio | Decorativo (`aria-hidden`) |
| `EncabezadoPagina` | h1 de cada página, con introducción | Sin etiquetas sobre el título |
| `Icono` | Juego propio de iconos (rejilla 24, trazo 1.75) | Decorativo por defecto; con `titulo`, se anuncia |

**Avatar:** desde F2, el avatar es `features/mi-aura/avatar/Personaje` (docs/11), que reemplaza al antiguo `AvatarAura`.

**Componentes de dominio:** `features/emocional/components/TarjetaSituacion` (situación con forma orgánica del color de su categoría, sin rojos de alarma) y `features/academica/components/TarjetaEtapa` (editorial, con numeral serif; la secuencia sí aporta información).

## Motion

**Tesis:** *un foco que acompaña.*

| Rol | Implementación |
|---|---|
| **Momento principal** | En inicio, el halo se abre una sola vez detrás de la frase (`clip-path` circular, 900 ms, `ease-entrada`) |
| **Continuidad** | Transiciones de vista nativas entre rutas (fundido con desenfoque de 3 px). La esfera de AURA es un elemento compartido (`view-transition-name: esfera-aura`) entre Inicio y Mi AURA. Al cambiar de ámbito también cambia el tema |
| **Respuesta** | Presión de botón (120 ms), hover solo con puntero fino, flecha que avanza 3–4 px |
| **Ambiente** | El avatar respira cada 5.6 s; se pausa fuera de pantalla o con la pestaña oculta (`useEnVista` limpia sus observadores) |

Duraciones: 120 ms (instante), 180 ms (rápida), 280 ms (media), 420 ms (vista), 900 ms (autor) y 5600 ms (respiración). Curvas: `--ease-salida` y `--ease-entrada` (exponenciales) y `--ease-movimiento`; nunca `ease-in` en la interfaz.

**Reglas:** solo CSS y APIs nativas (View Transitions, `@starting-style`, IntersectionObserver), sin librerías. Se anima `transform`, `opacity` y, de forma acotada, `filter` y `clip-path`. El contenido es visible por defecto. **`prefers-reduced-motion`:** el avatar queda estático (su estado se sigue viendo y describiendo), las vistas solo se funden 120 ms, el halo no se anima y los bucles se detienen. Nunca hay más de 3 destellos por segundo.

**Patrones de la grabación de referencia que se reservan para F2–F4** (docs/02 § C): narrativa guiada por scroll (`animation-timeline: view()` con alternativa), construcción por capas y elección táctil de objetos con alternativa por teclado.

## Revisión de skills (antes de usarlas)

| Skill | Resultado |
|---|---|
| impeccable | Instrucciones útiles: se aplicaron `craft-floor` y `animate`. **No se ejecutó su lanzador, porque descarga un binario la primera vez** (choca con la política de docs/04). Se usó su vía alternativa: leer el contexto directamente. Dos reglas suyas chocan con el brief («grano con feTurbulence» y «ilustración real o ninguna»); según su propia norma, el brief manda: el grano se usa contenido y los personajes esperan ilustración real |
| emil-design-eng | Solo instrucciones; se aplicaron sus curvas, duraciones, escala al presionar, `@starting-style` y movimiento reducido |
| svg-animations | Solo instrucciones; se aplicó a los gradientes, filtros y respiración del avatar |

## Calidad

`npm run check` ejecuta, en orden, typecheck, pruebas (`node --test`, sin dependencias) y build. **ESLint no está instalado:** añadiría unos 100 paquetes transitivos y el tipado estricto ya cubre los casos principales. Se propone incorporarlo en F6, junto con `eslint-plugin-jsx-a11y` y axe, revisando antes la cadena de suministro.

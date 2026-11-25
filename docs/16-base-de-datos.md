# 16 · Datos que recolecta AURA y base de datos

Este documento responde dos preguntas: **qué datos recoge AURA y dónde viven**, y **cómo está organizada la base de datos SQLite** del servidor (`backend/datos/aura.db`).

Principios que se mantienen:

- solo se guarda lo necesario para acompañar a la persona;
- nunca clics, tiempo conectado ni la emoción que elige al entrar;
- el texto que se envía a la IA no se guarda;
- la persona puede descargar o borrar todo.

## 1. Inventario de datos

### En el servidor (con cuenta)

| Dato | Para qué | Tabla |
|---|---|---|
| Correo | Identificar la cuenta e iniciar sesión | `usuarios` |
| Hash de la contraseña (scrypt) | Verificar la contraseña sin guardarla en texto plano | `usuarios` |
| Fecha y versión del consentimiento | Demostrar qué aceptó la persona y cuándo | `usuarios` |
| Sesiones (hash del token, token CSRF, expiración) | Mantener la sesión de forma segura | `sesiones` |
| Personaje: nombre, colores, forma, expresión, momento del proyecto, fecha de nacimiento | Dibujar y personalizar su AURA | `aura_perfiles` |
| Decoraciones elegidas | Adornos que la persona decidió mostrar | `aura_decoraciones` |
| Experiencias significativas | Hacer crecer a su AURA (las valida el servidor) | `experiencias` |
| Videos guardados | Su lista «Guardar para después» | `emocional_guardados` |
| Progreso visto de cada video | Retomar donde quedó y contar el video como explorado | `emocional_vistos` |
| Aprendizajes escritos (voluntarios) | Su diario privado de cada video | `emocional_aprendizajes` |
| Temas marcados («lo estoy trabajando» / «ya lo exploré») | Orientarse en la ruta académica | `academica_temas` |
| Avances escritos por tema | Su bitácora del proyecto | `academica_avances` |
| Actividades de laboratorio completadas | Mostrar el avance y desbloquear la revisión de tesis | `academica_actividades` |
| Cuántas evaluaciones con IA usó (sin el texto) | Respetar el límite de 2 por actividad y 2 de tesis | `evaluaciones_ia` |
| Qué módulos guardó y cuándo | Distinguir «vacío» de «nunca guardado» al sincronizar | `modulos_guardados` |

### Solo en el navegador

- **Sin cuenta:** los mismos datos de cada módulo, en IndexedDB (`aura` → `mi-aura`, `emocional`, `academica`).
- **Borradores de las actividades «Escribe tu…» y su última evaluación con IA:** en `localStorage` (`aura:borrador:*`, `aura:evaluacion:*`, `aura:evaluacion-tesis`). Así la persona no pierde lo que escribía; no se suben al servidor.
- **Preferencias de la sesión de la mascota** (escondida, qué secciones ya comentó): en `sessionStorage`. Se borran al cerrar la pestaña.

### Lo que se envía a terceros

- **Anthropic (Claude Haiku 5.5):** solo el texto que la persona pide evaluar en un laboratorio, o el archivo de su tesis.
  - Lo envía el servidor, con la clave de `backend/.env`.
  - No se guarda en AURA y la página avisa antes de enviarlo.
- **Nada más:** no hay analítica, publicidad ni otros servicios.

### Lo que AURA **no** recolecta

- La emoción que se elige en «¿Cómo te sientes hoy?», que solo sirve para navegar.
- Las respuestas del simulador de sustentación.
- El texto y los archivos evaluados con IA.
- Clics, tiempo de uso, ubicación, dirección IP almacenada o huella del dispositivo. La IP solo se usa en memoria para los límites de peticiones.

## 2. Esquema SQLite (versión 4)

**Llaves:**

- **Llave primaria:** todas las tablas usan `id INTEGER PRIMARY KEY AUTOINCREMENT`, una llave entera e incremental que nunca se reutiliza, ni siquiera después de borrar filas.
- **Unicidad:** lo que antes era la llave natural ahora es una restricción `UNIQUE`, por ejemplo `(usuario_id, video_id)`.
- **`uid`:** los registros que también viven en el navegador (experiencias, aprendizajes y avances) conservan su identificador público en esta columna, `UNIQUE` por persona. Así el navegador nunca conoce ni depende de los ids internos.
- **Cascada:** todas las tablas personales cuelgan de `usuarios(id)` con **`ON DELETE CASCADE`**, de modo que borrar la cuenta borra todo.

```
usuarios (id) ─┬─ sesiones                token_hash UNIQUE · índices por usuario y por expiración
               ├─ modulos_guardados       UNIQUE (usuario_id, modulo) ← qué módulos guardó
               ├─ aura_perfiles           usuario_id UNIQUE (1 por persona)
               ├─ aura_decoraciones       UNIQUE (usuario_id, decoracion)
               ├─ experiencias            uid UNIQUE · UNIQUE (usuario_id, tipo, ref_id)
               ├─ emocional_guardados     UNIQUE (usuario_id, video_id)
               ├─ emocional_vistos        UNIQUE (usuario_id, video_id) · fraccion 0–1
               ├─ emocional_aprendizajes  UNIQUE (usuario_id, uid) · texto 1–1000
               ├─ academica_temas         UNIQUE (usuario_id, tema_id) · 'en-curso' | 'explorado'
               ├─ academica_avances       UNIQUE (usuario_id, uid) · texto 1–1500
               ├─ academica_actividades   UNIQUE (usuario_id, clave «lab/actividad»)
               └─ evaluaciones_ia         índice (usuario_id, clave) · solo fecha, nunca texto
vista resumen_cuentas: conteos por cuenta, sin correo ni contenido
```

**Buenas prácticas aplicadas:**

- **Tablas `STRICT`:** la base rechaza un tipo equivocado, por ejemplo texto en una columna entera.
- **`CHECK` en la propia base,** además de las validaciones del código:
  - estados, tipos de experiencia, dimensiones y módulos permitidos;
  - `fraccion` entre 0 y 1;
  - booleanos en 0 o 1;
  - longitud del correo, del nombre y de los textos;
  - fechas en formato ISO 8601;
  - formato del hash de la contraseña (`scrypt$…`).
- **Claves foráneas activas** (`PRAGMA foreign_keys = ON`) y verificadas con `PRAGMA foreign_key_check` al final de cada migración.
- **Índices** para cada búsqueda frecuente: sesión por token, por persona y por expiración, que sirve para limpiar las vencidas; experiencias por persona y fecha; evaluaciones por persona y actividad. Los `UNIQUE (usuario_id, …)` también funcionan como índices.
- **`WAL` + `synchronous = NORMAL`:** escrituras rápidas y seguras ante caídas del proceso. `busy_timeout` evita errores por bloqueos breves.
- **`PRAGMA optimize`** cada hora y al cerrar, para mantener al día las estadísticas del planificador de consultas.
- **Transacciones:** reemplazar un módulo es todo o nada.
- **Consultas preparadas:** el texto de la persona nunca se concatena en el SQL, y los nombres de tabla dinámicos solo vienen de constantes del código.
- **Ningún secreto ni contenido evaluado por IA en la base:** las contraseñas se guardan con scrypt y sal, y de las sesiones solo el hash SHA-256 del token.

**Migraciones** (`backend/src/bd.ts`):

- **Cómo corren:** son versionadas con `PRAGMA user_version` y corren cada una en su transacción al iniciar el API.
- **Autocontenidas:** cada migración escribe con el esquema de su propia versión y nunca depende del código actual, que puede cambiar.

| Versión | Cambio |
|---|---|
| 1 | Cuentas, sesiones, datos por módulo (JSON) y experiencias |
| 2 | Conteo de evaluaciones con IA |
| 3 | Cada módulo pasa de JSON a una tabla por tipo de dato (se revalida y se elimina `datos`) |
| 4 | Llaves `INTEGER PRIMARY KEY AUTOINCREMENT` (las cuentas pasan de UUID a entero), tablas `STRICT` y más `CHECK` |

La versión 4 reconstruye cada tabla: renombra la vieja, crea la nueva, copia los datos con el id nuevo de cada cuenta y elimina la vieja. Mientras dura, apaga las claves foráneas (SQLite no permite cambiarlas dentro de una transacción) y las verifica antes de confirmar. El API no cambió: `backend/src/almacen.ts` traduce el «estado» de cada módulo a filas y de filas a estado.

**Respaldo:** `aura.db` (junto con `-wal` y `-shm`) es un solo archivo. Para respaldar sin detener el API: `sqlite3 aura.db ".backup respaldo.db"`, o copiar los tres archivos con el API detenido. Guarda los respaldos fuera de carpetas públicas, porque contienen datos personales.

## 3. Revisar la base

```bash
cd backend
npm run bd:resumen   # esquema, filas por tabla y totales por cuenta (sin correos ni textos)
```

Para consultas más finas sirve cualquier cliente de SQLite, por ejemplo [DB Browser for SQLite](https://sqlitebrowser.org/), abierto **en modo solo lectura** y con el API detenido o sin escribir. La base contiene datos personales: no se copia ni se comparte fuera del servidor.

## 4. Derechos de la persona

- **Ver y descargar:** «Descargar mis datos» en Tu cuenta (`GET /api/cuenta/exportar`), que entrega todo en JSON.
- **Borrar un módulo:** «Borrar todo» en Mi AURA.
- **Eliminar la cuenta:** con su contraseña; se borran todas sus filas en cascada.

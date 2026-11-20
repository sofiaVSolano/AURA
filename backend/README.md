# AURA · backend (aún no implementado)

Esta carpeta reserva el lugar del backend. **Por ahora no contiene código**, por decisión del MVP (docs/07, D3): sin servidor, sin autenticación y con los datos solo en el navegador. Se implementará cuando se conozcan las características del servidor (docs/08).

## Responsabilidades previstas

| Área | Qué hará el backend |
|---|---|
| Identidad | Autenticación real (la institucional, si existe). Hoy no se simula ninguna |
| Progreso de Mi AURA | Recibir eventos de experiencia, **verificarlos** (p. ej. que un ejercicio se completó de verdad) y calcular la etapa con las mismas reglas puras del frontend |
| Datos personales | Guardados, aprendizajes y avances, con consentimiento, cifrado, exportación y borrado |
| Contenido | Servir o validar `content/` (videos, rutas académicas, laboratorios, perfiles institucionales) |
| Medios | Servir los videos publicados con rangos (206) y caché, o delegar en un almacenamiento de medios |

## Contrato inicial (borrador)

```
POST   /api/experiencias           { tipo, refId, dimension }   → 201 | 409 (ya contaba)
GET    /api/mi-aura                                             → estado + evolución calculada en servidor
PATCH  /api/mi-aura/preferencias   { nombre?, colorPrincipal?, … }
GET    /api/emocional | /api/academica                          → guardados, progreso, notas
DELETE /api/datos                                               → borrado total (derecho de supresión)
```

## Reutilización prevista

- **Reglas de dominio:** `frontend/src/features/*/dominio/*.ts` y `frontend/src/content/**/validar.ts` son TypeScript puro, sin DOM ni Vite. Se extraerán a un paquete compartido para que cliente y servidor apliquen exactamente las mismas reglas.
- **Contenido:** `content/` está en la raíz del repositorio precisamente para que ambos lo consuman.
- **Punto único de entrada:** en el frontend, todo el progreso pasa por `registrarExperiencia()`, y los datos por almacenes asíncronos (`src/lib/almacenLocal.ts`). Para migrar, basta con cambiar esas implementaciones por llamadas HTTP.

## Pendiente de decidir

Lenguaje y framework, base de datos y modelo de despliegue. Dependen del servidor del profesor; la lista de datos necesarios está en docs/08.

# Medios de AURA (destino de publicación)

La **fuente** de los videos es `content/videos/` (docs/10). Esta carpeta representa el **origen de medios** con el que se publica la app. En el servidor, los archivos finales se copian conservando la ruta:

```
<origen de medios>/videos/<area>/<categoria>/<subtema>/<slug>/video.mp4 · poster.webp · subtitulos.es.vtt · transcripcion.es.md
```

El origen es `<VITE_BASE_PATH>media/` o el que indique `VITE_MEDIA_BASE_URL` (docs/08). El código resuelve las URLs con `urlArchivoVideo()` y `mediaUrl()`; nunca usa rutas absolutas. Los binarios de video no se versionan en Git.

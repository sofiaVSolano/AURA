# Frontend de AURA: compila la app y la sirve con su servidor de producción (sin dependencias).
# Se construye desde la raíz del repositorio (compose.yaml). Los videos NO van en la imagen:
# content/ se monta como volumen y al arrancar se enlazan los medios publicados.

# — 1 · Compilación —
FROM node:24-slim AS compilacion
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# El catálogo lee los metadatos de content/ al compilar (los videos se excluyen en .dockerignore)
COPY content /app/content
# Solo el empaquetado: el chequeo de tipos y las pruebas se corren antes de desplegar (npm run check)
RUN npx vite build

# — 2 · Ejecución —
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app/frontend
COPY frontend/package.json ./
COPY frontend/servidor ./servidor
COPY frontend/scripts/publicar-medios.ts ./scripts/publicar-medios.ts
COPY frontend/src ./src
COPY --from=compilacion /app/frontend/dist ./dist
RUN chown -R node:node /app/frontend/dist
USER node

EXPOSE 4046
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PUERTO || 4046) + '/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Enlaza los medios publicados desde el volumen content/ y arranca el servidor
ENV MEDIOS_MODO=enlace
CMD ["sh", "-c", "node scripts/publicar-medios.ts && exec node servidor/servidor.mjs"]

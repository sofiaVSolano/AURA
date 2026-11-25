# API de AURA. Se construye desde la raíz del repositorio (compose.yaml):
#   el backend importa validadores puros de frontend/src y lee content/ (montado como volumen).
FROM node:24-slim

ENV NODE_ENV=production
WORKDIR /app/backend

# Dependencias exactas del lockfile (sin scripts de instalación: backend/.npmrc)
COPY backend/package.json backend/package-lock.json backend/.npmrc ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY backend/src ./src
# Reglas compartidas con el frontend (el package.json marca los .ts como módulos ES)
COPY frontend/package.json /app/frontend/package.json
COPY frontend/src /app/frontend/src

# La base de datos vive en un volumen (backend/datos en el servidor)
RUN mkdir -p /app/backend/datos && chown -R node:node /app/backend/datos
USER node

EXPOSE 4054
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PUERTO || 4054) + '/api/salud').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "src/servidor.ts"]

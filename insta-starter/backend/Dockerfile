# Dockerfile para Cloud Run
FROM node:18-alpine

# Instalar dependencias del sistema necesarias para sharp y otras librerías nativas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Crear directorio de aplicación
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Crear directorio para uploads temporales
RUN mkdir -p /tmp/uploads && chmod 777 /tmp/uploads

# Exponer puerto 8080 (requerido por Cloud Run)
EXPOSE 8080

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Usuario no-root para seguridad
USER node

# Iniciar aplicación
CMD ["node", "server.js"]

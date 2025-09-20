# 🚀 Guía de Setup Completo - RED-O

> **Configuración paso a paso para desarrollo local**

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener instalado:

- ✅ **Node.js** >= 16.0.0 ([Descargar](https://nodejs.org/))
- ✅ **MongoDB** >= 6.0 ([Descargar](https://www.mongodb.com/try/download/community))
- ✅ **Git** ([Descargar](https://git-scm.com/downloads))
- ✅ **Editor de código** (VS Code recomendado)

### Verificar Instalaciones
```bash
node --version    # Debe mostrar v16.x.x o superior
npm --version     # Debe mostrar 8.x.x o superior
mongod --version  # Debe mostrar v6.x.x o superior
git --version     # Cualquier versión reciente
```

## 🔧 Configuración Inicial

### 1. Clonar el Repositorio
```bash
# Clonar el proyecto
git clone https://github.com/tu-usuario/red-o-instagram.git
cd red-o-instagram

# O si descargaste como ZIP
unzip red-o-instagram.zip
cd red-o-instagram
```

### 2. Configurar MongoDB

#### Opción A: MongoDB Local
```bash
# Crear directorio para datos
mkdir -p data/db

# Iniciar MongoDB (Terminal 1)
mongod --dbpath ./data/db

# En otro terminal, verificar conexión
mongo
# Debe conectar sin errores
```

#### Opción B: MongoDB con Docker
```bash
# Ejecutar MongoDB en contenedor
docker run -d -p 27017:27017 --name mongodb mongo:7

# Verificar que está corriendo
docker ps
```

#### Opción C: MongoDB Atlas (Cloud)
1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crear cluster gratuito
3. Configurar usuario y contraseña
4. Obtener string de conexión
5. Añadir tu IP a la whitelist

### 3. Configurar Backend

```bash
# Navegar al directorio backend
cd backend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env
```

#### Editar archivo `.env` del backend:
```env
# === CONFIGURACIÓN BÁSICA ===
NODE_ENV=development
PORT=8080

# === BASE DE DATOS ===
# Para MongoDB local:
MONGODB_URI=mongodb://localhost:27017/red-o-instagram

# Para MongoDB Atlas (reemplazar con tu string):
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/red-o-instagram

# === SEGURIDAD ===
JWT_SECRET=mi-jwt-secret-super-seguro-cambiar-en-produccion
SESSION_SECRET=mi-session-secret-super-seguro

# === GOOGLE OAUTH (Opcional) ===
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# === RECAPTCHA (Opcional) ===
RECAPTCHA_SECRET_KEY=tu-recaptcha-secret-key

# === AWS (Para producción) ===
# AWS_ACCESS_KEY_ID=tu-access-key
# AWS_SECRET_ACCESS_KEY=tu-secret-key
# S3_BUCKET=tu-bucket-name
# AWS_REGION=us-east-1
```

#### Verificar Backend:
```bash
# Ejecutar servidor
npm run dev

# Debe mostrar:
# Server running on port 8080
# MongoDB connected successfully
```

### 4. Configurar Frontend

```bash
# Abrir nueva terminal y navegar al frontend
cd ../frontend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env
```

#### Editar archivo `.env` del frontend:
```env
# === API CONFIGURATION ===
VITE_API=http://localhost:8080/api

# === GOOGLE OAUTH (Opcional) ===
VITE_GOOGLE_CLIENT_ID=tu-google-client-id

# === RECAPTCHA (Opcional) ===
VITE_RECAPTCHA_SITE_KEY=tu-recaptcha-site-key

# === DESARROLLO ===
VITE_NODE_ENV=development
```

#### Verificar Frontend:
```bash
# Ejecutar aplicación
npm run dev

# Debe mostrar:
# Local: http://localhost:5174
# Network: http://192.168.1.x:5174
```

## 🧪 Verificar Instalación

### 1. Acceder a la Aplicación
- Abrir navegador en: http://localhost:5174
- Debe cargar la página de login de Red-O

### 2. Crear Usuario de Prueba
1. Hacer clic en "Crear cuenta"
2. Llenar formulario con datos ficticios
3. Hacer clic en "Registrarse"
4. Debe redireccionar al dashboard

### 3. Probar Upload de Imagen
1. Hacer clic en "Nueva publicación" o botón de cámara
2. Seleccionar una imagen (.jpg, .png, .gif)
3. Escribir descripción
4. Hacer clic en "Publicar"
5. Debe procesar la imagen y mostrar transformaciones

### 4. Verificar Procesamiento IA
1. Subir imagen con caras visibles
2. Debe aparecer análisis de reconocimiento facial
3. Ver detalles de edad, género, expresiones

## 🔍 Troubleshooting Común

### ❌ Error: "ECONNREFUSED 127.0.0.1:27017"
**Problema**: MongoDB no está corriendo
**Solución**:
```bash
# Verificar si MongoDB está corriendo
ps aux | grep mongod

# Si no está corriendo, iniciarlo:
mongod --dbpath ./data/db
```

### ❌ Error: "Module not found"
**Problema**: Dependencias no instaladas
**Solución**:
```bash
# Backend
cd backend && npm install

# Frontend  
cd frontend && npm install
```

### ❌ Error: "Access denied" o 401 Unauthorized
**Problema**: JWT_SECRET no configurado
**Solución**:
1. Verificar que existe archivo `.env` en backend
2. Verificar que `JWT_SECRET` tiene un valor

### ❌ Error: "CORS policy" en navegador
**Problema**: Frontend y backend en puertos diferentes
**Solución**:
1. Verificar que backend corre en puerto 8080
2. Verificar que frontend corre en puerto 5174
3. Verificar `VITE_API=http://localhost:8080/api` en frontend/.env

### ❌ Error: "Face detection models not loaded"
**Problema**: Modelos de IA no se descargaron
**Solución**:
- Los modelos se descargan automáticamente la primera vez
- Esperar unos segundos en la primera carga
- Verificar conexión a internet

### ❌ Imágenes no se procesan
**Problema**: Sharp no instalado correctamente
**Solución**:
```bash
cd backend
npm uninstall sharp
npm install sharp
```

## 🛠️ Configuraciones Opcionales

### Google OAuth Setup
1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto nuevo o seleccionar existente
3. Habilitar Google+ API
4. Crear credenciales OAuth 2.0
5. Configurar URLs autorizadas:
   - `http://localhost:8080/api/auth/google/callback`
   - `http://localhost:5174`
6. Copiar Client ID y Secret a archivos .env

### reCAPTCHA Setup
1. Ir a [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Registrar nuevo sitio web
3. Tipo: reCAPTCHA v3
4. Dominios: `localhost`, `127.0.0.1`
5. Copiar Site Key y Secret Key a archivos .env

### Datos de Prueba (Opcional)
```bash
# Cargar datos de ejemplo
cd backend
npm run seed

# Esto crea:
# - 5 usuarios de prueba
# - 20 publicaciones con imágenes
# - Comentarios y likes aleatorios
```

## 🚀 Scripts Útiles

### Backend
```bash
# Desarrollo con auto-reload
npm run dev

# Producción
npm start

# Ejecutar tests
npm test

# Limpiar base de datos
npm run clean

# Cargar datos de prueba
npm run seed
```

### Frontend
```bash
# Desarrollo con hot-reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Ejecutar tests
npm test

# Lint del código
npm run lint
```

### Ambos (Scripts de conveniencia)
```bash
# Instalar todas las dependencias
npm run install:all

# Ejecutar backend y frontend
npm run dev:all

# Build completo para producción
npm run build:all
```

## 📊 Monitoreo de Desarrollo

### Logs del Backend
Los logs se muestran en la terminal donde ejecutaste `npm run dev`:
- 🟢 **INFO**: Operaciones normales
- 🟡 **WARN**: Advertencias (timeouts, etc.)
- 🔴 **ERROR**: Errores que requieren atención

### Logs del Frontend
Los logs se muestran en la consola del navegador (F12):
- **Network**: Para ver peticiones HTTP
- **Console**: Para ver errores de JavaScript
- **Application**: Para ver localStorage y cookies

### Base de Datos
```bash
# Conectar a MongoDB
mongo

# Ver bases de datos
show dbs

# Usar nuestra base de datos
use red-o-instagram

# Ver colecciones
show collections

# Ver usuarios
db.users.find().pretty()
```

## 🎯 Próximos Pasos

Una vez que todo esté funcionando:

1. ✅ **Familiarízate** con la interfaz
2. ✅ **Sube imágenes** y prueba las transformaciones
3. ✅ **Explora el código** para entender la arquitectura
4. ✅ **Lee la documentación técnica** (`DOCUMENTACION_TECNICA.md`)
5. ✅ **Personaliza** colores, textos, o funcionalidades
6. ✅ **Configura OAuth** para login con Google
7. ✅ **Prepara para producción** siguiendo `AWS_DEPLOYMENT.md`

## 📞 ¿Necesitas Ayuda?

### Recursos Útiles
- 📋 [Documentación Técnica](./DOCUMENTACION_TECNICA.md)
- 🏗️ [Arquitectura del Sistema](./docs/ARQUITECTURA.md)
- ☁️ [Guía de Deployment](./AWS_DEPLOYMENT.md)
- 🔒 [Manual de Seguridad](./docs/SEGURIDAD.md)

### Contacto
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/red-o-instagram/issues)
- **Documentación**: Revisar archivos `.md` del proyecto
- **Código**: Comentarios inline en archivos fuente

---

*🎉 ¡Felicidades! Tu aplicación Red-O ya está lista para desarrollo.*

*💡 Recuerda: Este es un proyecto académico. Experimenta, modifica, y aprende.*

*📝 Última actualización: Septiembre 18, 2025*
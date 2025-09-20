# 📸 RED-O - Aplicación Web Social de Fotografías

> **Proyecto Académico**: Sistema completo de gestión y navegación de fotografías tipo Instagram con inteligencia artificial integrada.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.0.0-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-6.0%2B-green.svg)
![License](https://img.shields.io/badge/license-Academic-orange.svg)

## 🎯 **Descripción del Proyecto**

Red-O es una aplicación web social moderna que permite a los usuarios almacenar, navegar y compartir fotografías con características avanzadas de procesamiento de imágenes e inteligencia artificial. Desarrollada como proyecto académico con tecnologías web avanzadas.

### 🌟 **Características Principales**

- 🔐 **Autenticación Dual**: Login tradicional + Google OAuth
- 🤖 **IA Integrada**: Reconocimiento facial con face-api.js
- 🎨 **13 Transformaciones**: Automáticas al subir imágenes
- 📱 **Diseño Moderno**: UI/UX con glassmorphism
- 🛡️ **Seguridad Avanzada**: Hash+Salt, reCAPTCHA, rate limiting
- ⚡ **Performance**: Optimizado con Sharp y React 18

## 🛠️ **Stack Tecnológico**

### Frontend
- **React 18** - Framework de UI
- **Vite** - Build tool moderno
- **face-api.js** - Reconocimiento facial
- **React Router** - Navegación SPA

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Sharp** - Procesamiento de imágenes
- **Passport.js** - Autenticación OAuth

### Seguridad
- **bcrypt** - Hash de contraseñas
- **JWT** - Tokens de autenticación
- **Helmet** - Headers de seguridad
- **CORS** - Control de acceso

## 🚀 **Instalación y Configuración**

### Prerequisitos
- Node.js >= 16.0.0
- MongoDB >= 6.0
- Git

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/red-o-instagram.git
cd red-o-instagram
```

### 2. Configurar Backend
```bash
cd backend
npm install

# Crear archivo de configuración
cp .env.example .env
# Editar .env con tus configuraciones
```

### 3. Configurar Frontend
```bash
cd ../frontend
npm install

# Crear archivo de configuración
cp .env.example .env
# Editar .env con tus configuraciones
```

### 4. Configurar Base de Datos
```bash
# Iniciar MongoDB
mongod --dbpath ./data

# (Opcional) Ejecutar seed con datos de prueba
cd backend
npm run seed
```

### 5. Ejecutar la Aplicación
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8080

## 🔧 **Variables de Entorno**

### Backend (.env)
```env
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb://localhost:27017/instagram
JWT_SECRET=tu-jwt-secret-muy-seguro
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
RECAPTCHA_SECRET_KEY=tu-recaptcha-secret-key
SESSION_SECRET=tu-session-secret
```

### Frontend (.env)
```env
VITE_API=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=tu-google-client-id  
VITE_RECAPTCHA_SITE_KEY=tu-recaptcha-site-key
```

## 📁 **Estructura del Proyecto**

```
red-o-instagram/
├── backend/                 # Servidor Node.js
│   ├── src/
│   │   ├── config/         # Configuraciones
│   │   ├── middleware/     # Middlewares
│   │   ├── models/         # Modelos MongoDB
│   │   ├── routes/         # Rutas API
│   │   └── utils/          # Utilidades
│   ├── storage/            # Almacenamiento de imágenes
│   └── server.js           # Punto de entrada
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── styles/         # Estilos CSS
│   │   └── api.js          # Cliente HTTP
│   └── index.html          # HTML principal
├── lambda-image-processor/ # Procesador AWS Lambda
├── DOCUMENTACION_TECNICA.md # Documentación completa
└── README.md               # Este archivo
```

## 🎨 **Funcionalidades Implementadas**

### ✅ Autenticación y Seguridad
- [x] Registro con validación avanzada
- [x] Login con email/usuario + contraseña
- [x] Integración Google OAuth 2.0
- [x] reCAPTCHA v3 anti-bot
- [x] Hash de contraseñas con salt único
- [x] Protección contra ataques de fuerza bruta
- [x] Rate limiting configurable

### ✅ Procesamiento de Imágenes
- [x] Upload con validación de tipos/tamaños
- [x] 13 transformaciones automáticas:
  - Miniaturas (thumb, small, medium, large)
  - Efectos artísticos (bw, sepia, vintage)
  - Mejoras (enhanced, contrast, soft)
  - Filtros de color (cool, warm)
  - Formato social (square)

### ✅ Inteligencia Artificial
- [x] Reconocimiento facial con face-api.js
- [x] Detección de edad y género
- [x] Análisis de expresiones faciales
- [x] Landmarks faciales 68 puntos
- [x] Estadísticas de análisis automático

### ✅ Sistema Social
- [x] Timeline de publicaciones
- [x] Sistema de likes
- [x] Comentarios con threading
- [x] Perfiles de usuario
- [x] Sistema de seguimientos
- [x] Notificaciones en tiempo real
- [x] Mensajería directa

### ✅ Interfaz de Usuario
- [x] Diseño moderno con glassmorphism
- [x] Paleta de colores mindful
- [x] Sidebar de navegación
- [x] Header moderno con búsqueda
- [x] Footer informativo
- [x] Responsive design
- [x] Animaciones suaves

## 🎯 **Casos de Uso Principales**

### 1. **Registro y Autenticación**
```
Usuario nuevo → Registro → Verificación → Login exitoso
Usuario existente → Login (email/Google) → Dashboard
```

### 2. **Subida y Procesamiento de Imágenes**
```
Seleccionar imagen → Upload → Procesamiento automático → 
13 transformaciones → Reconocimiento facial → Publicación
```

### 3. **Navegación y Interacción Social**
```
Ver timeline → Explorar posts → Ver detalles → 
Cambiar filtros → Dar like → Comentar → Compartir
```

### 4. **Gestión de Perfil**
```
Ver perfil → Editar información → Ver galería personal → 
Gestionar seguidores → Configurar privacidad
```

## 🛡️ **Seguridad Implementada**

### Autenticación
- **JWT** con expiración configurable
- **OAuth 2.0** con Google
- **Hash bcrypt** con salt único por usuario
- **Bloqueo temporal** tras intentos fallidos

### Protección de Datos
- **Validación** de entrada en cliente y servidor
- **Sanitización** de datos para prevenir inyecciones
- **Headers de seguridad** con Helmet.js
- **CORS** configurado apropiadamente

### Rate Limiting
- **API calls** limitados por IP
- **Upload** de imágenes con límites
- **Login attempts** con bloqueo progresivo

## 📊 **Performance y Optimización**

### Frontend
- **Code splitting** automático con Vite
- **Lazy loading** de componentes
- **Image optimization** con Sharp
- **Bundle size** optimizado

### Backend
- **Índices** optimizados en MongoDB
- **Conexión pooling** para base de datos
- **Compression** de respuestas HTTP
- **Caching** de recursos estáticos

### Imágenes
- **Múltiples resoluciones** automáticas
- **Formato optimizado** (JPEG progresivo)
- **Compresión inteligente** según uso
- **Lazy loading** de imágenes

## 🧪 **Testing**

```bash
# Ejecutar tests del backend
cd backend
npm test

# Ejecutar tests del frontend
cd frontend  
npm test

# Coverage report
npm run test:coverage
```

## 📈 **Monitoreo y Logs**

### Logs Implementados
- **Autenticación**: Login/logout, intentos fallidos
- **Uploads**: Procesamiento de imágenes
- **Errores**: Excepciones del sistema
- **Performance**: Tiempos de respuesta

### Métricas
- **Usuarios activos**
- **Imágenes procesadas**
- **Tiempo de procesamiento**
- **Errores por tipo**

## 🔄 **CI/CD y Deployment**

### Desarrollo Local
```bash
# Modo desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

### Producción (Preparado para AWS)
- **EC2** para servidor de aplicación
- **S3** para almacenamiento de imágenes
- **Lambda** para procesamiento serverless
- **DocumentDB** para base de datos
- **CloudFront** para CDN

## 🤝 **Contribución**

### Proceso de Desarrollo
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

### Estándares de Código
- **ESLint** configurado para JavaScript
- **Prettier** para formateo automático
- **Conventional Commits** para mensajes
- **JSDoc** para documentación de funciones

## 📚 **Documentación Adicional**

- [📋 Documentación Técnica Completa](./DOCUMENTACION_TECNICA.md)
- [🏗️ Guía de Arquitectura](./docs/ARQUITECTURA.md)
- [🔒 Manual de Seguridad](./docs/SEGURIDAD.md)
- [☁️ Guía de Deployment AWS](./AWS_DEPLOYMENT.md)

## 📧 **Soporte y Contacto**

### Reportar Problemas
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/red-o-instagram/issues)
- **Bugs**: Usar template de bug report
- **Features**: Usar template de feature request

### Contacto Académico
- **Estudiante**: Carlos S
- **Proyecto**: Desarrollo Web Avanzado
- **Institución**: [Tu Universidad]
- **Año**: 2025

## 📄 **Licencia**

Este proyecto es desarrollado con fines académicos bajo la licencia MIT.

```
MIT License - Copyright (c) 2025 Carlos S

Se permite el uso, copia, modificación y distribución de este software
para fines educativos y académicos.
```

## 🏆 **Reconocimientos**

### Tecnologías Utilizadas
- **React Team** - Por el excelente framework
- **MongoDB** - Por la base de datos NoSQL
- **Face-api.js** - Por la biblioteca de IA
- **Sharp** - Por el procesamiento de imágenes

### Inspiración
- **Instagram** - Por el concepto de red social de fotos
- **Comunidad Open Source** - Por las herramientas disponibles

---

## 🚀 **Quick Start**

¿Primera vez con el proyecto? Sigue estos pasos:

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-usuario/red-o-instagram.git
cd red-o-instagram

# 2. Setup completo con un comando
npm run setup

# 3. Iniciar desarrollo
npm run dev:all
```

¡La aplicación estará corriendo en segundos! 🎉

---

*💡 **Tip**: Para una experiencia completa, configura las API keys de Google OAuth y reCAPTCHA en los archivos .env*

*📝 Última actualización: Septiembre 18, 2025*

# 📋 DOCUMENTACIÓN TÉCNICA - RED-O
## Aplicación Web Social para Almacenamiento y Navegación de Fotografías

### 📊 **1. ARQUITECTURA DE LA SOLUCIÓN**

#### **Arquitectura General del Sistema**
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React.js)                     │
├─────────────────────────────────────────────────────────────┤
│ • Interfaz de Usuario (UI/UX)                              │
│ • Componentes React (Login, Feed, PostView, etc.)          │
│ • Gestión de Estado                                        │
│ • Reconocimiento Facial (face-api.js)                      │
│ • Integración con Google OAuth                             │
│ • reCAPTCHA v3                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                         HTTP/HTTPS
                              │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)               │
├─────────────────────────────────────────────────────────────┤
│ • API RESTful                                              │
│ • Autenticación JWT + OAuth2                               │
│ • Middleware de Seguridad                                  │
│ • Procesamiento de Imágenes (Sharp)                        │
│ • Rate Limiting                                            │
│ • Validación de Datos                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────┐
                              │                 │
┌─────────────────────────────▼───┐  ┌─────────▼──────────────┐
│      BASE DE DATOS              │  │   SISTEMA DE ARCHIVOS  │
│      (MongoDB)                  │  │   (Almacenamiento)     │
├─────────────────────────────────┤  ├────────────────────────┤
│ • Usuarios                      │  │ • Imágenes Originales  │
│ • Publicaciones                 │  │ • Transformaciones     │
│ • Comentarios y Likes           │  │ • Variantes            │
│ • Notificaciones               │  │ • Miniaturas           │
│ • Mensajería                   │  │ • Metadatos            │
└─────────────────────────────────┘  └────────────────────────┘
```

#### **Stack Tecnológico**

**Frontend:**
- **React.js 18** - Framework principal de UI
- **Vite** - Build tool y bundler
- **React Router** - Navegación SPA
- **face-api.js** - Reconocimiento facial
- **Google reCAPTCHA** - Protección anti-bot

**Backend:**
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB/Mongoose** - Base de datos NoSQL
- **Sharp** - Procesamiento de imágenes
- **bcrypt** - Hash de contraseñas
- **JWT** - Autenticación
- **Passport.js** - OAuth2 Google

**Seguridad:**
- **Helmet.js** - Headers de seguridad
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Protección contra ataques
- **Salt + Hash** - Almacenamiento seguro de contraseñas

---

### 🔧 **2. DIAGRAMA DISTRIBUIDO DE COMPONENTES**

```
┌─────────────────── CAPA DE PRESENTACIÓN ───────────────────┐
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Login.jsx  │  │   Feed.jsx   │  │ PostView.jsx │     │
│  │              │  │              │  │              │     │
│  │ • reCAPTCHA  │  │ • Timeline   │  │ • Galería    │     │
│  │ • Google     │  │ • Miniaturas │  │ • Transform. │     │
│  │   OAuth      │  │ • Infinite   │  │ • Comentarios│     │
│  │              │  │   Scroll     │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Register.jsx  │  │UserProfile   │  │FaceDetection │     │
│  │              │  │   .jsx       │  │   .jsx       │     │
│  │ • Validación │  │ • Perfil     │  │ • AI Models  │     │
│  │ • Seguridad  │  │ • Galería    │  │ • Análisis   │     │
│  │              │  │ • Stats      │  │ • Landmarks  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘

┌─────────────────── CAPA DE SERVICIOS ─────────────────────┐
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ auth.js      │  │ uploads.js   │  │ social.js    │     │
│  │              │  │              │  │              │     │
│  │ • JWT        │  │ • Multer     │  │ • Likes      │     │
│  │ • bcrypt     │  │ • Sharp      │  │ • Comments   │     │
│  │ • Passport   │  │ • Transform. │  │ • Follows    │     │
│  │ • reCAPTCHA  │  │ • Validation │  │ • Timeline   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ users.js     │  │ notifications│  │ dm.js        │     │
│  │              │  │   .js        │  │              │     │
│  │ • Profiles   │  │ • Real-time  │  │ • Messages   │     │
│  │ • Search     │  │ • WebSocket  │  │ • Conversat. │     │
│  │ • Analytics  │  │ • Push       │  │ • Real-time  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘

┌─────────────────── CAPA DE DATOS ─────────────────────────┐
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ User.js      │  │Publication   │  │ Comment.js   │     │
│  │              │  │   .js        │  │              │     │
│  │ • Schema     │  │ • File Meta  │  │ • Threading  │     │
│  │ • Validation │  │ • Variants   │  │ • Moderation │     │
│  │ • Indexing   │  │ • Analytics  │  │ • Reactions  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Like.js      │  │Message.js    │  │Notification  │     │
│  │              │  │              │  │   .js        │     │
│  │ • Relations  │  │ • Encryption │  │ • Types      │     │
│  │ • Aggreg.    │  │ • Status     │  │ • Delivery   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
```

---

### 🛡️ **3. SISTEMA DE AUDITORÍA DE TRANSACCIONES**

#### **Logging y Monitoreo**
```javascript
// Middleware de auditoría automática
const auditMiddleware = (req, res, next) => {
  const auditLog = {
    timestamp: new Date(),
    user_id: req.user?.id || 'anonymous',
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    method: req.method,
    endpoint: req.originalUrl,
    params: req.params,
    body: sanitizeBody(req.body),
    session_id: req.sessionID
  };
  
  // Log en base de datos
  AuditLog.create(auditLog);
  next();
};
```

#### **Eventos Auditados**
- ✅ **Autenticación**: Login, logout, intentos fallidos
- ✅ **Registro**: Nuevos usuarios, verificaciones
- ✅ **Uploads**: Subida de imágenes, procesamientos
- ✅ **Interacciones**: Likes, comentarios, follows
- ✅ **Administración**: Cambios de configuración
- ✅ **Errores**: Excepciones, fallos de sistema

---

### 🔒 **4. SEGMENTACIÓN DE RED**

#### **Arquitectura de Red Local**
```
┌─────────────────── DMZ (Zona Desmilitarizada) ──────────────┐
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Load Balancer │    │   Web Server    │                │
│  │   (NGINX)       │────│   (Node.js)     │                │
│  │   Port: 80/443  │    │   Port: 8080    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                                  │
                            Firewall Rules
                                  │
┌─────────────────── RED INTERNA ────────────────────────────┐
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Database      │    │   File Storage  │                │
│  │   (MongoDB)     │    │   (Local FS)    │                │
│  │   Port: 27017   │    │   /storage/     │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

#### **Puertos y Servicios**
- **Frontend**: Puerto 5174 (desarrollo) / 80,443 (producción)
- **Backend API**: Puerto 8080
- **MongoDB**: Puerto 27017 (solo red interna)
- **File Storage**: Sistema de archivos local protegido

---

### 💻 **5. APLICACIÓN WEB - CARACTERÍSTICAS TÉCNICAS**

#### **Frontend React Moderno**
```javascript
// Arquitectura de componentes
src/
├── components/           # Componentes reutilizables
│   ├── Avatar.jsx       # Avatar de usuario
│   ├── FaceDetection.jsx # IA reconocimiento facial
│   ├── Feed.jsx         # Timeline principal
│   ├── Login.jsx        # Autenticación
│   ├── PostView.jsx     # Vista detallada
│   └── UserProfile.jsx  # Perfil de usuario
├── styles/              # Estilos CSS
│   ├── instagram.css    # Estilo principal
│   └── modern-auth.css  # Autenticación moderna
├── api.js              # Cliente HTTP
└── App.jsx             # Componente principal
```

#### **Funcionalidades Implementadas**
- ✅ **Autenticación Dual**: Email/Password + Google OAuth
- ✅ **reCAPTCHA v3**: Protección anti-bot
- ✅ **Reconocimiento Facial**: face-api.js con IA
- ✅ **Transformaciones**: 13 filtros automáticos
- ✅ **Sistema Social**: Likes, comentarios, follows
- ✅ **Interfaz Moderna**: Glassmorphism, gradientes
- ✅ **Responsive Design**: Móvil y desktop

#### **Procesamiento de Imágenes Avanzado**
```javascript
// 13 Transformaciones automáticas
const transformations = [
  'thumb',     // Miniatura 256x256
  'medium',    // Tamaño medio 1024px
  'large',     // Alta resolución 2048px
  'small',     // Compacto 512px
  'bw',        // Blanco y negro artístico
  'sepia',     // Efecto vintage sepia
  'vintage',   // Retro con tonos cálidos
  'enhanced',  // Mejora automática
  'contrast',  // Alto contraste
  'soft',      // Efecto suave
  'cool',      // Tonos fríos
  'warm',      // Tonos cálidos
  'square'     // Formato cuadrado 800x800
];
```

---

### 🔐 **6. MANUAL DE SEGURIDAD DE LA BASE DE DATOS**

#### **Configuración Segura de MongoDB**
```javascript
// Conexión segura con autenticación
const mongoConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin',
  ssl: true,
  sslValidate: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000
};
```

#### **Medidas de Seguridad Implementadas**
- ✅ **Autenticación Obligatoria**: Usuario y contraseña
- ✅ **Conexiones Cifradas**: SSL/TLS habilitado
- ✅ **Validación de Esquemas**: Mongoose con validadores
- ✅ **Índices Optimizados**: Performance y seguridad
- ✅ **Sanitización**: Prevención de inyección NoSQL
- ✅ **Rate Limiting**: Protección contra ataques

#### **Esquemas de Datos Seguros**
```javascript
// Ejemplo: Usuario con validaciones
const UserSchema = new Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    validate: [validator.isEmail, 'Email inválido']
  },
  password_hash: { type: String, required: true },
  password_salt: { type: String, required: true },
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: Date
});
```

---

### 🚨 **7. PLAN DE RECUPERACIÓN CONTRA DESASTRES**

#### **Estrategia de Backup**
- **Frecuencia**: Backups automáticos cada 6 horas
- **Retención**: 30 días backups diarios, 12 meses mensuales
- **Ubicación**: Múltiples ubicaciones geográficas
- **Verificación**: Pruebas de restauración semanales

#### **Procedimientos de Recuperación**
```bash
# 1. Backup de MongoDB
mongodump --uri="mongodb://localhost:27017/instagram" --out="/backup/$(date +%Y%m%d)"

# 2. Backup de archivos de imágenes
tar -czf "/backup/storage-$(date +%Y%m%d).tar.gz" /path/to/storage/

# 3. Restauración
mongorestore --uri="mongodb://localhost:27017/instagram" /backup/20250918/

# 4. Verificación de integridad
node scripts/verify-data-integrity.js
```

#### **Escenarios de Desastre**
- **Corrupción de Datos**: Restauración desde último backup válido
- **Fallo de Hardware**: Migración a servidor de respaldo
- **Ataque Cibernético**: Aislamiento, análisis forense, restauración
- **Desastre Natural**: Activación de sitio de recuperación

---

### ☁️ **8. DIAGRAMAS DE CLOUD COMPUTING**

#### **Arquitectura en AWS (Futuro)**
```
┌─────────────────── FRONTEND ──────────────────┐
│                                               │
│  CloudFront CDN ──► S3 Static Website        │
│  (Global)            (React Build)           │
└───────────────────────────────────────────────┘
                        │
┌─────────────────── BACKEND ───────────────────┐
│                                               │
│  Application Load  ──► EC2 Instances          │
│  Balancer               (Node.js API)        │
│                     ──► Auto Scaling Group    │
└───────────────────────────────────────────────┘
                        │
┌─────────────────── STORAGE ───────────────────┐
│                                               │
│  DocumentDB        ──► S3 Buckets             │
│  (MongoDB compat.)     (Image Storage)       │
│                    ──► Lambda Functions       │
│                        (Image Processing)    │
└───────────────────────────────────────────────┘
                        │
┌─────────────────── SERVICIOS ─────────────────┐
│                                               │
│  Rekognition       ──► CloudWatch             │
│  (Face Detection)      (Monitoring)          │
│  ──► SES               ──► Route 53           │
│      (Email)               (DNS)             │
└───────────────────────────────────────────────┘
```

---

### 📚 **9. MANUALES TÉCNICOS**

#### **Instalación y Configuración**
```bash
# 1. Clonar repositorio
git clone <repository-url>
cd red-o-instagram

# 2. Instalar dependencias Backend
cd backend
npm install

# 3. Instalar dependencias Frontend  
cd ../frontend
npm install

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con configuración local

# 5. Iniciar base de datos
mongod --dbpath ./data

# 6. Ejecutar aplicación
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

#### **Variables de Entorno Requeridas**
```env
# Backend
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb://localhost:27017/instagram
JWT_SECRET=tu-jwt-secret-seguro
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
RECAPTCHA_SECRET_KEY=tu-recaptcha-secret

# Frontend
VITE_API=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=tu-google-client-id
VITE_RECAPTCHA_SITE_KEY=tu-recaptcha-site-key
```

---

### 🔧 **10. PLAN DE MANTENIMIENTO**

#### **Mantenimiento Preventivo**
- **Diario**: Monitoreo de logs y métricas
- **Semanal**: Actualización de dependencias de seguridad
- **Mensual**: Optimización de base de datos
- **Trimestral**: Auditoría de seguridad completa

#### **Tareas de Mantenimiento**
```bash
# Limpieza de logs antiguos
find /var/log -name "*.log" -mtime +30 -delete

# Optimización de MongoDB
db.runCommand({compact: 'users'})
db.runCommand({compact: 'publications'})

# Análisis de rendimiento
npm run analyze-bundle
npm run performance-audit

# Actualización de seguridad
npm audit fix
npm update
```

---

### 👥 **11. PLAN DE CAPACITACIONES PARA IT**

#### **Módulo 1: Fundamentos Técnicos**
- **Duración**: 2 semanas
- **Contenido**: React, Node.js, MongoDB
- **Prácticas**: Desarrollo de componentes básicos

#### **Módulo 2: Arquitectura del Sistema**
- **Duración**: 1 semana  
- **Contenido**: API REST, Autenticación, Base de datos
- **Prácticas**: Análisis de flujos de datos

#### **Módulo 3: Seguridad y Deployment**
- **Duración**: 1 semana
- **Contenido**: Seguridad web, CI/CD, Monitoreo
- **Prácticas**: Configuración de entornos

#### **Módulo 4: Mantenimiento y Troubleshooting**
- **Duración**: 1 semana
- **Contenido**: Debugging, Performance, Escalabilidad
- **Prácticas**: Resolución de problemas reales

---

## 📊 **RESUMEN DE CARACTERÍSTICAS IMPLEMENTADAS**

### ✅ **Funcionalidades Core Completadas**
1. **Autenticación Robusta**: Hash+Salt, Google OAuth, reCAPTCHA
2. **Procesamiento IA**: 13 transformaciones automáticas con Sharp
3. **Reconocimiento Facial**: face-api.js con análisis completo
4. **Sistema Social**: Likes, comentarios, seguimientos
5. **UI/UX Moderna**: Glassmorphism, gradientes, responsive
6. **Seguridad Avanzada**: Rate limiting, validaciones, CORS
7. **Documentación Completa**: Arquitectura, deployment, manuales

### 🎯 **Cumplimiento de Requerimientos Académicos**
- ✅ **HTML/CSS/JavaScript Avanzado**
- ✅ **Framework React con Hooks**
- ✅ **Base de Datos NoSQL (MongoDB)**
- ✅ **API REST con Express**
- ✅ **Integración de APIs de Terceros**
- ✅ **Procesamiento de Imágenes**
- ✅ **Inteligencia Artificial (face-api.js)**
- ✅ **Seguridad Implementada**
- ✅ **Documentación Técnica Completa**

---

*📝 Documentación generada automáticamente el 18 de Septiembre, 2025*
*🔗 Proyecto Académico - Red-O Social Network*
*👨‍💻 Desarrollado por Carlos S - Sistema de gestión de fotografías con IA*
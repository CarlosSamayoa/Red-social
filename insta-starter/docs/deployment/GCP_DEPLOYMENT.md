# Red-O - Guía de Despliegue en Google Cloud Platform (Capa Gratuita)

## Introducción
Esta guía detalla cómo desplegar Red-O en Google Cloud Platform utilizando servicios de la capa gratuita. El proyecto incluye todas las características académicas requeridas y seguirá funcionando en un entorno de producción escalable.

## Arquitectura GCP Propuesta

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloud CDN     │────│   Cloud Storage  │────│  Cloud Storage  │
│   (CDN)         │    │   (Frontend)     │    │   (Images)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloud Load    │────│   Cloud Run      │────│   MongoDB       │
│   Balancer      │    │   (Backend)      │    │   Atlas         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloud DNS     │    │   Secret Manager │    │   Cloud         │
│   (Domain)      │    │   (Secrets)      │    │   Logging       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerrequisitos

### 1. Cuenta Google Cloud
- Crear cuenta GCP (incluye $300 en créditos por 90 días)
- Habilitar facturación (requerido incluso para capa gratuita)
- Crear proyecto nuevo: `red-o-production`

### 2. Herramientas Locales
```bash
# Instalar Google Cloud SDK
# Windows (con Chocolatey)
choco install gcloudsdk

# O descargar desde: https://cloud.google.com/sdk/docs/install

# Instalar Docker Desktop
choco install docker-desktop

# Verificar instalación
gcloud --version
docker --version
```

### 3. Configuración Inicial
```bash
# Inicializar gcloud
gcloud init

# Configurar proyecto
gcloud config set project red-o-production

# Habilitar APIs necesarias
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable compute.googleapis.com

# Autenticar con Docker
gcloud auth configure-docker

# Configurar región por defecto
gcloud config set run/region us-central1
```

## Paso 1: Configuración de Base de Datos

Tienes **3 opciones** para MongoDB en Google Cloud:

### Opción 1: MongoDB en Compute Engine (Recomendado - Capa Gratuita)

**✅ Ventajas**: Totalmente gratis con f1-micro, control total, sin límites de conexión
**❌ Desventajas**: Requiere mantenimiento manual, backups manuales

#### 1.1 Crear VM con MongoDB

```bash
# Crear VM f1-micro (GRATIS permanentemente)
gcloud compute instances create mongodb-server \
  --zone=us-central1-a \
  --machine-type=f1-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=mongodb-server \
  --metadata=startup-script='#!/bin/bash
# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# Configurar MongoDB para aceptar conexiones remotas
sed -i "s/bindIp: 127.0.0.1/bindIp: 0.0.0.0/" /etc/mongod.conf

# Habilitar autenticación
cat >> /etc/mongod.conf <<EOF
security:
  authorization: enabled
EOF

# Iniciar MongoDB
systemctl start mongod
systemctl enable mongod

# Esperar a que MongoDB inicie
sleep 10

# Crear usuario administrador
mongosh --eval '\''
use admin
db.createUser({
  user: "redoadmin",
  pwd: "CAMBIA_ESTA_CONTRASEÑA_SEGURA",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})
'\''

# Crear usuario para la aplicación
mongosh --eval '\''
use redodb
db.createUser({
  user: "redoapp",
  pwd: "CAMBIA_ESTA_CONTRASEÑA_SEGURA",
  roles: [
    { role: "readWrite", db: "redodb" }
  ]
})
'\''

echo "MongoDB instalado y configurado"
'
```

#### 1.2 Configurar Firewall

```bash
# Crear regla de firewall para MongoDB (solo desde Cloud Run)
gcloud compute firewall-rules create allow-mongodb \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=mongodb-server

# Para mayor seguridad, obtener el rango de IPs de Cloud Run
# y reemplazar 0.0.0.0/0 con ese rango específico
```

#### 1.3 Obtener IP interna de la VM

```bash
# Obtener IP interna (para conectar desde Cloud Run en la misma región)
MONGODB_IP=$(gcloud compute instances describe mongodb-server \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].networkIP)')

echo "MongoDB IP Interna: $MONGODB_IP"

# Connection string para Cloud Run
echo "mongodb://redoapp:TU_CONTRASEÑA@$MONGODB_IP:27017/redodb?authSource=redodb"
```

#### 1.4 Configurar Backups Automáticos

Crear script de backup en la VM:

```bash
# SSH a la VM
gcloud compute ssh mongodb-server --zone=us-central1-a

# Crear script de backup
sudo tee /usr/local/bin/mongodb-backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BUCKET="gs://red-o-mongodb-backups"

# Crear backup
mongodump --uri="mongodb://redoadmin:TU_CONTRASEÑA@localhost:27017/redodb?authSource=admin" \
  --out="$BACKUP_DIR/$DATE"

# Comprimir
tar -czf "$BACKUP_DIR/$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Subir a Cloud Storage
gsutil cp "$BACKUP_DIR/$DATE.tar.gz" "$BUCKET/"

# Limpiar backups locales antiguos (mantener últimos 7 días)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

# Limpiar backups en Cloud Storage (mantener últimos 30 días)
gsutil ls "$BUCKET/" | while read file; do
  file_date=$(basename "$file" .tar.gz)
  file_epoch=$(date -d "${file_date:0:8}" +%s 2>/dev/null || echo 0)
  current_epoch=$(date +%s)
  days_old=$(( ($current_epoch - $file_epoch) / 86400 ))
  if [ $days_old -gt 30 ]; then
    gsutil rm "$file"
  fi
done

echo "Backup completado: $DATE.tar.gz"
EOF

# Dar permisos de ejecución
sudo chmod +x /usr/local/bin/mongodb-backup.sh

# Crear bucket para backups
gsutil mb -c STANDARD -l us-central1 gs://red-o-mongodb-backups/

# Configurar cron para backups diarios a las 2 AM
sudo crontab -e
# Agregar: 0 2 * * * /usr/local/bin/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1
```

#### 1.5 Migrar datos existentes

```bash
# Desde tu máquina local
MONGODB_IP="[IP_DE_TU_VM]"

# Exportar datos locales
mongodump --uri="mongodb://localhost:27017/red-o-db" --out="./backup"

# Importar a Compute Engine
mongorestore --uri="mongodb://redoapp:TU_CONTRASEÑA@$MONGODB_IP:27017/redodb?authSource=redodb" \
  --dir="./backup/red-o-db"
```

---

### Opción 2: MongoDB en Cloud Run (Contenedor persistente)

**✅ Ventajas**: Serverless, auto-scaling
**❌ Desventajas**: No recomendado para producción (datos pueden perderse), requiere volumen persistente

> ⚠️ **Nota**: Esta opción NO es recomendada para producción porque Cloud Run es stateless. Solo úsala para desarrollo/testing.

```bash
# Crear volumen persistente
gcloud compute disks create mongodb-data \
  --size=30GB \
  --zone=us-central1-a

# Desplegar MongoDB en Cloud Run con volumen montado
# (Requiere configuración avanzada con Cloud Run Jobs)
```

---

### Opción 3: MongoDB Atlas en Google Cloud (Gratuito)

**✅ Ventajas**: Completamente administrado, backups automáticos, UI amigable
**❌ Desventajas**: Límite de 512MB, requiere cuenta externa

#### 3.1 Crear cuenta en MongoDB Atlas

1. Ir a https://cloud.mongodb.com
2. Crear cuenta gratuita
3. Seleccionar cluster M0 en **Google Cloud** (us-central1)

#### 3.2 Configurar cluster

```javascript
// Connection string
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/redodb?retryWrites=true&w=majority
```

#### 3.3 Configurar Network Access

- Whitelist IP: `0.0.0.0/0` (permitir desde cualquier IP)
- Esto es necesario para Cloud Run

#### 3.4 Crear usuario de base de datos

```bash
# En MongoDB Atlas UI
# Database Access → Add New Database User
# Username: redoadmin
# Password: [contraseña segura]
# Role: Atlas admin
```

#### 3.5 Migrar datos existentes

```bash
# Exportar datos locales
mongodump --uri="mongodb://localhost:27017/red-o-db" --out="./backup"

# Importar a Atlas
mongorestore --uri="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/redodb" \
  ./backup/red-o-db
```

---

## 📊 Comparación de Opciones

| Característica | Compute Engine (f1-micro) | Cloud Run | MongoDB Atlas |
|----------------|---------------------------|-----------|---------------|
| **Costo** | GRATIS (permanente) | No recomendado | GRATIS (512MB) |
| **Storage** | 30GB | Limitado | 512MB |
| **Rendimiento** | Bueno | Variable | Bueno |
| **Backups** | Manual | Manual | Automático |
| **Mantenimiento** | Manual | Ninguno | Ninguno |
| **Conexiones** | Ilimitadas | Ilimitadas | 500 max |
| **Escalabilidad** | Manual | Automático | Limitado |
| **Recomendado para** | Producción pequeña/media | Solo desarrollo | Proyectos pequeños |

### ✅ Recomendación Final:

**Para proyecto académico/producción pequeña**: **Opción 1 - Compute Engine f1-micro**
- Es GRATIS permanentemente (dentro de Always Free tier)
- 30GB de storage (suficiente para miles de usuarios)
- Control total sobre la configuración
- No hay límites artificiales de conexiones
- Backups configurables a Cloud Storage

**Para máxima simplicidad**: **Opción 3 - MongoDB Atlas**
- No requiere mantenimiento
- Backups automáticos
- Ideal si el proyecto es pequeño (<512MB datos)

## Paso 2: Almacenamiento de Imágenes (Cloud Storage)

### Crear buckets
```bash
# Bucket para imágenes de usuarios
gsutil mb -c STANDARD -l us-central1 gs://red-o-images-prod/

# Bucket para frontend estático
gsutil mb -c STANDARD -l us-central1 gs://red-o-frontend-prod/

# Configurar permisos públicos para lectura de imágenes
gsutil iam ch allUsers:objectViewer gs://red-o-images-prod

# Configurar CORS para imágenes
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://red-o-images-prod/
```

### Crear Service Account para acceso a Cloud Storage
```bash
# Crear service account
gcloud iam service-accounts create red-o-storage \
    --display-name="Red-O Storage Service Account"

# Otorgar permisos al bucket
gsutil iam ch serviceAccount:red-o-storage@red-o-production.iam.gserviceaccount.com:roles/storage.objectAdmin gs://red-o-images-prod/

# Crear key para desarrollo local
gcloud iam service-accounts keys create ./gcp-key.json \
    --iam-account=red-o-storage@red-o-production.iam.gserviceaccount.com
```

## Paso 3: Gestión de Secretos (Secret Manager)

### Almacenar variables de entorno sensibles
```bash
# MongoDB URI
echo -n "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/redodb?retryWrites=true&w=majority" | \
gcloud secrets create mongodb-uri --data-file=-

# JWT Secret
openssl rand -base64 32 | gcloud secrets create jwt-secret --data-file=-

# Google OAuth Credentials
echo -n "tu-google-client-id" | gcloud secrets create google-client-id --data-file=-
echo -n "tu-google-client-secret" | gcloud secrets create google-client-secret --data-file=-

# reCAPTCHA Secret
echo -n "tu-recaptcha-secret" | gcloud secrets create recaptcha-secret --data-file=-

# Verificar secretos
gcloud secrets list
```

### Otorgar permisos al Secret Manager
```bash
# Dar acceso al Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe red-o-production --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-client-id \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-client-secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding recaptcha-secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Paso 4: Backend con Cloud Run

### Preparar código para Cloud Run

#### 1. Crear Dockerfile en `backend/`
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

# Crear directorio de aplicación
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio para almacenamiento temporal
RUN mkdir -p /tmp/uploads

# Exponer puerto
EXPOSE 8080

# Variable de entorno para Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

# Iniciar aplicación
CMD ["node", "server.js"]
```

#### 2. Crear .dockerignore
```bash
# backend/.dockerignore
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
.vscode
storage/
*.md
```

#### 3. Actualizar server.js para Cloud Run
```javascript
// backend/server.js - Modificaciones necesarias
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Puerto para Cloud Run (siempre 8080)
const PORT = process.env.PORT || 8080;

// CORS configurado para producción
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection con retry logic para Cloud Run
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
      if (retries === maxRetries) {
        console.error('❌ Could not connect to MongoDB after maximum retries');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Conectar a MongoDB
connectDB();

// ... resto de las rutas ...

// Health check para Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

#### 4. Actualizar uploads para Cloud Storage
Crear `backend/src/utils/gcs.js`:
```javascript
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Inicializar Cloud Storage
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET || 'red-o-images-prod';
const bucket = storage.bucket(bucketName);

/**
 * Subir archivo a Cloud Storage
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} destination - Ruta de destino en el bucket
 * @param {string} contentType - Tipo MIME del archivo
 * @returns {Promise<string>} URL pública del archivo
 */
async function uploadToGCS(fileBuffer, destination, contentType) {
  const blob = bucket.file(destination);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      console.error('Error uploading to GCS:', err);
      reject(err);
    });

    blobStream.on('finish', () => {
      // Hacer el archivo público
      blob.makePublic().then(() => {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
        resolve(publicUrl);
      }).catch(reject);
    });

    blobStream.end(fileBuffer);
  });
}

/**
 * Eliminar archivo de Cloud Storage
 * @param {string} destination - Ruta del archivo en el bucket
 */
async function deleteFromGCS(destination) {
  try {
    await bucket.file(destination).delete();
    console.log(`File ${destination} deleted from GCS`);
  } catch (error) {
    console.error('Error deleting from GCS:', error);
    throw error;
  }
}

module.exports = {
  uploadToGCS,
  deleteFromGCS,
  bucket,
  bucketName
};
```

Actualizar `backend/src/routes/uploads.js`:
```javascript
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { uploadToGCS } = require('../utils/gcs');
const Publication = require('../models/Publication');

const router = express.Router();

// Configurar multer para memoria (necesario para Cloud Run)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Máximo 10 archivos por request
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files allowed'));
    }
  }
});

router.post('/', requireAuth, upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { text, filter } = req.body;
    const userId = req.user._id;
    const mediaItems = [];

    // Procesar cada archivo
    for (const file of req.files) {
      const mediaId = uuidv4();
      const isVideo = file.mimetype.startsWith('video/');
      
      if (isVideo) {
        // Subir video directamente
        const destination = `originals/${userId}/${mediaId}_${file.originalname}`;
        const publicUrl = await uploadToGCS(file.buffer, destination, file.mimetype);
        
        mediaItems.push({
          type: 'video',
          url: publicUrl,
          mimeType: file.mimetype
        });
      } else {
        // Procesar imagen con sharp
        const variants = [
          { kind: 'thumb', size: 256 },
          { kind: 'small', size: 512 },
          { kind: 'medium', size: 1024 },
          { kind: 'large', size: 2048 }
        ];

        const uploadPromises = [];
        let mainImageUrl = '';

        for (const variant of variants) {
          let sharpInstance = sharp(file.buffer).resize(variant.size, variant.size, {
            fit: 'inside',
            withoutEnlargement: true
          });

          // Aplicar filtro si se especificó
          if (filter) {
            switch (filter) {
              case 'bw':
                sharpInstance = sharpInstance.grayscale();
                break;
              case 'sepia':
                sharpInstance = sharpInstance.tint({ r: 112, g: 66, b: 20 });
                break;
              case 'vintage':
                sharpInstance = sharpInstance.modulate({ brightness: 0.9, saturation: 0.7 });
                break;
              case 'bright':
                sharpInstance = sharpInstance.modulate({ brightness: 1.3 });
                break;
              case 'contrast':
                sharpInstance = sharpInstance.linear(1.5, -(128 * 1.5) + 128);
                break;
            }
          }

          const processedBuffer = await sharpInstance
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();

          const destination = `variants/${variant.kind}/${userId}/${mediaId}_${variant.kind}.jpg`;
          const uploadPromise = uploadToGCS(processedBuffer, destination, 'image/jpeg');
          
          uploadPromises.push(uploadPromise);

          if (variant.kind === 'medium') {
            mainImageUrl = await uploadPromise;
          }
        }

        await Promise.all(uploadPromises);

        mediaItems.push({
          type: 'image',
          url: mainImageUrl,
          mimeType: 'image/jpeg'
        });
      }
    }

    // Crear publicación en BD
    const publication = new Publication({
      user: userId,
      text: text || '',
      media: mediaItems,
      filter: filter || 'none',
      createdAt: new Date()
    });

    await publication.save();
    await publication.populate('user', 'username name profile_image');

    // Mapear profile_image a image
    const pubObj = publication.toObject();
    if (pubObj.user && pubObj.user.profile_image) {
      pubObj.user.image = pubObj.user.profile_image;
    }

    res.status(201).json({
      message: 'Media uploaded successfully',
      publication: pubObj
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

module.exports = router;
```

### Build y Deploy del Backend

```bash
# En la carpeta backend/

# 1. Build de la imagen Docker
gcloud builds submit --tag gcr.io/red-o-production/backend

# 2. Deploy a Cloud Run
gcloud run deploy red-o-backend \
  --image gcr.io/red-o-production/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production,GCS_BUCKET=red-o-images-prod" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RECAPTCHA_SECRET_KEY=recaptcha-secret:latest"

# 3. Obtener URL del servicio
gcloud run services describe red-o-backend --region us-central1 --format 'value(status.url)'
```

### Script de deployment automatizado

Crear `backend/deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Red-O Backend to Cloud Run..."

# Variables
PROJECT_ID="red-o-production"
SERVICE_NAME="red-o-backend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Build imagen
echo "📦 Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy a Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production,GCS_BUCKET=red-o-images-prod" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RECAPTCHA_SECRET_KEY=recaptcha-secret:latest"

# Obtener URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "✅ Deployment completed!"
echo "Backend URL: $SERVICE_URL"
```

## Paso 5: Frontend en Cloud Storage + Cloud CDN

### Preparar build de producción

#### 1. Actualizar configuración del frontend
Crear `frontend/.env.production`:
```env
VITE_API_URL=https://red-o-backend-xxxxxxxxxx-uc.a.run.app/api
VITE_GOOGLE_CLIENT_ID=tu-google-client-id
VITE_RECAPTCHA_SITE_KEY=tu-recaptcha-site-key
```

Actualizar `frontend/src/api.js`:
```javascript
// Usar variable de entorno de Vite
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export async function getJSON(endpoint) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  return response.json();
}

export async function postJSON(endpoint, data) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  return response.json();
}

export async function postForm(endpoint, formData) {
  const token = localStorage.getItem('token');
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  return response.json();
}

// URL base para imágenes de Cloud Storage
export const STATIC = 'https://storage.googleapis.com/red-o-images-prod';
```

#### 2. Build y Deploy
```bash
# En la carpeta frontend/

# Instalar dependencias
npm install

# Build de producción
npm run build

# Subir a Cloud Storage
gsutil -m rsync -r -d dist/ gs://red-o-frontend-prod/

# Configurar bucket para hosting web
gsutil web set -m index.html -e index.html gs://red-o-frontend-prod/

# Hacer bucket público
gsutil iam ch allUsers:objectViewer gs://red-o-frontend-prod
```

#### 3. Configurar Cloud CDN con Load Balancer

```bash
# 1. Crear IP estática
gcloud compute addresses create red-o-ip \
    --ip-version=IPV4 \
    --global

# Ver IP asignada
gcloud compute addresses describe red-o-ip \
    --format="get(address)" \
    --global

# 2. Crear backend bucket
gcloud compute backend-buckets create red-o-backend-bucket \
    --gcs-bucket-name=red-o-frontend-prod \
    --enable-cdn

# 3. Crear URL map
gcloud compute url-maps create red-o-lb \
    --default-backend-bucket=red-o-backend-bucket

# 4. Crear certificado SSL (si tienes dominio)
# Opción A: SSL autogestionado por Google
gcloud compute ssl-certificates create red-o-ssl \
    --domains=tudominio.com,www.tudominio.com \
    --global

# Opción B: Certificado autofirmado para desarrollo
gcloud compute ssl-certificates create red-o-ssl-self \
    --certificate=./cert.pem \
    --private-key=./key.pem \
    --global

# 5. Crear HTTPS proxy
gcloud compute target-https-proxies create red-o-https-proxy \
    --url-map=red-o-lb \
    --ssl-certificates=red-o-ssl

# 6. Crear forwarding rule
gcloud compute forwarding-rules create red-o-https-rule \
    --address=red-o-ip \
    --target-https-proxy=red-o-https-proxy \
    --global \
    --ports=443

# 7. (Opcional) Crear regla HTTP que redirija a HTTPS
gcloud compute url-maps import red-o-lb \
    --source <(cat <<EOF
name: red-o-lb
defaultService: https://www.googleapis.com/compute/v1/projects/red-o-production/global/backendBuckets/red-o-backend-bucket
hostRules:
- hosts:
  - '*'
  pathMatcher: path-matcher-1
pathMatchers:
- defaultService: https://www.googleapis.com/compute/v1/projects/red-o-production/global/backendBuckets/red-o-backend-bucket
  name: path-matcher-1
EOF
    ) --global
```

### Script de deployment del frontend

Crear `frontend/deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Red-O Frontend to Cloud Storage..."

# Build
echo "🏗️ Building frontend..."
npm run build

# Deploy
echo "📤 Uploading to Cloud Storage..."
gsutil -m rsync -r -d dist/ gs://red-o-frontend-prod/

# Invalidar cache de CDN
echo "🔄 Invalidating CDN cache..."
gcloud compute url-maps invalidate-cdn-cache red-o-lb \
    --path "/*" \
    --async

echo "✅ Frontend deployment completed!"
echo "URL: https://[TU-IP-ESTATICA]"
```

## Paso 6: Configuración de Dominio (Opcional)

### Cloud DNS

```bash
# 1. Crear zona DNS
gcloud dns managed-zones create red-o-zone \
    --dns-name="tudominio.com." \
    --description="Red-O DNS Zone"

# 2. Obtener name servers
gcloud dns managed-zones describe red-o-zone \
    --format="get(nameServers)"

# 3. Configurar estos name servers en tu registrador de dominio

# 4. Crear registro A apuntando a la IP del Load Balancer
IP_ADDRESS=$(gcloud compute addresses describe red-o-ip --format="get(address)" --global)

gcloud dns record-sets transaction start --zone=red-o-zone

gcloud dns record-sets transaction add $IP_ADDRESS \
    --name="tudominio.com." \
    --ttl=300 \
    --type=A \
    --zone=red-o-zone

gcloud dns record-sets transaction add $IP_ADDRESS \
    --name="www.tudominio.com." \
    --ttl=300 \
    --type=A \
    --zone=red-o-zone

gcloud dns record-sets transaction execute --zone=red-o-zone
```

## Paso 7: Monitoreo y Logs

### Cloud Logging y Monitoring

```bash
# Ver logs del backend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=red-o-backend" \
    --limit 50 \
    --format json

# Crear alerta de facturación
gcloud alpha billing budgets create \
    --billing-account=XXXXXX-YYYYYY-ZZZZZZ \
    --display-name="Red-O Budget Alert" \
    --budget-amount=10 \
    --threshold-rule=percent=50 \
    --threshold-rule=percent=90 \
    --threshold-rule=percent=100

# Ver métricas de Cloud Run
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

Crear `monitoring/dashboard.json`:
```json
{
  "displayName": "Red-O Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cloud Run Request Count",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" resource.label.service_name=\"red-o-backend\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cloud Run Response Latency",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" metric.type=\"run.googleapis.com/request_latencies\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_DELTA"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

### Configurar alertas

```bash
# Crear política de alerta para errores
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Error Rate" \
    --condition-display-name="Error rate > 5%" \
    --condition-threshold-value=0.05 \
    --condition-threshold-duration=60s
```

## Paso 8: CI/CD con Cloud Build

### Crear archivo de configuración

`cloudbuild.yaml` en la raíz del proyecto:
```yaml
steps:
  # Build Backend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/backend', './backend']
    id: 'build-backend'

  # Push Backend Image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/backend']
    id: 'push-backend'

  # Deploy Backend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'red-o-backend'
      - '--image=gcr.io/$PROJECT_ID/backend'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--set-env-vars=NODE_ENV=production,GCS_BUCKET=red-o-images-prod'
      - '--set-secrets=MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RECAPTCHA_SECRET_KEY=recaptcha-secret:latest'
    id: 'deploy-backend'

  # Build Frontend
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']
    dir: 'frontend'
    id: 'install-frontend'

  - name: 'gcr.io/cloud-builders/npm'
    args: ['run', 'build']
    dir: 'frontend'
    env:
      - 'VITE_API_URL=https://red-o-backend-xxxxxxxxxx-uc.a.run.app/api'
    id: 'build-frontend'

  # Deploy Frontend to Cloud Storage
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'rsync', '-r', '-d', 'frontend/dist/', 'gs://red-o-frontend-prod/']
    id: 'deploy-frontend'

  # Invalidate CDN Cache
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'compute'
      - 'url-maps'
      - 'invalidate-cdn-cache'
      - 'red-o-lb'
      - '--path=/*'
      - '--async'
    id: 'invalidate-cache'

timeout: 1200s
options:
  machineType: 'N1_HIGHCPU_8'
```

### Configurar triggers automáticos

```bash
# Crear trigger para la rama main
gcloud builds triggers create github \
    --repo-name=Red-social \
    --repo-owner=CarlosSamayoa \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --description="Deploy on push to main"

# Listar triggers
gcloud builds triggers list
```

## Paso 9: Optimizaciones de Rendimiento

### 1. Configurar caché en Cloud CDN
```bash
# Actualizar backend bucket con configuración de caché
gcloud compute backend-buckets update red-o-backend-bucket \
    --cache-mode=CACHE_ALL_STATIC \
    --default-ttl=3600 \
    --max-ttl=86400 \
    --client-ttl=3600
```

### 2. Comprimir assets
Actualizar `frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});
```

### 3. Lazy loading de rutas
Actualizar `frontend/src/App.jsx`:
```javascript
import React, { lazy, Suspense } from 'react';

// Lazy load components
const Feed = lazy(() => import('./components/Feed'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Messages = lazy(() => import('./components/Messages'));
const Settings = lazy(() => import('./components/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/u/:username" element={<UserProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

## Costos Estimados (Capa Gratuita de GCP)

### Servicios con Always Free (después de $300 en créditos)
- **Cloud Run**: 
  - 2M requests/mes
  - 360,000 GB-seconds/mes
  - 180,000 vCPU-seconds/mes
  
- **Cloud Storage**: 
  - 5GB storage/mes (Standard)
  - 5,000 operaciones Clase A/mes
  - 50,000 operaciones Clase B/mes
  - 100GB egress/mes (a América del Norte)

- **Cloud Build**: 
  - 120 build-minutes/día

- **Cloud Logging**: 
  - 50GB/mes

- **MongoDB Atlas**: 
  - Gratuito permanente (M0, 512MB)

### Servicios con costo (después de créditos)
- **Cloud CDN**: ~$0.08/GB (después de 100GB)
- **Cloud DNS**: $0.20/million queries (primeras 1B queries/mes)
- **Load Balancer**: ~$18/mes (si se usa)

### Estimación mensual para proyecto académico
- **Tráfico bajo** (<1000 usuarios): **$0-5/mes** (dentro de free tier)
- **Tráfico moderado** (1000-5000 usuarios): **$5-20/mes**
- **Tráfico alto** (>5000 usuarios): **$20-50/mes**

## Scripts de Utilidad

### Script de deployment completo

`deploy-all.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Red-O Complete Deployment to GCP"
echo "===================================="

# Variables
PROJECT_ID="red-o-production"
REGION="us-central1"
BACKEND_SERVICE="red-o-backend"
FRONTEND_BUCKET="red-o-frontend-prod"

# Configurar proyecto
gcloud config set project $PROJECT_ID

echo ""
echo "📦 Step 1: Building and deploying backend..."
echo "--------------------------------------------"
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE
gcloud run deploy $BACKEND_SERVICE \
  --image gcr.io/$PROJECT_ID/$BACKEND_SERVICE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-env-vars="NODE_ENV=production,GCS_BUCKET=red-o-images-prod" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RECAPTCHA_SECRET_KEY=recaptcha-secret:latest"
cd ..

# Obtener URL del backend
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

echo ""
echo "🏗️ Step 2: Building frontend..."
echo "--------------------------------"
cd frontend
echo "VITE_API_URL=${BACKEND_URL}/api" > .env.production
npm install
npm run build
cd ..

echo ""
echo "📤 Step 3: Deploying frontend to Cloud Storage..."
echo "--------------------------------------------------"
gsutil -m rsync -r -d frontend/dist/ gs://$FRONTEND_BUCKET/

echo ""
echo "🔄 Step 4: Invalidating CDN cache..."
echo "------------------------------------"
gcloud compute url-maps invalidate-cdn-cache red-o-lb \
    --path "/*" \
    --async || echo "⚠️ CDN cache invalidation skipped (may not be configured)"

echo ""
echo "✅ Deployment completed successfully!"
echo "===================================="
echo ""
echo "📍 URLs:"
echo "  Backend API: $BACKEND_URL"
echo "  Frontend: https://[your-load-balancer-ip]"
echo ""
```

### Script de monitoreo

`monitor.sh`:
```bash
#!/bin/bash

PROJECT_ID="red-o-production"
SERVICE_NAME="red-o-backend"
REGION="us-central1"

echo "📊 Red-O GCP Monitoring Dashboard"
echo "=================================="
echo ""

# Cloud Run stats
echo "📦 Cloud Run Stats:"
gcloud run services describe $SERVICE_NAME --region $REGION --format="table(
  status.url,
  status.latestCreatedRevisionName,
  spec.template.spec.containers[0].image
)"

echo ""
echo "🔄 Recent Requests (last 100):"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
    --limit 100 \
    --format="table(timestamp,httpRequest.requestMethod,httpRequest.requestUrl,httpRequest.status)"

echo ""
echo "💾 Cloud Storage Usage:"
gsutil du -sh gs://red-o-images-prod
gsutil du -sh gs://red-o-frontend-prod

echo ""
echo "💰 Cost Estimate (Current Month):"
gcloud alpha billing accounts get-iam-policy $(gcloud alpha billing accounts list --format="value(name)" --limit=1) 2>/dev/null || echo "Billing API not enabled"

echo ""
echo "📈 MongoDB Atlas:"
echo "Visit: https://cloud.mongodb.com for database metrics"
```

### Script de rollback

`rollback.sh`:
```bash
#!/bin/bash
set -e

PROJECT_ID="red-o-production"
SERVICE_NAME="red-o-backend"
REGION="us-central1"

echo "⏪ Rolling back to previous revision..."

# Obtener revisiones
REVISIONS=$(gcloud run revisions list --service=$SERVICE_NAME --region=$REGION --format="value(name)" --limit=2)
PREVIOUS_REVISION=$(echo "$REVISIONS" | sed -n '2p')

if [ -z "$PREVIOUS_REVISION" ]; then
  echo "❌ No previous revision found"
  exit 1
fi

echo "Previous revision: $PREVIOUS_REVISION"
echo "Rolling back..."

gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions=$PREVIOUS_REVISION=100

echo "✅ Rollback completed!"
```

## Solución de Problemas Comunes

### 1. Error de conexión a MongoDB
```bash
# Verificar que IP de Cloud Run está en whitelist
# En MongoDB Atlas: Network Access → Add IP Address → 0.0.0.0/0

# Verificar string de conexión
gcloud secrets versions access latest --secret=mongodb-uri
```

### 2. Permisos de Cloud Storage
```bash
# Verificar permisos del service account
PROJECT_NUMBER=$(gcloud projects describe red-o-production --format="value(projectNumber)")
gsutil iam get gs://red-o-images-prod

# Otorgar permisos si es necesario
gsutil iam ch serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com:roles/storage.objectAdmin gs://red-o-images-prod
```

### 3. CORS errors
```bash
# Actualizar CORS en bucket
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://red-o-images-prod/
```

### 4. Cloud Run timeout
```javascript
// Aumentar timeout en deploy
gcloud run deploy red-o-backend \
  --timeout=300 \
  --max-instances=10
```

### 5. Secret Manager access denied
```bash
# Verificar políticas IAM
gcloud secrets get-iam-policy mongodb-uri

# Agregar permisos
PROJECT_NUMBER=$(gcloud projects describe red-o-production --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Conclusión

Esta configuración te permite desplegar Red-O en Google Cloud Platform con:

✅ **Arquitectura serverless** con Cloud Run (auto-scaling)
✅ **CDN global** con Cloud CDN  
✅ **Base de datos MongoDB** Atlas (gratuito)  
✅ **Almacenamiento de archivos** en Cloud Storage  
✅ **Gestión de secretos** con Secret Manager  
✅ **CI/CD automatizado** con Cloud Build  
✅ **Monitoreo completo** con Cloud Logging  
✅ **SSL/HTTPS** automático  
✅ **Altamente escalable** y dentro de capa gratuita  

### Ventajas sobre AWS:
- 💰 **Más generoso en capa gratuita** (2M requests vs 1M)
- 🚀 **Deploy más rápido** con Cloud Run (vs Lambda + API Gateway)
- 🔧 **Configuración más simple** (menos servicios que configurar)
- 📊 **Mejor integración** de monitoreo y logs
- 🌍 **CDN incluido** sin costo adicional hasta 100GB

El proyecto mantiene todas las características académicas y está listo para escalar a producción. 🎉

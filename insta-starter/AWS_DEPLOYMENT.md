# Red-O - Guía de Despliegue en AWS (Capa Gratuita)

## Introducción
Esta guía detalla cómo desplegar Red-O en AWS utilizando únicamente servicios de la capa gratuita. El proyecto incluye todas las características académicas requeridas y seguirá funcionando en un entorno de producción escalable.

## Arquitectura AWS Propuesta

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   S3 (Frontend)  │────│      S3         │
│   (CDN)         │    │   Static Hosting │    │  (Images)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │────│   Lambda         │────│   DocumentDB    │
│   (REST API)    │    │   (Backend)      │    │   (MongoDB)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Route 53      │    │   Systems Mgr    │    │   CloudWatch    │
│   (DNS)         │    │   (Secrets)      │    │   (Logs)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerrequisitos

### 1. Cuenta AWS
- Crear cuenta AWS (capa gratuita por 12 meses)
- Verificar límites de capa gratuita
- Configurar facturación con alertas

### 2. Herramientas Locales
```bash
# Instalar AWS CLI
# Windows (con Chocolatey)
choco install awscli

# Instalar Serverless Framework
npm install -g serverless

# Instalar herramientas adicionales
npm install -g @aws-cdk/cli
```

### 3. Configuración de Credenciales
```bash
# Configurar AWS CLI
aws configure
# AWS Access Key ID: [Tu Access Key]
# AWS Secret Access Key: [Tu Secret Key]
# Default region name: us-east-1
# Default output format: json
```

## Paso 1: Configuración de Base de Datos

### DocumentDB (MongoDB compatible) - Alternativa Gratuita
Como DocumentDB no está en capa gratuita, usaremos **MongoDB Atlas** (gratuito):

1. **Crear cuenta en MongoDB Atlas**
   - Ir a https://cloud.mongodb.com
   - Crear cuenta gratuita (512MB storage)
   - Seleccionar cluster M0 (gratis)

2. **Configurar cluster**
   ```javascript
   // Connection string example
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/redodb?retryWrites=true&w=majority
   ```

3. **Importar datos existentes**
   ```bash
   # Exportar datos locales
   mongodump --uri="mongodb://localhost:27017/red-o-db" --out="./backup"
   
   # Importar a Atlas
   mongorestore --uri="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/redodb" ./backup/red-o-db
   ```

## Paso 2: Almacenamiento de Imágenes (S3)

### Crear buckets S3
```bash
# Bucket para imágenes de usuarios
aws s3 mb s3://red-o-images-prod

# Bucket para frontend estático
aws s3 mb s3://red-o-frontend-prod

# Configurar CORS para imágenes
aws s3api put-bucket-cors --bucket red-o-images-prod --cors-configuration file://s3-cors.json
```

### Archivo s3-cors.json
```json
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

### Política de bucket público (solo lectura)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::red-o-images-prod/*"
        }
    ]
}
```

## Paso 3: Backend con Lambda

### Preparar código para Lambda
Crear `lambda-backend/serverless.yml`:
```yaml
service: red-o-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    MONGODB_URI: ${env:MONGODB_URI}
    JWT_SECRET: ${env:JWT_SECRET}
    GOOGLE_CLIENT_ID: ${env:GOOGLE_CLIENT_ID}
    GOOGLE_CLIENT_SECRET: ${env:GOOGLE_CLIENT_SECRET}
    RECAPTCHA_SECRET_KEY: ${env:RECAPTCHA_SECRET_KEY}
    S3_BUCKET: red-o-images-prod
    S3_REGION: us-east-1
  iamRoleStatements:
    - Effect: Allow
      Action:
        - s3:GetObject
        - s3:PutObject
        - s3:DeleteObject
      Resource: "arn:aws:s3:::red-o-images-prod/*"

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    timeout: 30

plugins:
  - serverless-offline
  - serverless-dotenv-plugin

package:
  exclude:
    - node_modules/aws-sdk/**
```

### Crear lambda.js (handler principal)
```javascript
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Importar rutas existentes
const authRoutes = require('./src/routes/auth.dev');
const userRoutes = require('./src/routes/users');
const socialRoutes = require('./src/routes/social');
const uploadsRoutes = require('./src/routes/uploads.aws'); // Nueva versión para S3
const dmRoutes = require('./src/routes/dm');
const notificationsRoutes = require('./src/routes/notifications');
const searchRoutes = require('./src/routes/search');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Middleware para conectar DB en cada request
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports.handler = serverless(app);
```

### Crear uploads.aws.js (nueva versión para S3)
```javascript
const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const Publication = require('../models/Publication');

const router = express.Router();

// Configurar S3
const s3 = new AWS.S3({
  region: process.env.S3_REGION || 'us-east-1'
});

// Configurar multer para memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { caption } = req.body;
    const imageId = uuidv4();
    
    // Transformaciones de imagen
    const variants = [
      { kind: 'thumb', op: (s) => s.resize(256) },
      { kind: 'medium', op: (s) => s.resize(1024) },
      { kind: 'large', op: (s) => s.resize(2048) },
      { kind: 'small', op: (s) => s.resize(128) },
      { kind: 'bw', op: (s) => s.grayscale() },
      { kind: 'sepia', op: (s) => s.tint({r: 255, g: 240, b: 205}) },
      { kind: 'vintage', op: (s) => s.modulate({brightness: 0.9, saturation: 0.7}).tint({r: 255, g: 245, b: 220}) },
      { kind: 'bright', op: (s) => s.modulate({brightness: 1.3}) },
      { kind: 'contrast', op: (s) => s.linear(1.5, -(128 * 1.5) + 128) }
    ];

    const uploadPromises = [];

    for (const variant of variants) {
      const processedBuffer = await variant.op(sharp(req.file.buffer))
        .jpeg({ quality: 80 })
        .toBuffer();

      const key = `images/${imageId}_${variant.kind}.jpg`;
      
      uploadPromises.push(
        s3.upload({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: processedBuffer,
          ContentType: 'image/jpeg',
          ACL: 'public-read'
        }).promise()
      );
    }

    await Promise.all(uploadPromises);

    // Crear publicación en BD
    const publication = new Publication({
      user: req.user._id,
      imageId,
      caption: caption || '',
      imageUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/images/${imageId}_medium.jpg`,
      createdAt: new Date()
    });

    await publication.save();
    await publication.populate('user', 'username email');

    res.status(201).json({
      message: 'Image uploaded successfully',
      publication,
      variants: variants.map(v => ({
        kind: v.kind,
        url: `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/images/${imageId}_${v.kind}.jpg`
      }))
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
```

### Desplegar Backend
```bash
# En la carpeta lambda-backend/
npm install

# Crear .env para variables de entorno
echo "MONGODB_URI=mongodb+srv://..." > .env
echo "JWT_SECRET=your-jwt-secret" >> .env
echo "GOOGLE_CLIENT_ID=your-google-client-id" >> .env
echo "GOOGLE_CLIENT_SECRET=your-google-client-secret" >> .env
echo "RECAPTCHA_SECRET_KEY=your-recaptcha-secret" >> .env

# Desplegar
serverless deploy
```

## Paso 4: Frontend en S3 + CloudFront

### Preparar build de producción
Modificar `frontend/src/api.js`:
```javascript
// Cambiar la URL base del API
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://tu-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev/api'
  : 'http://localhost:8080/api';
```

### Build y Deploy
```bash
# En la carpeta frontend/
npm run build

# Subir a S3
aws s3 sync dist/ s3://red-o-frontend-prod --delete

# Configurar S3 para hosting estático
aws s3api put-bucket-website --bucket red-o-frontend-prod --website-configuration file://website-config.json
```

### Archivo website-config.json
```json
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
```

### Configurar CloudFront
```bash
# Crear distribución CloudFront
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### Archivo cloudfront-config.json
```json
{
    "CallerReference": "red-o-frontend-2024",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-red-o-frontend",
                "DomainName": "red-o-frontend-prod.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-red-o-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0
    },
    "Comment": "Red-O Frontend Distribution",
    "Enabled": true
}
```

## Paso 5: Configuración de Dominio (Opcional)

### Route 53
```bash
# Crear zona hospedada
aws route53 create-hosted-zone --name tu-dominio.com --caller-reference red-o-2024

# Configurar registros DNS apuntando a CloudFront
```

## Paso 6: Monitoreo y Logs

### CloudWatch
```bash
# Crear grupo de logs para Lambda
aws logs create-log-group --log-group-name /aws/lambda/red-o-backend-dev-api

# Configurar alertas de facturación
aws cloudwatch put-metric-alarm --alarm-name "BillingAlarm" --alarm-description "Alert when charges exceed $10"
```

## Paso 7: Variables de Entorno y Secretos

### Systems Manager Parameter Store
```bash
# Almacenar secretos
aws ssm put-parameter --name "/red-o/mongodb-uri" --value "mongodb+srv://..." --type "SecureString"
aws ssm put-parameter --name "/red-o/jwt-secret" --value "your-jwt-secret" --type "SecureString"
aws ssm put-parameter --name "/red-o/google-client-id" --value "your-google-client-id" --type "String"
aws ssm put-parameter --name "/red-o/google-client-secret" --value "your-google-client-secret" --type "SecureString"
aws ssm put-parameter --name "/red-o/recaptcha-secret" --value "your-recaptcha-secret" --type "SecureString"
```

## Costos Estimados (Capa Gratuita)

### Servicios Gratuitos (12 meses)
- **Lambda**: 1M requests/mes + 400,000 GB-seconds
- **S3**: 5GB storage + 20,000 GET requests + 2,000 PUT requests
- **CloudFront**: 50GB transferencia + 2M requests
- **API Gateway**: 1M requests/mes
- **CloudWatch**: 10 métricas + 5GB logs

### Servicios con Costo Mínimo
- **MongoDB Atlas**: Gratuito permanente (M0 cluster, 512MB)
- **Route 53**: $0.50/mes por zona hospedada (opcional)

### Límites a Monitorear
- Requests Lambda: 1M/mes
- Storage S3: 5GB
- Transferencia CloudFront: 50GB/mes
- API Gateway calls: 1M/mes

## Scripts de Automatización

### deploy.sh
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Red-O to AWS..."

# 1. Deploy backend
echo "📦 Deploying backend..."
cd lambda-backend
serverless deploy
cd ..

# 2. Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build
cd ..

# 3. Deploy frontend
echo "📤 Deploying frontend..."
aws s3 sync frontend/dist/ s3://red-o-frontend-prod --delete

# 4. Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

echo "✅ Deployment completed!"
echo "Frontend: https://your-cloudfront-domain.cloudfront.net"
echo "API: https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev"
```

### monitor.sh
```bash
#!/bin/bash

# Verificar límites de capa gratuita
echo "📊 Checking AWS Free Tier usage..."

# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=red-o-backend-dev-api \
  --statistics Sum \
  --start-time $(date -d '1 month ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 2592000

# S3 storage
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=red-o-images-prod Name=StorageType,Value=StandardStorage \
  --statistics Average \
  --start-time $(date -d '1 day ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 86400
```

## Solución de Problemas Comunes

### 1. Lambda Timeout
```javascript
// Aumentar timeout en serverless.yml
functions:
  api:
    timeout: 30 # máximo para capa gratuita
```

### 2. MongoDB Connection
```javascript
// Optimizar conexión para Lambda
let cachedDb = null;
const connectToDatabase = async () => {
  if (cachedDb) return cachedDb;
  
  const client = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    bufferCommands: false,
    bufferMaxEntries: 0,
    useFindAndModify: false,
    useCreateIndex: true
  });
  
  cachedDb = client;
  return client;
};
```

### 3. CORS Issues
```javascript
// Configurar CORS correctamente en Lambda
app.use(cors({
  origin: [
    'https://your-cloudfront-domain.cloudfront.net',
    'http://localhost:5174' // para desarrollo
  ],
  credentials: true
}));
```

### 4. Image Upload Errors
```javascript
// Validar permisos S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION
});
```

## Consideraciones de Seguridad

### 1. API Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de requests por IP
});

app.use('/api/', limiter);
```

### 2. Input Validation
```javascript
const { body, validationResult } = require('express-validator');

router.post('/upload',
  auth,
  body('caption').isLength({ max: 500 }).trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... resto del código
  }
);
```

### 3. Environment Variables
```bash
# Nunca hardcodear credenciales
export MONGODB_URI="mongodb+srv://..."
export JWT_SECRET="your-secret-key"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
```

## Conclusión

Esta configuración te permite desplegar Red-O en AWS utilizando únicamente la capa gratuita durante el primer año. El proyecto mantiene todas las características académicas requeridas:

✅ **Frontend profesional** (React + Instagram UI)  
✅ **Backend completo** (Node.js + Express + Lambda)  
✅ **Base de datos** (MongoDB Atlas gratuito)  
✅ **Autenticación** (JWT + Google OAuth)  
✅ **Procesamiento de imágenes** (Sharp + S3)  
✅ **Seguridad** (reCAPTCHA + Face detection)  
✅ **Escalabilidad** (Serverless architecture)  
✅ **CDN** (CloudFront)  
✅ **Monitoreo** (CloudWatch)  

La arquitectura es completamente serverless y se escala automáticamente según la demanda, manteniéndose dentro de los límites de la capa gratuita para proyectos académicos o de bajo tráfico.

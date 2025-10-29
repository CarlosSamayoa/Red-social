# Red-O - Guía Rápida de Despliegue en GCP

## Requisitos Previos

1. **Cuenta Google Cloud** con facturación habilitada
2. **gcloud CLI** instalado: https://cloud.google.com/sdk/docs/install
3. **Node.js 18+** instalado
4. **Git** instalado

## Pasos de Despliegue

### 1. Preparación Inicial

```bash
# Clonar repositorio
git clone https://github.com/CarlosSamayoa/Red-social.git
cd Red-social/insta-starter

# Configurar gcloud
gcloud init
gcloud config set project red-o-production

# Autenticar Docker
gcloud auth configure-docker
```

### 2. Ejecutar Script de Despliegue Automático

```bash
# Dar permisos de ejecución (Linux/Mac)
chmod +x deploy-gcp.sh

# Ejecutar script
./deploy-gcp.sh
```

El script te pedirá:
- ✅ Credenciales de MongoDB (usuario/contraseña)
- ✅ Google OAuth Client ID y Secret
- ✅ reCAPTCHA Secret Key

### 3. Configuración Manual (Alternativa)

Si prefieres hacerlo paso por paso:

#### 3.1 Habilitar APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### 3.2 Crear MongoDB en Compute Engine
```bash
# Ver GCP_DEPLOYMENT.md sección "Paso 1: Opción 1"
```

#### 3.3 Configurar Secretos
```bash
# MongoDB URI
echo -n "mongodb://user:pass@IP:27017/redodb" | gcloud secrets create mongodb-uri --data-file=-

# JWT Secret
openssl rand -base64 32 | gcloud secrets create jwt-secret --data-file=-

# Google OAuth
echo -n "tu-google-client-id" | gcloud secrets create google-client-id --data-file=-
echo -n "tu-google-client-secret" | gcloud secrets create google-client-secret --data-file=-

# reCAPTCHA
echo -n "tu-recaptcha-secret" | gcloud secrets create recaptcha-secret --data-file=-
```

#### 3.4 Crear Buckets
```bash
# Imágenes
gsutil mb -c STANDARD -l us-central1 gs://red-o-images-prod/
gsutil iam ch allUsers:objectViewer gs://red-o-images-prod

# Frontend
gsutil mb -c STANDARD -l us-central1 gs://red-o-frontend-prod/
gsutil web set -m index.html -e index.html gs://red-o-frontend-prod/
gsutil iam ch allUsers:objectViewer gs://red-o-frontend-prod
```

#### 3.5 Deploy Backend
```bash
cd backend

# Build y deploy
gcloud builds submit --tag gcr.io/red-o-production/red-o-backend
gcloud run deploy red-o-backend \
  --image gcr.io/red-o-production/red-o-backend \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-env-vars="NODE_ENV=production,GCS_BUCKET=red-o-images-prod,USE_GCS=true" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RECAPTCHA_SECRET_KEY=recaptcha-secret:latest"
```

#### 3.6 Deploy Frontend
```bash
cd frontend

# Configurar URL del backend
BACKEND_URL=$(gcloud run services describe red-o-backend --region us-central1 --format 'value(status.url)')
cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}/api
EOF

# Build y deploy
npm install
npm run build
gsutil -m rsync -r -d dist/ gs://red-o-frontend-prod/
```

## Actualizaciones

### Actualizar Backend
```bash
./update-backend.sh
```

### Actualizar Frontend
```bash
./update-frontend.sh
```

## Monitoreo

### Ver logs
```bash
# Backend
gcloud run logs read red-o-backend --region us-central1 --limit 100

# MongoDB
gcloud compute ssh mongodb-server --zone us-central1-a
sudo tail -f /var/log/mongodb/mongod.log
```

### Ver estado
```bash
# Cloud Run
gcloud run services describe red-o-backend --region us-central1

# MongoDB
gcloud compute instances describe mongodb-server --zone us-central1-a
```

## URLs Importantes

Después del despliegue:

- **Backend API**: `https://red-o-backend-XXXXX-uc.a.run.app`
- **Frontend**: `https://storage.googleapis.com/red-o-frontend-prod/index.html`
- **Imágenes**: `https://storage.googleapis.com/red-o-images-prod/`

## Costos Estimados

### Capa Gratuita (Always Free):
- ✅ Compute Engine f1-micro (MongoDB): **GRATIS**
- ✅ Cloud Run: 2M requests/mes **GRATIS**
- ✅ Cloud Storage: 5GB **GRATIS**
- ✅ Cloud Build: 120 build-minutes/día **GRATIS**

### Proyecto académico (bajo tráfico):
- **$0-5/mes** con capa gratuita
- **$5-20/mes** con tráfico moderado

## Troubleshooting

### Backend no conecta a MongoDB
```bash
# Verificar IP de MongoDB
gcloud compute instances describe mongodb-server --zone us-central1-a --format='get(networkInterfaces[0].networkIP)'

# Verificar secreto
gcloud secrets versions access latest --secret=mongodb-uri

# Probar conexión desde Cloud Run
gcloud run services update red-o-backend --region us-central1
```

### Frontend no carga
```bash
# Verificar archivos
gsutil ls gs://red-o-frontend-prod/

# Verificar permisos
gsutil iam get gs://red-o-frontend-prod
```

### Error 500 en uploads
```bash
# Verificar permisos en bucket de imágenes
gsutil iam ch allUsers:objectViewer gs://red-o-images-prod/

# Ver logs
gcloud run logs read red-o-backend --region us-central1 --limit 50
```

## Documentación Completa

Ver `GCP_DEPLOYMENT.md` para documentación detallada.

## Soporte

- Logs: `gcloud run logs read red-o-backend`
- Status: `gcloud run services list`
- Secretos: `gcloud secrets list`

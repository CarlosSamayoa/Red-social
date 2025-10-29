#!/bin/bash
set -e

echo "🚀 Red-O - Complete Deployment to Google Cloud Platform"
echo "========================================================"
echo ""

# Variables de configuración
PROJECT_ID="red-o-production"
REGION="us-central1"
ZONE="us-central1-a"
BACKEND_SERVICE="red-o-backend"
FRONTEND_BUCKET="red-o-frontend-prod"
IMAGES_BUCKET="red-o-images-prod"
MONGODB_VM="mongodb-server"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que gcloud esté instalado
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI no está instalado. Instálalo desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Configurar proyecto
log_info "Configurando proyecto: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Verificar si el proyecto existe
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    log_error "El proyecto $PROJECT_ID no existe. Créalo primero en: https://console.cloud.google.com"
    exit 1
fi

echo ""
echo "==================================================="
echo "Paso 1: Habilitar APIs necesarias"
echo "==================================================="

apis=(
    "run.googleapis.com"
    "storage.googleapis.com"
    "secretmanager.googleapis.com"
    "containerregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "compute.googleapis.com"
)

for api in "${apis[@]}"; do
    log_info "Habilitando $api..."
    gcloud services enable $api --quiet
done

echo ""
echo "==================================================="
echo "Paso 2: Crear buckets de Cloud Storage"
echo "==================================================="

# Bucket para imágenes
if gsutil ls -b gs://$IMAGES_BUCKET &> /dev/null; then
    log_warn "Bucket $IMAGES_BUCKET ya existe"
else
    log_info "Creando bucket para imágenes: $IMAGES_BUCKET"
    gsutil mb -c STANDARD -l $REGION gs://$IMAGES_BUCKET/
    gsutil iam ch allUsers:objectViewer gs://$IMAGES_BUCKET
    
    # Configurar CORS
    cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF
    gsutil cors set /tmp/cors.json gs://$IMAGES_BUCKET/
    rm /tmp/cors.json
fi

# Bucket para frontend
if gsutil ls -b gs://$FRONTEND_BUCKET &> /dev/null; then
    log_warn "Bucket $FRONTEND_BUCKET ya existe"
else
    log_info "Creando bucket para frontend: $FRONTEND_BUCKET"
    gsutil mb -c STANDARD -l $REGION gs://$FRONTEND_BUCKET/
    gsutil web set -m index.html -e index.html gs://$FRONTEND_BUCKET/
    gsutil iam ch allUsers:objectViewer gs://$FRONTEND_BUCKET
fi

echo ""
echo "==================================================="
echo "Paso 3: Configurar MongoDB en Compute Engine"
echo "==================================================="

if gcloud compute instances describe $MONGODB_VM --zone=$ZONE &> /dev/null; then
    log_warn "VM de MongoDB ya existe"
else
    log_info "Creando VM f1-micro para MongoDB..."
    
    # Solicitar contraseña segura
    echo ""
    echo "Configura las credenciales de MongoDB:"
    read -p "Usuario admin MongoDB: " MONGO_ADMIN_USER
    read -sp "Contraseña admin MongoDB: " MONGO_ADMIN_PASS
    echo ""
    read -p "Usuario app MongoDB: " MONGO_APP_USER
    read -sp "Contraseña app MongoDB: " MONGO_APP_PASS
    echo ""
    
    gcloud compute instances create $MONGODB_VM \
      --zone=$ZONE \
      --machine-type=f1-micro \
      --image-family=ubuntu-2204-lts \
      --image-project=ubuntu-os-cloud \
      --boot-disk-size=30GB \
      --boot-disk-type=pd-standard \
      --tags=mongodb-server \
      --metadata=startup-script="#!/bin/bash
apt-get update
apt-get upgrade -y
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org
sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf
cat >> /etc/mongod.conf <<EOL
security:
  authorization: enabled
EOL
systemctl start mongod
systemctl enable mongod
sleep 10
mongosh --eval '
use admin
db.createUser({
  user: \"$MONGO_ADMIN_USER\",
  pwd: \"$MONGO_ADMIN_PASS\",
  roles: [
    { role: \"userAdminAnyDatabase\", db: \"admin\" },
    { role: \"readWriteAnyDatabase\", db: \"admin\" }
  ]
})
'
mongosh --eval '
use redodb
db.createUser({
  user: \"$MONGO_APP_USER\",
  pwd: \"$MONGO_APP_PASS\",
  roles: [{ role: \"readWrite\", db: \"redodb\" }]
})
'
"
    
    log_info "Creando regla de firewall para MongoDB..."
    gcloud compute firewall-rules create allow-mongodb \
      --direction=INGRESS \
      --priority=1000 \
      --network=default \
      --action=ALLOW \
      --rules=tcp:27017 \
      --source-ranges=0.0.0.0/0 \
      --target-tags=mongodb-server
    
    log_info "Esperando a que MongoDB se inicialice (60 segundos)..."
    sleep 60
    
    # Obtener IP interna
    MONGODB_IP=$(gcloud compute instances describe $MONGODB_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')
    MONGO_URI="mongodb://$MONGO_APP_USER:$MONGO_APP_PASS@$MONGODB_IP:27017/redodb?authSource=redodb"
    
    log_info "MongoDB IP Interna: $MONGODB_IP"
    log_info "Connection String: $MONGO_URI"
    
    # Guardar en Secret Manager
    echo -n "$MONGO_URI" | gcloud secrets create mongodb-uri --data-file=- || \
    echo -n "$MONGO_URI" | gcloud secrets versions add mongodb-uri --data-file=-
fi

echo ""
echo "==================================================="
echo "Paso 4: Configurar secretos en Secret Manager"
echo "==================================================="

# Función para crear o actualizar secreto
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name &> /dev/null; then
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
        log_info "Secreto $secret_name actualizado"
    else
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=-
        log_info "Secreto $secret_name creado"
    fi
}

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
create_or_update_secret "jwt-secret" "$JWT_SECRET"

# Solicitar otros secretos si no existen
if ! gcloud secrets describe google-client-id &> /dev/null; then
    read -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
    create_or_update_secret "google-client-id" "$GOOGLE_CLIENT_ID"
fi

if ! gcloud secrets describe google-client-secret &> /dev/null; then
    read -sp "Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
    echo ""
    create_or_update_secret "google-client-secret" "$GOOGLE_CLIENT_SECRET"
fi

if ! gcloud secrets describe recaptcha-secret &> /dev/null; then
    read -sp "reCAPTCHA Secret Key: " RECAPTCHA_SECRET
    echo ""
    create_or_update_secret "recaptcha-secret" "$RECAPTCHA_SECRET"
fi

# Otorgar permisos
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
for secret in mongodb-uri jwt-secret google-client-id google-client-secret recaptcha-secret; do
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet || true
done

echo ""
echo "==================================================="
echo "Paso 5: Build y Deploy del Backend"
echo "==================================================="

cd backend

log_info "Construyendo imagen Docker..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE

log_info "Desplegando a Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
  --image gcr.io/$PROJECT_ID/$BACKEND_SERVICE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production,GCS_BUCKET=$IMAGES_BUCKET,USE_GCS=true" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RECAPTCHA_SECRET_KEY=recaptcha-secret:latest"

BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
log_info "Backend desplegado en: $BACKEND_URL"

cd ..

echo ""
echo "==================================================="
echo "Paso 6: Build y Deploy del Frontend"
echo "==================================================="

cd frontend

log_info "Creando archivo .env.production..."
cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}/api
VITE_GOOGLE_CLIENT_ID=$(gcloud secrets versions access latest --secret=google-client-id)
EOF

log_info "Instalando dependencias..."
npm install

log_info "Construyendo frontend..."
npm run build

log_info "Desplegando a Cloud Storage..."
gsutil -m rsync -r -d dist/ gs://$FRONTEND_BUCKET/

cd ..

echo ""
echo "==================================================="
echo "✅ DEPLOYMENT COMPLETADO"
echo "==================================================="
echo ""
echo "📍 URLs importantes:"
echo "   Backend API: $BACKEND_URL"
echo "   Frontend: https://storage.googleapis.com/$FRONTEND_BUCKET/index.html"
echo ""
echo "📊 Para ver logs del backend:"
echo "   gcloud run logs read $BACKEND_SERVICE --region $REGION"
echo ""
echo "🔐 Para ver secretos:"
echo "   gcloud secrets list"
echo ""
echo "💾 Para conectar a MongoDB:"
echo "   gcloud compute ssh $MONGODB_VM --zone=$ZONE"
echo ""
echo "🎉 ¡Tu aplicación está lista!"

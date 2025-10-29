#!/bin/bash
set -e

echo "🔄 Actualizando Frontend en Cloud Storage..."

# Variables
BUCKET="red-o-frontend-prod"
BACKEND_SERVICE="red-o-backend"
REGION="us-central1"

# Obtener URL del backend
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')

# Build
echo "🏗️ Construyendo frontend..."
cd frontend

# Crear .env.production
cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}/api
EOF

npm install
npm run build

# Deploy
echo "📤 Desplegando a Cloud Storage..."
gsutil -m rsync -r -d dist/ gs://$BUCKET/

echo "✅ Frontend actualizado!"
echo "URL: https://storage.googleapis.com/$BUCKET/index.html"

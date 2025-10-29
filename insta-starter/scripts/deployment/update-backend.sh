#!/bin/bash
set -e

echo "🔄 Actualizando Backend en Cloud Run..."

# Variables
PROJECT_ID="red-o-production"
REGION="us-central1"
SERVICE_NAME="red-o-backend"

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Build nueva imagen
echo "📦 Construyendo nueva imagen Docker..."
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy
echo "🚢 Desplegando a Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --region $REGION \
  --platform managed

# Obtener URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "✅ Backend actualizado!"
echo "URL: $SERVICE_URL"

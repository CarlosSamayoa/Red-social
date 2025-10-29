#!/bin/bash
set -e

echo "🧹 Limpiando recursos de Google Cloud Platform..."
echo ""

# Variables
PROJECT_ID="red-o-production"
REGION="us-central1"
ZONE="us-central1-a"
BACKEND_SERVICE="red-o-backend"
FRONTEND_BUCKET="red-o-frontend-prod"
IMAGES_BUCKET="red-o-images-prod"
MONGODB_VM="mongodb-server"

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Preguntar confirmación
read -p "⚠️  ¿Estás seguro de que quieres eliminar TODOS los recursos? (yes/no): " confirmation
if [ "$confirmation" != "yes" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo "Eliminando Cloud Run service..."
gcloud run services delete $BACKEND_SERVICE --region=$REGION --quiet || true

echo ""
echo "Eliminando buckets de Cloud Storage..."
gsutil -m rm -r gs://$FRONTEND_BUCKET/ || true
gsutil -m rm -r gs://$IMAGES_BUCKET/ || true

echo ""
echo "Eliminando VM de MongoDB..."
gcloud compute instances delete $MONGODB_VM --zone=$ZONE --quiet || true

echo ""
echo "Eliminando regla de firewall..."
gcloud compute firewall-rules delete allow-mongodb --quiet || true

echo ""
echo "Eliminando imágenes de Container Registry..."
gcloud container images delete gcr.io/$PROJECT_ID/$BACKEND_SERVICE --quiet || true

echo ""
echo "Eliminando secretos..."
for secret in mongodb-uri jwt-secret google-client-id google-client-secret recaptcha-secret; do
    gcloud secrets delete $secret --quiet || true
done

echo ""
echo "✅ Limpieza completada"
echo ""
echo "⚠️  Nota: Este script NO elimina el proyecto de Google Cloud."
echo "   Si quieres eliminar el proyecto completo, usa:"
echo "   gcloud projects delete $PROJECT_ID"

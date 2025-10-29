#!/bin/bash

# =============================================================================
# Red-O - Script de Deployment de Aplicación en Compute Engine
# =============================================================================
# Este script deploya el código de la aplicación (backend + frontend)
# =============================================================================

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================================================
# 1. CONFIGURACIÓN
# =============================================================================

print_message "⚙️  Configurando deployment..."

# Solicitar información
read -p "🔹 Ingresa tu PROJECT_ID de GCP: " PROJECT_ID
read -p "🔹 Ingresa el dominio de tu app (ej: red-o-app.duckdns.org): " APP_DOMAIN
read -p "🔹 Ingresa el dominio de tu DB (ej: red-o-db.duckdns.org): " DB_DOMAIN
read -p "🔹 Ingresa la contraseña de MongoDB app user: " MONGODB_APP_PASSWORD
read -p "🔹 Ingresa tu JWT_SECRET: " JWT_SECRET
read -p "🔹 Ingresa tu Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "🔹 Ingresa tu Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
read -p "🔹 Ingresa tu reCAPTCHA Secret Key: " RECAPTCHA_SECRET_KEY
read -p "🔹 Ingresa tu reCAPTCHA Site Key: " RECAPTCHA_SITE_KEY
read -p "🔹 Ingresa tu DuckDNS Token: " DUCKDNS_TOKEN

ZONE="us-central1-a"
BUCKET_NAME="${PROJECT_ID}-red-o-images"
APP_DOMAIN_PREFIX=$(echo ${APP_DOMAIN} | cut -d'.' -f1)

# Configurar gcloud
gcloud config set project ${PROJECT_ID}
gcloud config set compute/zone ${ZONE}

print_info "✅ Configuración completada"

# =============================================================================
# 2. PREPARAR CÓDIGO LOCALMENTE
# =============================================================================

print_message "📦 Preparando código..."

# Crear archivo .env para backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=8080

# MongoDB
MONGODB_URI=mongodb://red-o-user:${MONGODB_APP_PASSWORD}@${DB_DOMAIN}:27017/red-o?authSource=red-o

# JWT
JWT_SECRET=${JWT_SECRET}

# Google OAuth
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# reCAPTCHA
RECAPTCHA_SECRET_KEY=${RECAPTCHA_SECRET_KEY}

# Google Cloud Storage
GCS_BUCKET_NAME=${BUCKET_NAME}
GCS_PROJECT_ID=${PROJECT_ID}
USE_GCS=true

# Session
SESSION_SECRET=${JWT_SECRET}
EOF

print_info "✅ Backend .env creado"

# Crear archivo .env.production para frontend
cat > frontend/.env.production << EOF
VITE_API_URL=https://${APP_DOMAIN}/api
VITE_GCS_IMAGES_URL=https://storage.googleapis.com/${BUCKET_NAME}
VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
VITE_RECAPTCHA_SITE_KEY=${RECAPTCHA_SITE_KEY}
EOF

print_info "✅ Frontend .env.production creado"

# Instalar dependencias y build del frontend
print_message "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

print_info "✅ Frontend build completado"

# Comprimir backend
print_message "📦 Comprimiendo archivos..."
cd backend
tar --exclude='node_modules' --exclude='storage' -czf ../backend.tar.gz .
cd ..

# Comprimir frontend
cd frontend
tar -czf ../frontend.tar.gz dist/
cd ..

print_info "✅ Archivos comprimidos"

# =============================================================================
# 3. SUBIR ARCHIVOS AL SERVIDOR
# =============================================================================

print_message "⬆️  Subiendo archivos al servidor..."

gcloud compute scp backend.tar.gz red-o-app:~ --zone=${ZONE}
gcloud compute scp frontend.tar.gz red-o-app:~ --zone=${ZONE}

print_info "✅ Archivos subidos"

# Limpiar archivos locales
rm backend.tar.gz frontend.tar.gz

# =============================================================================
# 4. CONFIGURAR DUCKDNS EN SERVIDOR
# =============================================================================

print_message "🦆 Configurando DuckDNS..."

cat > /tmp/setup-duckdns-app.sh << EOF
#!/bin/bash
set -e

mkdir -p ~/duckdns
cd ~/duckdns

cat > duck.sh << 'DUCK_SCRIPT'
#!/bin/bash
current=""
while true; do
    latest=\$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
    echo "public-ip=\$latest"
    
    if [ "\$current" == "\$latest" ]; then
        echo "IP no ha cambiado"
    else
        echo "IP ha cambiado - actualizando DuckDNS"
        current=\$latest
        echo url="https://www.duckdns.org/update?domains=${APP_DOMAIN_PREFIX}&token=${DUCKDNS_TOKEN}&ip=\$latest" | curl -k -o ~/duckdns/duck.log -K -
    fi
    sleep 5m
done
DUCK_SCRIPT

chmod 700 duck.sh

cat > duck_daemon.sh << 'DAEMON'
#!/bin/bash
nohup ~/duckdns/duck.sh > ~/duckdns/duck.log 2>&1&
DAEMON

chmod +x duck_daemon.sh
sudo chown root duck_daemon.sh
sudo chmod 744 duck_daemon.sh

sudo ./duck_daemon.sh
sudo ln -sf ~/duckdns/duck_daemon.sh /etc/rc2.d/S10duckdns

echo "DuckDNS configurado"
EOF

gcloud compute scp /tmp/setup-duckdns-app.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/setup-duckdns-app.sh"

rm /tmp/setup-duckdns-app.sh

print_info "✅ DuckDNS configurado"

# =============================================================================
# 5. CONFIGURAR NGINX
# =============================================================================

print_message "🌐 Configurando Nginx..."

cat > /tmp/nginx-config << EOF
# Redirigir HTTP a HTTPS (se habilitará después de configurar SSL)
server {
    listen 80;
    server_name ${APP_DOMAIN};
    
    # Temporalmente servir en HTTP hasta configurar SSL
    
    location / {
        root /var/www/red-o/frontend;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass \$http_upgrade;
    }
    
    client_max_body_size 10M;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

cat > /tmp/setup-nginx.sh << 'NGINX_SETUP'
#!/bin/bash
set -e

# Copiar configuración
sudo cp /tmp/nginx-config /etc/nginx/sites-available/red-o

# Habilitar sitio
sudo ln -sf /etc/nginx/sites-available/red-o /etc/nginx/sites-enabled/

# Eliminar default
sudo rm -f /etc/nginx/sites-enabled/default

# Probar configuración
sudo nginx -t

# Recargar
sudo systemctl reload nginx

echo "Nginx configurado"
NGINX_SETUP

gcloud compute scp /tmp/nginx-config red-o-app:/tmp/nginx-config --zone=${ZONE}
gcloud compute scp /tmp/setup-nginx.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/setup-nginx.sh"

rm /tmp/nginx-config /tmp/setup-nginx.sh

print_info "✅ Nginx configurado"

# =============================================================================
# 6. INSTALAR BACKEND
# =============================================================================

print_message "🔧 Instalando backend..."

cat > /tmp/install-backend.sh << 'BACKEND_INSTALL'
#!/bin/bash
set -e

# Crear directorio
sudo mkdir -p /opt/red-o-backend
sudo chown red-o:red-o /opt/red-o-backend

# Descomprimir
sudo -u red-o tar -xzf ~/backend.tar.gz -C /opt/red-o-backend

# Instalar dependencias
cd /opt/red-o-backend
sudo -u red-o npm install --production

# Configurar PM2
sudo -u red-o pm2 start server.js --name red-o-api
sudo -u red-o pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u red-o --hp /home/red-o

echo "Backend instalado"
BACKEND_INSTALL

gcloud compute scp /tmp/install-backend.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/install-backend.sh"

rm /tmp/install-backend.sh

print_info "✅ Backend instalado y corriendo"

# =============================================================================
# 7. INSTALAR FRONTEND
# =============================================================================

print_message "🎨 Instalando frontend..."

cat > /tmp/install-frontend.sh << 'FRONTEND_INSTALL'
#!/bin/bash
set -e

# Crear directorio
sudo mkdir -p /var/www/red-o/frontend
sudo chown -R red-o:red-o /var/www/red-o

# Descomprimir
cd /tmp
tar -xzf ~/frontend.tar.gz
sudo mv dist/* /var/www/red-o/frontend/
sudo chown -R red-o:red-o /var/www/red-o

echo "Frontend instalado"
FRONTEND_INSTALL

gcloud compute scp /tmp/install-frontend.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/install-frontend.sh"

rm /tmp/install-frontend.sh

print_info "✅ Frontend instalado"

# =============================================================================
# 8. VERIFICAR DEPLOYMENT
# =============================================================================

print_message "🔍 Verificando deployment..."

# Verificar servicios
gcloud compute ssh red-o-app --zone=${ZONE} --command="pm2 status"
gcloud compute ssh red-o-app --zone=${ZONE} --command="sudo systemctl status nginx --no-pager"

print_info "✅ Servicios verificados"

# =============================================================================
# 9. MOSTRAR RESUMEN
# =============================================================================

print_message "✅ Deployment completado!"

echo ""
echo "============================================="
echo "🎉 DEPLOYMENT EXITOSO"
echo "============================================="
echo ""
echo "🌐 Tu aplicación está disponible en:"
echo "   http://${APP_DOMAIN}"
echo ""
echo "⚠️  IMPORTANTE: Configura SSL ejecutando:"
echo "   ./scripts/deployment/setup-ssl-compute-engine.sh"
echo ""
echo "============================================="
echo "📋 COMANDOS ÚTILES"
echo "============================================="
echo ""
echo "Ver logs del backend:"
echo "   gcloud compute ssh red-o-app --zone=${ZONE}"
echo "   pm2 logs red-o-api"
echo ""
echo "Ver logs de Nginx:"
echo "   gcloud compute ssh red-o-app --zone=${ZONE}"
echo "   sudo tail -f /var/log/nginx/access.log"
echo ""
echo "Reiniciar servicios:"
echo "   pm2 restart red-o-api"
echo "   sudo systemctl reload nginx"
echo ""
print_info "🎊 ¡Felicidades!"

#!/bin/bash

# =============================================================================
# Red-O - Script de Configuración SSL con Let's Encrypt
# =============================================================================
# Este script configura certificados SSL gratuitos con Let's Encrypt
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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# =============================================================================
# 1. CONFIGURACIÓN
# =============================================================================

print_message "⚙️  Configurando SSL..."

read -p "🔹 Ingresa el dominio de tu app (ej: red-o-app.duckdns.org): " APP_DOMAIN
read -p "🔹 Ingresa tu email para Let's Encrypt: " EMAIL

ZONE="us-central1-a"

print_info "✅ Configuración completada"

# =============================================================================
# 2. INSTALAR CERTBOT
# =============================================================================

print_message "📦 Instalando Certbot..."

cat > /tmp/install-certbot.sh << 'CERTBOT'
#!/bin/bash
set -e

# Instalar Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

echo "Certbot instalado"
CERTBOT

gcloud compute scp /tmp/install-certbot.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/install-certbot.sh"

rm /tmp/install-certbot.sh

print_info "✅ Certbot instalado"

# =============================================================================
# 3. OBTENER CERTIFICADO
# =============================================================================

print_message "🔐 Obteniendo certificado SSL..."

cat > /tmp/get-cert.sh << EOF
#!/bin/bash
set -e

# Obtener certificado
sudo certbot --nginx -d ${APP_DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

echo "Certificado obtenido"
EOF

gcloud compute scp /tmp/get-cert.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/get-cert.sh"

rm /tmp/get-cert.sh

print_info "✅ Certificado SSL obtenido"

# =============================================================================
# 4. CONFIGURAR NGINX PARA HTTPS
# =============================================================================

print_message "🌐 Configurando Nginx para HTTPS..."

cat > /tmp/nginx-https << EOF
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name ${APP_DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name ${APP_DOMAIN};

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/red-o-access.log;
    error_log /var/log/nginx/red-o-error.log;

    # Frontend - Servir archivos estáticos
    location / {
        root /var/www/red-o/frontend;
        try_files \$uri \$uri/ /index.html;
        
        # Headers de caché
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Backend API - Proxy a Node.js
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        
        # Headers necesarios
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # No cachear API
        proxy_cache_bypass \$http_upgrade;
    }

    # Límite de tamaño de uploads
    client_max_body_size 10M;

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

cat > /tmp/update-nginx.sh << 'NGINX_UPDATE'
#!/bin/bash
set -e

# Actualizar configuración
sudo cp /tmp/nginx-https /etc/nginx/sites-available/red-o

# Probar configuración
sudo nginx -t

# Recargar
sudo systemctl reload nginx

echo "Nginx configurado para HTTPS"
NGINX_UPDATE

gcloud compute scp /tmp/nginx-https red-o-app:/tmp/nginx-https --zone=${ZONE}
gcloud compute scp /tmp/update-nginx.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/update-nginx.sh"

rm /tmp/nginx-https /tmp/update-nginx.sh

print_info "✅ Nginx configurado para HTTPS"

# =============================================================================
# 5. CONFIGURAR AUTO-RENOVACIÓN
# =============================================================================

print_message "🔄 Configurando auto-renovación..."

cat > /tmp/test-renewal.sh << 'RENEWAL'
#!/bin/bash
set -e

# Probar renovación automática
sudo certbot renew --dry-run

echo "Auto-renovación configurada"
RENEWAL

gcloud compute scp /tmp/test-renewal.sh red-o-app:~ --zone=${ZONE}
gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/test-renewal.sh"

rm /tmp/test-renewal.sh

print_info "✅ Auto-renovación configurada"

# =============================================================================
# 6. MOSTRAR RESUMEN
# =============================================================================

print_message "✅ SSL configurado exitosamente!"

echo ""
echo "============================================="
echo "🔐 SSL CONFIGURADO"
echo "============================================="
echo ""
echo "🌐 Tu aplicación ahora está disponible en:"
echo "   https://${APP_DOMAIN}"
echo ""
echo "✅ Características:"
echo "   - Certificado SSL válido de Let's Encrypt"
echo "   - Renovación automática cada 60 días"
echo "   - Redirección automática HTTP → HTTPS"
echo "   - Headers de seguridad configurados"
echo "   - HSTS habilitado"
echo ""
echo "============================================="
echo "📋 INFORMACIÓN DEL CERTIFICADO"
echo "============================================="
echo ""

# Mostrar información del certificado
gcloud compute ssh red-o-app --zone=${ZONE} --command="sudo certbot certificates"

echo ""
print_info "🎉 ¡SSL configurado correctamente!"

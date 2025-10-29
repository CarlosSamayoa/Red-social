#!/bin/bash

#############################################
# Setup SSL - Ejecutar desde SSH de VM App
# Para ejecutar DENTRO de la VM de Aplicación
# DESPUÉS de setup-app-vm.sh
#############################################

set -e  # Salir si hay errores

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Setup SSL con Let's Encrypt - Red-O${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#############################################
# 1. VERIFICAR PREREQUISITOS
#############################################

echo -e "${BLUE}━━━ Verificando prerequisitos ━━━${NC}"

# Verificar Nginx
if ! sudo systemctl is-active --quiet nginx; then
    echo -e "${RED}✗ Nginx no está corriendo${NC}"
    echo "Ejecuta primero: setup-app-vm.sh"
    exit 1
fi

# Verificar configuración de Nginx
if [ ! -f /etc/nginx/sites-available/red-o ]; then
    echo -e "${RED}✗ Configuración de Nginx no encontrada${NC}"
    echo "Ejecuta primero: setup-app-vm.sh"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisitos verificados${NC}"
echo ""

#############################################
# 2. SOLICITAR CONFIGURACIÓN
#############################################

echo -e "${YELLOW}📝 Configuración de SSL${NC}"
read -p "Dominio (ej: mi-app.duckdns.org): " DOMAIN
read -p "Email para Let's Encrypt: " EMAIL

echo ""
echo -e "${GREEN}✓ Configuración recibida${NC}"
echo ""

#############################################
# 3. VERIFICAR DNS
#############################################

echo -e "${BLUE}━━━ Verificando DNS ━━━${NC}"

# Obtener IP de la VM
VM_IP=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

# Resolver dominio
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$VM_IP" != "$DOMAIN_IP" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: DNS podría no estar sincronizado${NC}"
    echo -e "  IP de VM: $VM_IP"
    echo -e "  IP de dominio: $DOMAIN_IP"
    echo ""
    read -p "¿Continuar de todas formas? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Abortado."
        exit 1
    fi
else
    echo -e "${GREEN}✓ DNS configurado correctamente${NC}"
    echo -e "  $DOMAIN → $VM_IP"
fi

echo ""

#############################################
# 4. INSTALAR CERTBOT
#############################################

echo -e "${BLUE}━━━ Instalando Certbot ━━━${NC}"

sudo apt-get update -qq
sudo apt-get install -y certbot python3-certbot-nginx

echo -e "${GREEN}✓ Certbot instalado${NC}"
echo ""

#############################################
# 5. OBTENER CERTIFICADO SSL
#############################################

echo -e "${BLUE}━━━ Obteniendo certificado SSL ━━━${NC}"
echo ""

# Ejecutar Certbot
sudo certbot --nginx \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

echo ""
echo -e "${GREEN}✓ Certificado SSL obtenido${NC}"
echo ""

#############################################
# 6. ACTUALIZAR CONFIGURACIÓN DE NGINX
#############################################

echo -e "${BLUE}━━━ Optimizando configuración de Nginx ━━━${NC}"

# Crear configuración optimizada con SSL
sudo tee /etc/nginx/sites-available/red-o > /dev/null << EOFNGINX
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirigir HTTP a HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Certificados SSL (gestionados por Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Configuración SSL adicional
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Tamaño máximo de archivos
    client_max_body_size 50M;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend
    location / {
        root /var/www/red-o;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para assets estáticos
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/red-o-access.log;
    error_log /var/log/nginx/red-o-error.log;
}
EOFNGINX

# Probar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx optimizado para HTTPS${NC}"
echo ""

#############################################
# 7. CONFIGURAR AUTO-RENOVACIÓN
#############################################

echo -e "${BLUE}━━━ Configurando auto-renovación ━━━${NC}"

# Probar renovación
sudo certbot renew --dry-run

echo -e "${GREEN}✓ Auto-renovación configurada${NC}"
echo ""

#############################################
# 8. ACTUALIZAR BACKEND .ENV
#############################################

echo -e "${BLUE}━━━ Actualizando configuración de backend ━━━${NC}"

# Actualizar FRONTEND_URL y GOOGLE_CALLBACK_URL a HTTPS
cd ~/Red-social/insta-starter/backend
sed -i "s|http://$DOMAIN|https://$DOMAIN|g" .env

# Reiniciar backend
pm2 restart red-o-api

echo -e "${GREEN}✓ Backend actualizado${NC}"
echo ""

#############################################
# 9. VERIFICACIÓN FINAL
#############################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SSL CONFIGURADO EXITOSAMENTE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📊 Información SSL:${NC}"
echo -e "  Dominio: ${GREEN}$DOMAIN${NC}"
echo -e "  Certificado válido: ${GREEN}90 días${NC}"
echo -e "  Auto-renovación: ${GREEN}Habilitada${NC}"
echo ""

echo -e "${YELLOW}🌐 URLs de acceso:${NC}"
echo -e "  Frontend: ${GREEN}https://$DOMAIN${NC}"
echo -e "  API: ${GREEN}https://$DOMAIN/api${NC}"
echo -e "  API Health: ${GREEN}https://$DOMAIN/api/health${NC}"
echo ""

echo -e "${YELLOW}� Estado de seguridad:${NC}"
echo -e "  HTTPS: ${GREEN}✓ Habilitado${NC}"
echo -e "  HTTP → HTTPS: ${GREEN}✓ Redirección activa${NC}"
echo -e "  HSTS: ${GREEN}✓ Habilitado (1 año)${NC}"
echo -e "  TLS: ${GREEN}✓ 1.2 y 1.3${NC}"
echo ""

echo -e "${YELLOW}📚 Comandos útiles:${NC}"
echo -e "  Ver certificado: ${BLUE}sudo certbot certificates${NC}"
echo -e "  Renovar manualmente: ${BLUE}sudo certbot renew${NC}"
echo -e "  Verificar SSL: ${BLUE}curl -I https://$DOMAIN${NC}"
echo -e "  Test SSL Labs: ${BLUE}https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN${NC}"
echo ""

echo -e "${GREEN}🎉 ¡HTTPS configurado! Accede a: https://$DOMAIN${NC}"
echo ""

# Guardar información SSL
cat > ~/ssl-config.txt << EOFCONFIG
SSL Configuration
=================

Configurado: $(date)

Dominio: $DOMAIN
Email: $EMAIL

Certificado: /etc/letsencrypt/live/$DOMAIN/fullchain.pem
Clave privada: /etc/letsencrypt/live/$DOMAIN/privkey.pem

Auto-renovación: Habilitada (cron)
Próxima verificación: $(sudo certbot certificates | grep "Expiry Date" | head -1)

URLs:
  Frontend: https://$DOMAIN
  API: https://$DOMAIN/api

Comandos útiles:
  Ver certificados: sudo certbot certificates
  Renovar: sudo certbot renew
  Logs: sudo tail -f /var/log/letsencrypt/letsencrypt.log

Security Headers:
  ✓ Strict-Transport-Security
  ✓ X-Frame-Options
  ✓ X-Content-Type-Options
  ✓ X-XSS-Protection
  ✓ Referrer-Policy

Next Steps:
1. Verificar que la aplicación funciona en HTTPS
2. Comprobar redirección HTTP → HTTPS
3. Testear en SSL Labs para verificar seguridad
EOFCONFIG

echo -e "${YELLOW}💾 Configuración SSL guardada en: ${BLUE}~/ssl-config.txt${NC}"
echo ""

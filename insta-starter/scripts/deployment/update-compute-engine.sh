#!/bin/bash

# =============================================================================
# Red-O - Script de Actualización Rápida (Compute Engine)
# =============================================================================
# Este script actualiza el código de la aplicación sin rehacer la infraestructura
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

ZONE="us-central1-a"

read -p "¿Actualizar Backend? (y/n): " UPDATE_BACKEND
read -p "¿Actualizar Frontend? (y/n): " UPDATE_FRONTEND

# =============================================================================
# ACTUALIZAR BACKEND
# =============================================================================

if [ "$UPDATE_BACKEND" = "y" ]; then
    print_message "🔧 Actualizando backend..."
    
    # Comprimir backend
    cd backend
    tar --exclude='node_modules' --exclude='storage' -czf ../backend.tar.gz .
    cd ..
    
    # Subir
    gcloud compute scp backend.tar.gz red-o-app:~ --zone=${ZONE}
    
    # Instalar
    cat > /tmp/update-backend.sh << 'UPDATE_BACKEND'
#!/bin/bash
set -e

# Detener servicio
sudo -u red-o pm2 stop red-o-api

# Backup
sudo mv /opt/red-o-backend /opt/red-o-backend.backup.$(date +%Y%m%d_%H%M%S)

# Descomprimir nuevo código
sudo mkdir -p /opt/red-o-backend
sudo chown red-o:red-o /opt/red-o-backend
sudo -u red-o tar -xzf ~/backend.tar.gz -C /opt/red-o-backend

# Instalar dependencias
cd /opt/red-o-backend
sudo -u red-o npm install --production

# Reiniciar servicio
sudo -u red-o pm2 start server.js --name red-o-api
sudo -u red-o pm2 save

echo "Backend actualizado"
UPDATE_BACKEND
    
    gcloud compute scp /tmp/update-backend.sh red-o-app:~ --zone=${ZONE}
    gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/update-backend.sh"
    
    rm backend.tar.gz /tmp/update-backend.sh
    
    print_info "✅ Backend actualizado"
fi

# =============================================================================
# ACTUALIZAR FRONTEND
# =============================================================================

if [ "$UPDATE_FRONTEND" = "y" ]; then
    print_message "🎨 Actualizando frontend..."
    
    # Build frontend
    cd frontend
    npm run build
    tar -czf ../frontend.tar.gz dist/
    cd ..
    
    # Subir
    gcloud compute scp frontend.tar.gz red-o-app:~ --zone=${ZONE}
    
    # Instalar
    cat > /tmp/update-frontend.sh << 'UPDATE_FRONTEND'
#!/bin/bash
set -e

# Backup
sudo mv /var/www/red-o/frontend /var/www/red-o/frontend.backup.$(date +%Y%m%d_%H%M%S)

# Descomprimir nuevo código
sudo mkdir -p /var/www/red-o/frontend
cd /tmp
tar -xzf ~/frontend.tar.gz
sudo mv dist/* /var/www/red-o/frontend/
sudo chown -R red-o:red-o /var/www/red-o

# Limpiar caché de Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Frontend actualizado"
UPDATE_FRONTEND
    
    gcloud compute scp /tmp/update-frontend.sh red-o-app:~ --zone=${ZONE}
    gcloud compute ssh red-o-app --zone=${ZONE} --command="bash ~/update-frontend.sh"
    
    rm frontend.tar.gz /tmp/update-frontend.sh
    
    print_info "✅ Frontend actualizado"
fi

print_message "✅ Actualización completada!"
echo ""
echo "🌐 Verifica tu aplicación en:"
echo "   https://tu-dominio.duckdns.org"
echo ""
print_info "🎉 ¡Listo!"

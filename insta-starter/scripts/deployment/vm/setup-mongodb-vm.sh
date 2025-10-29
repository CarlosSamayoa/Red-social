#!/bin/bash

#############################################
# Setup MongoDB VM - Ejecutar desde SSH
# Para ejecutar DENTRO de la VM MongoDB
#############################################

set -e  # Salir si hay errores

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Setup MongoDB VM - Red-O Social${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#############################################
# 1. SOLICITAR CONFIGURACIÓN
#############################################

echo -e "${YELLOW}📝 Configuración de DuckDNS${NC}"
read -p "DuckDNS Token: " DUCKDNS_TOKEN
read -p "Subdominio DuckDNS para MongoDB (ej: mi-db): " DUCKDNS_SUBDOMAIN

echo ""
echo -e "${YELLOW}📝 Configuración de MongoDB${NC}"
read -sp "Contraseña para admin de MongoDB: " MONGO_ADMIN_PASSWORD
echo ""
read -sp "Contraseña para usuario de aplicación: " MONGO_APP_PASSWORD
echo ""
read -p "Nombre de usuario de aplicación (default: red_o_user): " MONGO_APP_USER
MONGO_APP_USER=${MONGO_APP_USER:-red_o_user}
read -p "Nombre de base de datos (default: red_o_db): " MONGO_DB_NAME
MONGO_DB_NAME=${MONGO_DB_NAME:-red_o_db}

echo ""
echo -e "${GREEN}✓ Configuración recibida${NC}"
echo ""

#############################################
# 2. ACTUALIZAR SISTEMA
#############################################

echo -e "${BLUE}━━━ Actualizando sistema ━━━${NC}"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
echo -e "${GREEN}✓ Sistema actualizado${NC}"
echo ""

#############################################
# 3. INSTALAR MONGODB 7.0
#############################################

echo -e "${BLUE}━━━ Instalando MongoDB 7.0 ━━━${NC}"

# Importar clave GPG
echo "Importando clave GPG de MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Agregar repositorio
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Actualizar e instalar
sudo apt-get update -qq
sudo apt-get install -y mongodb-org

# Iniciar y habilitar
sudo systemctl start mongod
sudo systemctl enable mongod

# Esperar a que MongoDB esté listo
sleep 5

echo -e "${GREEN}✓ MongoDB 7.0 instalado y corriendo${NC}"
echo ""

#############################################
# 4. CONFIGURAR MONGODB PARA ACCESO REMOTO
#############################################

echo -e "${BLUE}━━━ Configurando MongoDB ━━━${NC}"

# Backup de configuración original
sudo cp /etc/mongod.conf /etc/mongod.conf.backup

# Cambiar bindIp a 0.0.0.0
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf

echo -e "${GREEN}✓ MongoDB configurado para acceso remoto${NC}"
echo ""

#############################################
# 5. CREAR USUARIOS DE MONGODB
#############################################

echo -e "${BLUE}━━━ Creando usuarios de MongoDB ━━━${NC}"

# Crear usuario admin
mongosh --eval "
use admin;
db.createUser({
  user: 'admin',
  pwd: '$MONGO_ADMIN_PASSWORD',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    'readWriteAnyDatabase'
  ]
});
" > /dev/null 2>&1

echo -e "${GREEN}✓ Usuario admin creado${NC}"

# Crear usuario de aplicación
mongosh --eval "
use $MONGO_DB_NAME;
db.createUser({
  user: '$MONGO_APP_USER',
  pwd: '$MONGO_APP_PASSWORD',
  roles: [
    { role: 'readWrite', db: '$MONGO_DB_NAME' }
  ]
});
" > /dev/null 2>&1

echo -e "${GREEN}✓ Usuario de aplicación creado${NC}"
echo ""

#############################################
# 6. HABILITAR AUTENTICACIÓN
#############################################

echo -e "${BLUE}━━━ Habilitando autenticación ━━━${NC}"

# Agregar autenticación al archivo de configuración
if ! grep -q "security:" /etc/mongod.conf; then
    echo "security:" | sudo tee -a /etc/mongod.conf > /dev/null
    echo "  authorization: enabled" | sudo tee -a /etc/mongod.conf > /dev/null
fi

# Reiniciar MongoDB
sudo systemctl restart mongod

# Esperar a que MongoDB esté listo
sleep 5

echo -e "${GREEN}✓ Autenticación habilitada${NC}"
echo ""

#############################################
# 7. CONFIGURAR DUCKDNS
#############################################

echo -e "${BLUE}━━━ Configurando DuckDNS ━━━${NC}"

# Crear directorio
mkdir -p ~/duckdns
cd ~/duckdns

# Crear script de actualización
cat > duck.sh << 'EOFSCRIPT'
#!/bin/bash

# Obtener IP pública de GCP
PUBLIC_IP=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

# Actualizar DuckDNS
echo url="https://www.duckdns.org/update?domains=SUBDOMAIN_PLACEHOLDER&token=TOKEN_PLACEHOLDER&ip=$PUBLIC_IP" | curl -k -o ~/duckdns/duck.log -K -

# Log
echo "$(date): Updated DuckDNS with IP $PUBLIC_IP" >> ~/duckdns/update.log
EOFSCRIPT

# Reemplazar placeholders
sed -i "s/SUBDOMAIN_PLACEHOLDER/$DUCKDNS_SUBDOMAIN/" duck.sh
sed -i "s/TOKEN_PLACEHOLDER/$DUCKDNS_TOKEN/" duck.sh

# Dar permisos
chmod +x duck.sh

# Ejecutar primera vez
./duck.sh

# Verificar resultado
if grep -q "OK" duck.log; then
    echo -e "${GREEN}✓ DuckDNS configurado correctamente${NC}"
else
    echo -e "${RED}✗ Error al configurar DuckDNS${NC}"
    cat duck.log
    exit 1
fi

# Agregar a crontab (cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo -e "${GREEN}✓ DuckDNS agregado a crontab${NC}"
echo ""

#############################################
# 8. CREAR SCRIPT DE INICIO AUTOMÁTICO
#############################################

echo -e "${BLUE}━━━ Configurando inicio automático ━━━${NC}"

# Crear archivo de inicio
sudo tee /etc/rc.local > /dev/null << EOFRC
#!/bin/bash
# Ejecutar DuckDNS al inicio
su - $(whoami) -c "/home/$(whoami)/duckdns/duck.sh"
exit 0
EOFRC

# Dar permisos
sudo chmod +x /etc/rc.local

echo -e "${GREEN}✓ DuckDNS se ejecutará al inicio${NC}"
echo ""

#############################################
# 9. INSTALAR HERRAMIENTAS ÚTILES
#############################################

echo -e "${BLUE}━━━ Instalando herramientas útiles ━━━${NC}"

sudo apt-get install -y -qq htop curl wget git netcat

echo -e "${GREEN}✓ Herramientas instaladas${NC}"
echo ""

#############################################
# 10. VERIFICACIÓN FINAL
#############################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ INSTALACIÓN COMPLETADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Obtener IP actual
CURRENT_IP=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

echo -e "${YELLOW}📊 Información del servidor:${NC}"
echo -e "  IP pública: ${GREEN}$CURRENT_IP${NC}"
echo -e "  DuckDNS: ${GREEN}$DUCKDNS_SUBDOMAIN.duckdns.org${NC}"
echo -e "  MongoDB: ${GREEN}mongodb://$MONGO_APP_USER:****@$DUCKDNS_SUBDOMAIN.duckdns.org:27017/$MONGO_DB_NAME${NC}"
echo ""

echo -e "${YELLOW}📝 Credenciales:${NC}"
echo -e "  Admin user: ${GREEN}admin${NC}"
echo -e "  App user: ${GREEN}$MONGO_APP_USER${NC}"
echo -e "  Database: ${GREEN}$MONGO_DB_NAME${NC}"
echo ""

echo -e "${YELLOW}🔍 Verificación:${NC}"
echo -e "  MongoDB status: $(sudo systemctl is-active mongod | sed 's/active/✓ Activo/' | sed 's/inactive/✗ Inactivo/')"
echo -e "  DuckDNS: $(cat ~/duckdns/duck.log)"
echo ""

echo -e "${YELLOW}📚 Comandos útiles:${NC}"
echo -e "  Ver logs MongoDB: ${BLUE}sudo journalctl -u mongod -f${NC}"
echo -e "  Conectar MongoDB: ${BLUE}mongosh -u $MONGO_APP_USER -p --authenticationDatabase $MONGO_DB_NAME${NC}"
echo -e "  Ver DuckDNS log: ${BLUE}cat ~/duckdns/duck.log${NC}"
echo -e "  Actualizar DuckDNS: ${BLUE}~/duckdns/duck.sh${NC}"
echo ""

echo -e "${GREEN}🎉 MongoDB VM lista para usar!${NC}"
echo ""

# Guardar configuración para referencia
cat > ~/mongodb-config.txt << EOFCONFIG
MongoDB VM Configuration
========================

Instalado: $(date)

DuckDNS:
  Subdomain: $DUCKDNS_SUBDOMAIN.duckdns.org
  IP actual: $CURRENT_IP

MongoDB:
  Version: $(mongod --version | head -1)
  Database: $MONGO_DB_NAME
  App user: $MONGO_APP_USER
  Admin user: admin

Connection String (para aplicación):
mongodb://$MONGO_APP_USER:<password>@$DUCKDNS_SUBDOMAIN.duckdns.org:27017/$MONGO_DB_NAME?authSource=$MONGO_DB_NAME

Next Steps:
1. Anotar estas credenciales de forma segura
2. Configurar VM de aplicación
3. Conectar aplicación a esta base de datos
EOFCONFIG

echo -e "${YELLOW}💾 Configuración guardada en: ${BLUE}~/mongodb-config.txt${NC}"
echo ""

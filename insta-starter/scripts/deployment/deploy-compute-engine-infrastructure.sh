#!/bin/bash

# =============================================================================
# Red-O - Script de Deployment Completo en Compute Engine
# =============================================================================
# Este script automatiza el deployment de la aplicación en Google Compute Engine
# con DuckDNS para DNS dinámico y Nginx como reverse proxy.
# =============================================================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================================================
# 1. VERIFICAR REQUISITOS
# =============================================================================

print_message "🔍 Verificando requisitos previos..."

# Verificar gcloud CLI
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI no está instalado. Instálalo desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verificar que estamos autenticados
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    print_error "No estás autenticado en gcloud. Ejecuta: gcloud auth login"
    exit 1
fi

print_info "✅ gcloud CLI instalado y autenticado"

# =============================================================================
# 2. CONFIGURACIÓN
# =============================================================================

print_message "⚙️  Configurando proyecto..."

# Solicitar información al usuario
read -p "🔹 Ingresa tu PROJECT_ID de GCP: " PROJECT_ID
read -p "🔹 Ingresa tu DuckDNS Token: " DUCKDNS_TOKEN
read -p "🔹 Ingresa el subdominio de DuckDNS para la APP (ej: red-o-app): " APP_DOMAIN_PREFIX
read -p "🔹 Ingresa el subdominio de DuckDNS para la DB (ej: red-o-db): " DB_DOMAIN_PREFIX
read -p "🔹 Ingresa la contraseña para MongoDB admin: " MONGODB_ADMIN_PASSWORD
read -p "🔹 Ingresa la contraseña para MongoDB app user: " MONGODB_APP_PASSWORD
read -p "🔹 Ingresa tu JWT_SECRET: " JWT_SECRET
read -p "🔹 Ingresa tu Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "🔹 Ingresa tu Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
read -p "🔹 Ingresa tu reCAPTCHA Secret Key: " RECAPTCHA_SECRET_KEY
read -p "🔹 Ingresa tu reCAPTCHA Site Key: " RECAPTCHA_SITE_KEY

# Configurar variables
APP_DOMAIN="${APP_DOMAIN_PREFIX}.duckdns.org"
DB_DOMAIN="${DB_DOMAIN_PREFIX}.duckdns.org"
REGION="us-central1"
ZONE="us-central1-a"
BUCKET_NAME="${PROJECT_ID}-red-o-images"

# Configurar proyecto
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

print_info "✅ Configuración completada"
print_info "   - Project ID: ${PROJECT_ID}"
print_info "   - App Domain: ${APP_DOMAIN}"
print_info "   - DB Domain: ${DB_DOMAIN}"
print_info "   - Region: ${REGION}"

# =============================================================================
# 3. HABILITAR APIS
# =============================================================================

print_message "🔓 Habilitando APIs de GCP..."

gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com

print_info "✅ APIs habilitadas"

# =============================================================================
# 4. CREAR BUCKET DE CLOUD STORAGE
# =============================================================================

print_message "📦 Creando bucket de Cloud Storage..."

# Crear bucket
if gsutil ls -b gs://${BUCKET_NAME} &> /dev/null; then
    print_warning "Bucket ${BUCKET_NAME} ya existe"
else
    gsutil mb -l ${REGION} gs://${BUCKET_NAME}
    print_info "✅ Bucket creado"
fi

# Hacer público
gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME}

# Configurar CORS
cat > /tmp/cors.json << EOF
[
  {
    "origin": ["https://${APP_DOMAIN}"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json gs://${BUCKET_NAME}
rm /tmp/cors.json

print_info "✅ Bucket configurado con CORS"

# =============================================================================
# 5. CREAR INSTANCIA DE MONGODB
# =============================================================================

print_message "🗄️  Creando instancia de MongoDB..."

# Crear script de startup para MongoDB
cat > /tmp/mongodb-startup.sh << 'STARTUP_SCRIPT'
#!/bin/bash
set -e

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# Configurar MongoDB
sed -i "s/bindIp: 127.0.0.1/bindIp: 0.0.0.0/" /etc/mongod.conf
echo "security:" >> /etc/mongod.conf
echo "  authorization: enabled" >> /etc/mongod.conf

# Iniciar MongoDB
systemctl start mongod
systemctl enable mongod

# Esperar a que MongoDB esté listo
sleep 10

# Crear usuario admin (se hará manualmente después)
echo "MongoDB instalado. Configura usuarios manualmente." > /tmp/mongodb-ready.txt
STARTUP_SCRIPT

# Crear instancia
if gcloud compute instances describe red-o-mongodb --zone=${ZONE} &> /dev/null; then
    print_warning "Instancia red-o-mongodb ya existe"
else
    gcloud compute instances create red-o-mongodb \
      --zone=${ZONE} \
      --machine-type=e2-micro \
      --boot-disk-size=30GB \
      --boot-disk-type=pd-standard \
      --image-family=ubuntu-2204-lts \
      --image-project=ubuntu-os-cloud \
      --tags=mongodb-server \
      --metadata-from-file=startup-script=/tmp/mongodb-startup.sh
    
    print_info "✅ Instancia de MongoDB creada"
    print_info "⏳ Esperando 60 segundos para que inicie..."
    sleep 60
fi

rm /tmp/mongodb-startup.sh

# Configurar firewall para MongoDB
if gcloud compute firewall-rules describe allow-mongodb &> /dev/null; then
    print_warning "Regla de firewall allow-mongodb ya existe"
else
    gcloud compute firewall-rules create allow-mongodb \
      --direction=INGRESS \
      --priority=1000 \
      --network=default \
      --action=ALLOW \
      --rules=tcp:27017 \
      --source-ranges=10.128.0.0/9 \
      --target-tags=mongodb-server
    
    print_info "✅ Firewall configurado"
fi

# =============================================================================
# 6. CONFIGURAR MONGODB Y DUCKDNS
# =============================================================================

print_message "🔧 Configurando MongoDB y DuckDNS..."

# Crear script de configuración de MongoDB
cat > /tmp/setup-mongodb.sh << EOF
#!/bin/bash
set -e

# Crear usuario admin
mongosh << 'MONGO_ADMIN'
use admin
db.createUser({
  user: "admin",
  pwd: "${MONGODB_ADMIN_PASSWORD}",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
MONGO_ADMIN

# Crear base de datos y usuario de aplicación
mongosh -u admin -p ${MONGODB_ADMIN_PASSWORD} --authenticationDatabase admin << 'MONGO_APP'
use red-o
db.createUser({
  user: "red-o-user",
  pwd: "${MONGODB_APP_PASSWORD}",
  roles: [ { role: "readWrite", db: "red-o" } ]
})
MONGO_APP

echo "MongoDB configurado correctamente"
EOF

# Copiar y ejecutar script
gcloud compute scp /tmp/setup-mongodb.sh red-o-mongodb:~ --zone=${ZONE}
gcloud compute ssh red-o-mongodb --zone=${ZONE} --command="bash ~/setup-mongodb.sh"

rm /tmp/setup-mongodb.sh

print_info "✅ MongoDB configurado"

# Configurar DuckDNS en MongoDB
cat > /tmp/setup-duckdns-db.sh << EOF
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
        echo url="https://www.duckdns.org/update?domains=${DB_DOMAIN_PREFIX}&token=${DUCKDNS_TOKEN}&ip=\$latest" | curl -k -o ~/duckdns/duck.log -K -
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
sudo ln -s ~/duckdns/duck_daemon.sh /etc/rc2.d/S10duckdns

echo "DuckDNS configurado"
EOF

gcloud compute scp /tmp/setup-duckdns-db.sh red-o-mongodb:~ --zone=${ZONE}
gcloud compute ssh red-o-mongodb --zone=${ZONE} --command="bash ~/setup-duckdns-db.sh"

rm /tmp/setup-duckdns-db.sh

print_info "✅ DuckDNS configurado en servidor MongoDB"
print_info "   Dominio: ${DB_DOMAIN}"

# =============================================================================
# 7. CREAR INSTANCIA DE APLICACIÓN
# =============================================================================

print_message "🌐 Creando instancia de aplicación..."

# Crear script de startup
cat > /tmp/app-startup.sh << 'APP_STARTUP'
#!/bin/bash
set -e

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Instalar Nginx
apt-get install -y nginx

# Instalar PM2
npm install -g pm2

# Crear usuario
useradd -m -s /bin/bash red-o

echo "Servidor de aplicación configurado"
APP_STARTUP

# Crear instancia
if gcloud compute instances describe red-o-app --zone=${ZONE} &> /dev/null; then
    print_warning "Instancia red-o-app ya existe"
else
    gcloud compute instances create red-o-app \
      --zone=${ZONE} \
      --machine-type=e2-micro \
      --boot-disk-size=30GB \
      --boot-disk-type=pd-standard \
      --image-family=ubuntu-2204-lts \
      --image-project=ubuntu-os-cloud \
      --tags=http-server,https-server \
      --metadata-from-file=startup-script=/tmp/app-startup.sh
    
    print_info "✅ Instancia de aplicación creada"
    print_info "⏳ Esperando 60 segundos para que inicie..."
    sleep 60
fi

rm /tmp/app-startup.sh

# Configurar firewall
if ! gcloud compute firewall-rules describe allow-http &> /dev/null; then
    gcloud compute firewall-rules create allow-http \
      --direction=INGRESS \
      --priority=1000 \
      --network=default \
      --action=ALLOW \
      --rules=tcp:80 \
      --source-ranges=0.0.0.0/0 \
      --target-tags=http-server
fi

if ! gcloud compute firewall-rules describe allow-https &> /dev/null; then
    gcloud compute firewall-rules create allow-https \
      --direction=INGRESS \
      --priority=1000 \
      --network=default \
      --action=ALLOW \
      --rules=tcp:443 \
      --source-ranges=0.0.0.0/0 \
      --target-tags=https-server
fi

print_info "✅ Firewall HTTP/HTTPS configurado"

# =============================================================================
# 8. MOSTRAR RESUMEN
# =============================================================================

print_message "✅ Deployment de infraestructura completado!"

echo ""
echo "============================================="
echo "📊 RESUMEN DEL DEPLOYMENT"
echo "============================================="
echo ""
echo "🗄️  Servidor MongoDB:"
echo "   Instancia: red-o-mongodb"
echo "   Dominio: ${DB_DOMAIN}"
echo "   Usuario admin: admin"
echo "   Usuario app: red-o-user"
echo ""
echo "🌐 Servidor Aplicación:"
echo "   Instancia: red-o-app"
echo "   Dominio: ${APP_DOMAIN}"
echo ""
echo "📦 Cloud Storage:"
echo "   Bucket: gs://${BUCKET_NAME}"
echo ""
echo "============================================="
echo "📋 PRÓXIMOS PASOS"
echo "============================================="
echo ""
echo "1. Configurar DuckDNS en servidor de aplicación:"
echo "   ./scripts/deployment/deploy-compute-engine-app.sh"
echo ""
echo "2. Instalar certificados SSL:"
echo "   ./scripts/deployment/setup-ssl.sh"
echo ""
echo "3. Deployar la aplicación:"
echo "   ./scripts/deployment/update-app-compute-engine.sh"
echo ""
print_info "🎉 ¡Infraestructura lista!"

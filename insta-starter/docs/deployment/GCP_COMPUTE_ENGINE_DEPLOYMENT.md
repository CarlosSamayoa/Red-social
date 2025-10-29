# Deployment en Google Compute Engine con DuckDNS

## 🏗️ Arquitectura del Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐         ┌───────────────────┐        │
│  │   Compute Engine  │         │  Compute Engine   │        │
│  │   (Backend/Front) │         │    (MongoDB)      │        │
│  │                   │         │                   │        │
│  │  • Node.js API    │◄────────┤  • MongoDB 7.0    │        │
│  │  • React App      │         │  • 30GB Storage   │        │
│  │  • Nginx          │         │  • Auth enabled   │        │
│  │  • Port 80/443    │         │  • Port 27017     │        │
│  │                   │         │                   │        │
│  │  DuckDNS:         │         │  DuckDNS:         │        │
│  │  app.duckdns.org  │         │  db.duckdns.org   │        │
│  └───────────────────┘         └───────────────────┘        │
│           │                             │                    │
│           │                             │                    │
│           ▼                             ▼                    │
│  ┌────────────────────────────────────────────────┐         │
│  │         Cloud Storage (Multimedia)             │         │
│  │  • Imágenes y videos                           │         │
│  │  • Acceso público con URLs                     │         │
│  │  • CORS configurado                            │         │
│  └────────────────────────────────────────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
              DuckDNS (DNS Dinámico)
         • app.duckdns.org → IP del servidor
         • db.duckdns.org → IP de MongoDB
         • Auto-actualización cada 5 min
```

## 📋 Componentes

### 1. **Compute Engine - Backend/Frontend**
- Sistema: Ubuntu 22.04 LTS
- Instancia: e2-micro (2 vCPUs, 1GB RAM) - **GRATIS** en free tier
- Servicios:
  - Nginx (reverse proxy)
  - Node.js 18+ (backend API)
  - React build estático (frontend)
  - DuckDNS daemon (actualización de DNS)

### 2. **Compute Engine - MongoDB**
- Sistema: Ubuntu 22.04 LTS
- Instancia: e2-micro (2 vCPUs, 1GB RAM) - **GRATIS** en free tier
- Servicios:
  - MongoDB 7.0
  - 30GB persistent disk
  - DuckDNS daemon

### 3. **Cloud Storage**
- Bucket para multimedia
- Acceso público configurado
- CORS habilitado

### 4. **DuckDNS**
- DNS dinámico gratuito
- Subdominios:
  - `TU-APP.duckdns.org` → Servidor app
  - `TU-DB.duckdns.org` → Servidor DB

---

## 🚀 Parte 1: Configuración Inicial

### 1.1 Crear cuenta en DuckDNS

1. Ve a [DuckDNS.org](https://www.duckdns.org/)
2. Inicia sesión con Google/GitHub
3. Copia tu **Token** (lo necesitarás después)
4. Crea 2 subdominios:
   - `red-o-app` (para el servidor de aplicación)
   - `red-o-db` (para MongoDB)

**Guarda estos datos:**
```bash
DUCKDNS_TOKEN=tu-token-aqui
APP_DOMAIN=red-o-app.duckdns.org
DB_DOMAIN=red-o-db.duckdns.org
```

### 1.2 Configurar Google Cloud

```bash
# Instalar Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# Autenticarse
gcloud auth login

# Configurar proyecto
gcloud config set project TU_PROJECT_ID

# Configurar región y zona
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

### 1.3 Habilitar APIs necesarias

```bash
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
```

---

## 🗄️ Parte 2: Servidor MongoDB

### 2.1 Crear instancia de MongoDB

```bash
# Crear instancia e2-micro (FREE TIER)
gcloud compute instances create red-o-mongodb \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=mongodb-server \
  --metadata=startup-script='#!/bin/bash
    # Actualizar sistema
    apt-get update
    apt-get upgrade -y
    
    # Instalar MongoDB
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update
    apt-get install -y mongodb-org
    
    # Configurar MongoDB para permitir conexiones remotas
    sed -i "s/bindIp: 127.0.0.1/bindIp: 0.0.0.0/" /etc/mongod.conf
    
    # Habilitar autenticación
    echo "security:" >> /etc/mongod.conf
    echo "  authorization: enabled" >> /etc/mongod.conf
    
    # Iniciar MongoDB
    systemctl start mongod
    systemctl enable mongod
  '

# Esperar a que la instancia inicie
sleep 60
```

### 2.2 Configurar reglas de firewall para MongoDB

```bash
# Permitir conexiones a MongoDB desde la red interna
gcloud compute firewall-rules create allow-mongodb \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-ranges=10.128.0.0/9 \
  --target-tags=mongodb-server
```

### 2.3 Configurar MongoDB y crear usuario

```bash
# Conectarse a la instancia
gcloud compute ssh red-o-mongodb --zone=us-central1-a

# Crear usuario admin de MongoDB
mongosh <<EOF
use admin
db.createUser({
  user: "admin",
  pwd: "TU_PASSWORD_SEGURO_AQUI",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
EOF

# Crear base de datos y usuario de aplicación
mongosh -u admin -p TU_PASSWORD_SEGURO_AQUI --authenticationDatabase admin <<EOF
use red-o
db.createUser({
  user: "red-o-user",
  pwd: "TU_PASSWORD_APP_AQUI",
  roles: [ { role: "readWrite", db: "red-o" } ]
})
EOF

# Verificar que MongoDB esté corriendo
sudo systemctl status mongod
```

### 2.4 Configurar DuckDNS en servidor MongoDB

```bash
# Crear directorio para DuckDNS
mkdir -p ~/duckdns
cd ~/duckdns

# Crear script de actualización
cat > duck.sh << 'SCRIPT'
#!/bin/bash
current=""
while true; do
    # Obtener IP pública actual
    latest=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
    echo "public-ip=$latest"
    
    if [ "$current" == "$latest" ]; then
        echo "IP no ha cambiado"
    else
        echo "IP ha cambiado - actualizando DuckDNS"
        current=$latest
        echo url="https://www.duckdns.org/update?domains=red-o-db&token=TU_TOKEN_AQUI&ip=$latest" | curl -k -o ~/duckdns/duck.log -K -
    fi
    sleep 5m
done
SCRIPT

# Reemplazar con tu token real
sed -i 's/TU_TOKEN_AQUI/tu-token-duckdns-real/' duck.sh

# Hacer ejecutable
chmod 700 duck.sh

# Crear daemon script
cat > duck_daemon.sh << 'DAEMON'
#!/bin/bash
nohup ~/duckdns/duck.sh > ~/duckdns/duck.log 2>&1&
DAEMON

chmod +x duck_daemon.sh
sudo chown root duck_daemon.sh
sudo chmod 744 duck_daemon.sh

# Probar el script
sudo ./duck_daemon.sh

# Verificar que está corriendo
ps -ef | grep duck

# Ver el log
cat duck.log

# Hacer que se inicie automáticamente
sudo ln -s ~/duckdns/duck_daemon.sh /etc/rc2.d/S10duckdns

# Salir de la instancia
exit
```

### 2.5 Verificar DuckDNS

```bash
# Desde tu máquina local, verificar que el DNS funciona
nslookup red-o-db.duckdns.org

# Debería mostrar la IP pública de tu instancia MongoDB
```

---

## 🌐 Parte 3: Servidor Backend/Frontend

### 3.1 Crear instancia de aplicación

```bash
# Crear instancia e2-micro (FREE TIER)
gcloud compute instances create red-o-app \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server \
  --metadata=startup-script='#!/bin/bash
    # Actualizar sistema
    apt-get update
    apt-get upgrade -y
    
    # Instalar Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Instalar Nginx
    apt-get install -y nginx
    
    # Instalar PM2 para gestión de procesos
    npm install -g pm2
    
    # Crear usuario para la aplicación
    useradd -m -s /bin/bash red-o
  '

# Esperar a que la instancia inicie
sleep 60
```

### 3.2 Configurar reglas de firewall

```bash
# Permitir tráfico HTTP (puerto 80)
gcloud compute firewall-rules create allow-http \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server

# Permitir tráfico HTTPS (puerto 443)
gcloud compute firewall-rules create allow-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=https-server
```

### 3.3 Configurar DuckDNS en servidor de aplicación

```bash
# Conectarse a la instancia
gcloud compute ssh red-o-app --zone=us-central1-a

# Crear directorio para DuckDNS
mkdir -p ~/duckdns
cd ~/duckdns

# Crear script de actualización (igual que MongoDB pero con dominio diferente)
cat > duck.sh << 'SCRIPT'
#!/bin/bash
current=""
while true; do
    latest=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
    echo "public-ip=$latest"
    
    if [ "$current" == "$latest" ]; then
        echo "IP no ha cambiado"
    else
        echo "IP ha cambiado - actualizando DuckDNS"
        current=$latest
        echo url="https://www.duckdns.org/update?domains=red-o-app&token=TU_TOKEN_AQUI&ip=$latest" | curl -k -o ~/duckdns/duck.log -K -
    fi
    sleep 5m
done
SCRIPT

# Reemplazar con tu token real
sed -i 's/TU_TOKEN_AQUI/tu-token-duckdns-real/' duck.sh

chmod 700 duck.sh

# Crear daemon
cat > duck_daemon.sh << 'DAEMON'
#!/bin/bash
nohup ~/duckdns/duck.sh > ~/duckdns/duck.log 2>&1&
DAEMON

chmod +x duck_daemon.sh
sudo chown root duck_daemon.sh
sudo chmod 744 duck_daemon.sh

# Iniciar daemon
sudo ./duck_daemon.sh

# Auto-inicio en boot
sudo ln -s ~/duckdns/duck_daemon.sh /etc/rc2.d/S10duckdns
```

### 3.4 Configurar Nginx

```bash
# Crear configuración de Nginx
sudo tee /etc/nginx/sites-available/red-o << 'NGINX'
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name red-o-app.duckdns.org;
    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name red-o-app.duckdns.org;

    # Certificados SSL (configuraremos después con Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/red-o-app.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/red-o-app.duckdns.org/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/red-o-access.log;
    error_log /var/log/nginx/red-o-error.log;

    # Frontend - Servir archivos estáticos de React
    location / {
        root /var/www/red-o/frontend;
        try_files $uri $uri/ /index.html;
        
        # Headers de caché
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Backend API - Proxy a Node.js
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        
        # Headers necesarios
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # No cachear API
        proxy_cache_bypass $http_upgrade;
    }

    # Límite de tamaño de uploads
    client_max_body_size 10M;

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX

# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/red-o /etc/nginx/sites-enabled/

# Eliminar sitio default
sudo rm /etc/nginx/sites-enabled/default

# Crear directorio para la aplicación
sudo mkdir -p /var/www/red-o/frontend
sudo chown -R red-o:red-o /var/www/red-o

# Probar configuración (fallará por los certificados SSL, es normal)
sudo nginx -t
```

---

## 🔐 Parte 4: Certificados SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtener certificado SSL (primero deshabilitar SSL en nginx temporalmente)
sudo sed -i 's/listen 443/# listen 443/' /etc/nginx/sites-available/red-o
sudo sed -i 's/ssl_certificate/# ssl_certificate/' /etc/nginx/sites-available/red-o
sudo nginx -t
sudo systemctl reload nginx

# Obtener certificado
sudo certbot certonly --nginx -d red-o-app.duckdns.org

# Restaurar configuración SSL
sudo sed -i 's/# listen 443/listen 443/' /etc/nginx/sites-available/red-o
sudo sed -i 's/# ssl_certificate/ssl_certificate/' /etc/nginx/sites-available/red-o

# Probar y recargar nginx
sudo nginx -t
sudo systemctl reload nginx

# Auto-renovación (se configura automáticamente)
sudo certbot renew --dry-run
```

---

## 📦 Parte 5: Cloud Storage para Multimedia

### 5.1 Crear bucket

```bash
# Desde tu máquina local
gsutil mb -l us-central1 gs://red-o-images/

# Hacer el bucket público
gsutil iam ch allUsers:objectViewer gs://red-o-images

# Configurar CORS
cat > cors.json << 'CORS'
[
  {
    "origin": ["https://red-o-app.duckdns.org"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
CORS

gsutil cors set cors.json gs://red-o-images
```

---

## 🚢 Parte 6: Deployment de la Aplicación

### 6.1 Preparar el código localmente

```bash
# En tu máquina local
cd Red-social/insta-starter

# Configurar variables de entorno del backend
cat > backend/.env << 'ENV'
NODE_ENV=production
PORT=8080

# MongoDB
MONGODB_URI=mongodb://red-o-user:TU_PASSWORD_APP_AQUI@red-o-db.duckdns.org:27017/red-o?authSource=red-o

# JWT
JWT_SECRET=tu-jwt-secret-super-seguro-genera-uno-nuevo

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# reCAPTCHA
RECAPTCHA_SECRET_KEY=tu-recaptcha-secret-key

# Google Cloud Storage
GCS_BUCKET_NAME=red-o-images
GCS_PROJECT_ID=tu-project-id
USE_GCS=true

# Session
SESSION_SECRET=otro-secret-super-seguro-genera-uno-nuevo
ENV

# Configurar variables de entorno del frontend
cat > frontend/.env.production << 'ENV'
VITE_API_URL=https://red-o-app.duckdns.org/api
VITE_GCS_IMAGES_URL=https://storage.googleapis.com/red-o-images
VITE_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
VITE_RECAPTCHA_SITE_KEY=tu-recaptcha-site-key
ENV

# Instalar dependencias del backend
cd backend
npm install --production

# Build del frontend
cd ../frontend
npm install
npm run build
```

### 6.2 Subir código al servidor

```bash
# Comprimir backend
cd backend
tar -czf backend.tar.gz . --exclude=node_modules --exclude=storage

# Comprimir frontend build
cd ../frontend
tar -czf frontend.tar.gz dist/

# Copiar al servidor
gcloud compute scp backend/backend.tar.gz red-o-app:~ --zone=us-central1-a
gcloud compute scp frontend/frontend.tar.gz red-o-app:~ --zone=us-central1-a
```

### 6.3 Instalar en el servidor

```bash
# Conectarse al servidor
gcloud compute ssh red-o-app --zone=us-central1-a

# Crear directorio para backend
sudo mkdir -p /opt/red-o-backend
sudo chown red-o:red-o /opt/red-o-backend

# Descomprimir backend
sudo -u red-o tar -xzf ~/backend.tar.gz -C /opt/red-o-backend

# Instalar dependencias
cd /opt/red-o-backend
sudo -u red-o npm install --production

# Configurar PM2 para el backend
sudo -u red-o pm2 start server.js --name red-o-api
sudo -u red-o pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u red-o --hp /home/red-o

# Descomprimir frontend
sudo tar -xzf ~/frontend.tar.gz -C /var/www/red-o/
sudo mv /var/www/red-o/dist/* /var/www/red-o/frontend/
sudo chown -R red-o:red-o /var/www/red-o

# Verificar que todo esté corriendo
pm2 status
sudo systemctl status nginx

# Ver logs del backend
pm2 logs red-o-api
```

---

## ✅ Parte 7: Verificación

### 7.1 Verificar servicios

```bash
# En el servidor de aplicación
# Verificar Nginx
sudo systemctl status nginx

# Verificar backend
pm2 status
pm2 logs red-o-api --lines 50

# Verificar DuckDNS
cat ~/duckdns/duck.log
ps -ef | grep duck

# Verificar conectividad a MongoDB
cd /opt/red-o-backend
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB conectado!')).catch(err => console.error('Error:', err));"
```

### 7.2 Pruebas desde navegador

1. **Verificar frontend**: `https://red-o-app.duckdns.org`
2. **Verificar API**: `https://red-o-app.duckdns.org/api/health`
3. **Probar registro/login**
4. **Probar upload de imagen**

---

## 🔄 Parte 8: Scripts de Actualización

Voy a crear scripts automatizados en la carpeta `scripts/deployment/` para facilitar las actualizaciones.

---

## 🐛 Troubleshooting

### Error: "Cannot connect to MongoDB"
```bash
# Verificar que MongoDB está corriendo
gcloud compute ssh red-o-mongodb --zone=us-central1-a
sudo systemctl status mongod

# Ver logs
sudo journalctl -u mongod -n 50

# Verificar conectividad desde servidor app
gcloud compute ssh red-o-app --zone=us-central1-a
nc -zv red-o-db.duckdns.org 27017
```

### Error: "502 Bad Gateway"
```bash
# Verificar que el backend está corriendo
pm2 status
pm2 restart red-o-api

# Ver logs de Nginx
sudo tail -f /var/log/nginx/red-o-error.log
```

### Error: "DuckDNS no actualiza"
```bash
# Ver logs
cat ~/duckdns/duck.log

# Verificar que el daemon está corriendo
ps -ef | grep duck

# Reiniciar daemon
pkill duck
sudo /etc/rc2.d/S10duckdns
```

---

## 💰 Costos

Con esta arquitectura usando **free tier de GCP**:

- **2x e2-micro instances**: $0/mes (siempre gratis)
- **30GB persistent disk x2**: $0/mes (primeros 30GB gratis)
- **Cloud Storage**: $0/mes (primeros 5GB gratis)
- **Network egress**: ~$0-1/mes (primeros 1GB gratis)
- **DuckDNS**: $0/mes (gratis)

**Total estimado**: **$0-1/mes** 🎉

---

## 📚 Próximos Pasos

1. ✅ [Guía de actualización automática](GCP_COMPUTE_ENGINE_UPDATE.md)
2. ✅ [Monitoreo y logs](GCP_MONITORING.md)
3. ✅ [Backups automáticos de MongoDB](GCP_BACKUPS.md)
4. ✅ [Optimización de performance](GCP_OPTIMIZATION.md)

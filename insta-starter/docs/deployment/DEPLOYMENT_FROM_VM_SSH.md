# 🚀 Deployment desde SSH de la VM de GCP

> **Flujo de trabajo**: Trabajar directamente desde la consola SSH de Google Cloud Platform  
> **Ventajas**: No necesitas gcloud CLI local, todo se hace desde la VM  
> **Tiempo total**: ~30 minutos

---

## 📋 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   VM MongoDB         │      │   VM Aplicación      │    │
│  │   (e2-micro)         │      │   (e2-micro)         │    │
│  ├──────────────────────┤      ├──────────────────────┤    │
│  │ - MongoDB 7.0        │◄────►│ - Node.js 18        │    │
│  │ - DuckDNS daemon     │      │ - Nginx             │    │
│  │ - Puerto 27017       │      │ - PM2               │    │
│  │                      │      │ - DuckDNS daemon    │    │
│  │ mi-db.duckdns.org    │      │ - Backend + Frontend│    │
│  └──────────────────────┘      │                      │    │
│           ▲                     │ mi-app.duckdns.org  │    │
│           │                     └──────────────────────┘    │
│           │                              ▲                  │
│           │                              │                  │
│  ┌────────┴──────────────────────────────┴──────────┐      │
│  │           Cloud Storage Bucket                    │      │
│  │           (Multimedia)                           │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
         │         DuckDNS              │
         └──────────────────────────────┘
           (Auto-actualiza IPs cada 5 min)
```

---

## 🎯 Estrategia de Deployment

### Opción A: Setup Completo Automatizado
Crear VMs desde la consola de GCP y ejecutar scripts de configuración.

### Opción B: Setup Manual Paso a Paso
Configurar cada componente manualmente desde SSH (más control).

---

## 🚀 Opción A: Setup Automatizado

### Paso 1: Crear VMs desde Console de GCP

1. **Ir a Google Cloud Console**: https://console.cloud.google.com
2. **Compute Engine** → **Instancias de VM** → **Crear instancia**

#### VM para MongoDB:
- **Nombre**: `red-o-mongodb`
- **Región**: `us-central1-a`
- **Tipo de máquina**: `e2-micro` (2 vCPU, 1 GB)
- **Disco de arranque**: Ubuntu 22.04 LTS, 30 GB
- **Firewall**: ✅ Permitir tráfico HTTP y HTTPS
- **Etiquetas de red**: `mongodb-server`

#### VM para Aplicación:
- **Nombre**: `red-o-app`
- **Región**: `us-central1-a`
- **Tipo de máquina**: `e2-micro` (2 vCPU, 1 GB)
- **Disco de arranque**: Ubuntu 22.04 LTS, 30 GB
- **Firewall**: ✅ Permitir tráfico HTTP y HTTPS
- **Etiquetas de red**: `web-server`

### Paso 2: Crear reglas de firewall

```bash
# Desde Cloud Shell o tu terminal local con gcloud
gcloud compute firewall-rules create allow-mongodb \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=mongodb-server

gcloud compute firewall-rules create allow-http-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=web-server
```

### Paso 3: Conectarse por SSH a VM MongoDB

Desde la **Console de GCP**, haz clic en **SSH** junto a `red-o-mongodb`.

Ejecuta el setup automatizado:

```bash
# Descargar script de configuración
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-mongodb-vm.sh

# Dar permisos
chmod +x setup-mongodb-vm.sh

# Ejecutar (pedirá: DuckDNS token, subdomain, contraseñas)
./setup-mongodb-vm.sh
```

### Paso 4: Conectarse por SSH a VM Aplicación

Desde la **Console de GCP**, haz clic en **SSH** junto a `red-o-app`.

Ejecuta el setup automatizado:

```bash
# Descargar script de configuración
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-app-vm.sh

# Dar permisos
chmod +x setup-app-vm.sh

# Ejecutar (pedirá todas las credenciales)
./setup-app-vm.sh
```

### Paso 5: Configurar SSL

Desde SSH de `red-o-app`:

```bash
# Descargar script SSL
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-ssl-vm.sh

chmod +x setup-ssl-vm.sh
./setup-ssl-vm.sh
```

---

## 🛠️ Opción B: Setup Manual Paso a Paso

### Parte 1: Configurar VM MongoDB

#### 1.1 Conectarse a VM MongoDB
```bash
# Desde GCP Console → Compute Engine → SSH en red-o-mongodb
```

#### 1.2 Instalar MongoDB 7.0
```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Importar clave GPG de MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Agregar repositorio
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar y habilitar
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 1.3 Configurar MongoDB para acceso remoto
```bash
# Editar configuración
sudo nano /etc/mongod.conf

# Cambiar bindIp de 127.0.0.1 a 0.0.0.0
# net:
#   port: 27017
#   bindIp: 0.0.0.0

# Reiniciar
sudo systemctl restart mongod
```

#### 1.4 Crear usuarios de MongoDB
```bash
# Conectar a MongoDB
mongosh

# Crear admin
use admin
db.createUser({
  user: "admin",
  pwd: "TU_PASSWORD_ADMIN",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

# Crear usuario de aplicación
use red_o_db
db.createUser({
  user: "red_o_user",
  pwd: "TU_PASSWORD_APP",
  roles: [ { role: "readWrite", db: "red_o_db" } ]
})

exit
```

#### 1.5 Habilitar autenticación
```bash
sudo nano /etc/mongod.conf

# Agregar:
# security:
#   authorization: enabled

sudo systemctl restart mongod
```

#### 1.6 Configurar DuckDNS
```bash
# Crear directorio
mkdir ~/duckdns
cd ~/duckdns

# Crear script de actualización
nano duck.sh
```

Contenido de `duck.sh`:
```bash
#!/bin/bash

# Obtener IP pública de GCP
PUBLIC_IP=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

# Actualizar DuckDNS
echo url="https://www.duckdns.org/update?domains=TU_SUBDOMINIO_DB&token=TU_TOKEN&ip=$PUBLIC_IP" | curl -k -o ~/duckdns/duck.log -K -

# Log
echo "$(date): Updated DuckDNS with IP $PUBLIC_IP" >> ~/duckdns/update.log
```

```bash
# Dar permisos
chmod +x duck.sh

# Probar
./duck.sh
cat duck.log  # Debe decir "OK"

# Agregar a crontab (cada 5 minutos)
crontab -e

# Agregar línea:
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

---

### Parte 2: Configurar VM Aplicación

#### 2.1 Conectarse a VM Aplicación
```bash
# Desde GCP Console → Compute Engine → SSH en red-o-app
```

#### 2.2 Instalar Node.js 18
```bash
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version  # v18.x.x
npm --version   # 9.x.x
```

#### 2.3 Instalar Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2.4 Instalar PM2
```bash
sudo npm install -g pm2
```

#### 2.5 Configurar DuckDNS (igual que MongoDB)
```bash
mkdir ~/duckdns
cd ~/duckdns
nano duck.sh
```

Mismo contenido que antes, pero con **TU_SUBDOMINIO_APP**.

```bash
chmod +x duck.sh
./duck.sh
crontab -e
# */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

#### 2.6 Clonar repositorio
```bash
cd ~
git clone https://github.com/TU_USUARIO/Red-social.git
cd Red-social/insta-starter
```

#### 2.7 Configurar Backend
```bash
cd backend

# Crear .env
nano .env
```

Contenido de `.env`:
```env
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb://red_o_user:TU_PASSWORD_APP@TU_SUBDOMINIO_DB.duckdns.org:27017/red_o_db?authSource=red_o_db

# JWT
JWT_SECRET=TU_JWT_SECRET_SUPER_SEGURO

# Google OAuth
GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://TU_SUBDOMINIO_APP.duckdns.org/api/auth/google/callback

# reCAPTCHA
RECAPTCHA_SECRET_KEY=TU_RECAPTCHA_SECRET

# Cloud Storage
GCP_PROJECT_ID=TU_PROJECT_ID
GCP_BUCKET_NAME=red-o-multimedia
STORAGE_TYPE=gcs

# CORS
FRONTEND_URL=https://TU_SUBDOMINIO_APP.duckdns.org
```

```bash
# Instalar dependencias
npm install

# Iniciar con PM2
pm2 start server.js --name red-o-api
pm2 save
pm2 startup
```

#### 2.8 Configurar Frontend
```bash
cd ~/Red-social/insta-starter/frontend

# Crear .env
nano .env
```

Contenido de `.env`:
```env
VITE_API_URL=https://TU_SUBDOMINIO_APP.duckdns.org/api
VITE_GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID
VITE_RECAPTCHA_SITE_KEY=TU_RECAPTCHA_SITE_KEY
```

```bash
# Instalar dependencias y build
npm install
npm run build

# Copiar a Nginx
sudo mkdir -p /var/www/red-o
sudo cp -r dist/* /var/www/red-o/
sudo chown -R www-data:www-data /var/www/red-o
```

#### 2.9 Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/red-o
```

Contenido:
```nginx
server {
    listen 80;
    server_name TU_SUBDOMINIO_APP.duckdns.org;

    # Frontend
    location / {
        root /var/www/red-o;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/red-o /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Probar y reiniciar
sudo nginx -t
sudo systemctl restart nginx
```

#### 2.10 Configurar SSL con Let's Encrypt
```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d TU_SUBDOMINIO_APP.duckdns.org

# Seguir instrucciones interactivas
# Elige: Redirect HTTP to HTTPS (opción 2)

# Verificar auto-renovación
sudo certbot renew --dry-run
```

---

## 📊 Verificación

### Verificar MongoDB (desde VM MongoDB)
```bash
# Conectar con autenticación
mongosh -u red_o_user -p TU_PASSWORD_APP --authenticationDatabase red_o_db

# Ver bases de datos
show dbs

# Salir
exit
```

### Verificar Backend (desde VM App)
```bash
pm2 status
pm2 logs red-o-api --lines 20
```

### Verificar Nginx (desde VM App)
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
```

### Verificar DuckDNS (desde cualquier VM)
```bash
cat ~/duckdns/duck.log    # Debe decir "OK"
cat ~/duckdns/update.log  # Ver historial de actualizaciones
```

### Verificar SSL
```bash
sudo certbot certificates
```

### Verificar aplicación (desde navegador)
1. **Frontend**: `https://TU_SUBDOMINIO_APP.duckdns.org`
2. **API Health**: `https://TU_SUBDOMINIO_APP.duckdns.org/api/health`
3. **Crear cuenta y probar**

---

## 🔄 Actualizaciones de Código

### Actualizar Backend
```bash
# SSH a VM App
cd ~/Red-social/insta-starter/backend
git pull origin main
npm install
pm2 restart red-o-api
pm2 logs red-o-api
```

### Actualizar Frontend
```bash
# SSH a VM App
cd ~/Red-social/insta-starter/frontend
git pull origin main
npm install
npm run build
sudo rm -rf /var/www/red-o/*
sudo cp -r dist/* /var/www/red-o/
sudo systemctl reload nginx
```

---

## 📝 Crear Cloud Storage Bucket

```bash
# Desde Cloud Shell o terminal local
gsutil mb -p TU_PROJECT_ID -c STANDARD -l us-central1 gs://red-o-multimedia

# Configurar CORS
echo '[
  {
    "origin": ["https://TU_SUBDOMINIO_APP.duckdns.org"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]' > cors.json

gsutil cors set cors.json gs://red-o-multimedia

# Hacer público
gsutil iam ch allUsers:objectViewer gs://red-o-multimedia
```

---

## 🎯 Checklist de Setup Completo

### VM MongoDB
- [ ] MongoDB 7.0 instalado y corriendo
- [ ] Configurado para acceso remoto (bindIp: 0.0.0.0)
- [ ] Usuarios creados (admin + app user)
- [ ] Autenticación habilitada
- [ ] DuckDNS configurado y funcionando
- [ ] Firewall permite puerto 27017

### VM Aplicación
- [ ] Node.js 18 instalado
- [ ] Nginx instalado y corriendo
- [ ] PM2 instalado
- [ ] Repositorio clonado
- [ ] Backend configurado (.env)
- [ ] Backend corriendo con PM2
- [ ] Frontend buildeado y en /var/www/red-o
- [ ] Nginx configurado con proxy
- [ ] DuckDNS configurado y funcionando
- [ ] SSL configurado con Let's Encrypt
- [ ] Auto-renovación de SSL habilitada

### Cloud Storage
- [ ] Bucket creado
- [ ] CORS configurado
- [ ] Acceso público configurado

### Aplicación
- [ ] Frontend accesible por HTTPS
- [ ] API responde en /api
- [ ] Registro de usuarios funciona
- [ ] Login funciona
- [ ] Upload de imágenes funciona

---

## 💰 Costos Estimados

| Recurso | Costo/mes |
|---------|-----------|
| 2x e2-micro (free tier) | $0 |
| 60GB Persistent disk | $0 (primeros 30GB gratis) |
| Cloud Storage < 5GB | $0 |
| DuckDNS | $0 |
| Let's Encrypt SSL | $0 |
| **Total** | **$0-1/mes** |

---

## 🐛 Troubleshooting

### Error: "Connection refused" desde backend a MongoDB
```bash
# Desde VM App, verificar conectividad
nc -zv TU_SUBDOMINIO_DB.duckdns.org 27017

# Si falla, verificar:
# 1. MongoDB está corriendo (VM MongoDB)
sudo systemctl status mongod

# 2. Firewall permite tráfico
gcloud compute firewall-rules list --filter="targetTags:mongodb-server"
```

### Error: "502 Bad Gateway" en Nginx
```bash
# Verificar backend
pm2 status
pm2 logs red-o-api

# Reiniciar si es necesario
pm2 restart red-o-api
```

### DuckDNS no actualiza
```bash
# Ver logs
cat ~/duckdns/duck.log
cat ~/duckdns/update.log

# Ejecutar manualmente
cd ~/duckdns
./duck.sh

# Verificar crontab
crontab -l
```

---

## 📚 Próximos Pasos

1. **Backups automáticos de MongoDB**
2. **Monitoreo con Cloud Logging**
3. **Alertas de uptime**
4. **Optimización de Nginx**

---

**¡Listo para deployar desde SSH! 🚀**

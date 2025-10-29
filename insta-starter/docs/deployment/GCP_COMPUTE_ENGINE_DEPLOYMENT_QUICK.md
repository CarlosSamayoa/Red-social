<!--
Guía rápida: desplegar la app según el diagrama (Compute Engine - App + MongoDB, Cloud Storage para multimedia, DuckDNS, SSL)
Objetivo: todo desde Google Cloud Console (UI) y accediendo a las VMs vía SSH (SSH en navegador).
-->
# Deploy rápido en Google Compute Engine (UI + SSH)

Resumen
------
Esta guía compacta explica cómo desplegar la arquitectura mostrada en el diagrama:

- Una VM `red-o-app` (Ubuntu 22.04) que sirve el backend Node.js y el frontend (Nginx + PM2).
- Una VM `red-o-mongodb` (Ubuntu 22.04) que ejecuta MongoDB 7.0 con autenticación.
- Un bucket de Cloud Storage para multimedia (imágenes/videos) público con CORS.
- DuckDNS para DNS dinámico (app.duckdns.org y db.duckdns.org).
- Certbot / Let's Encrypt para HTTPS en la VM de aplicación.

Requisitos previos
------------------

- Cuenta de Google Cloud con billing habilitado.
- Proyecto GCP creado.
- DuckDNS token y los subdominios que usarás (por ejemplo `red-o-app` y `red-o-db`).
- Credenciales que tu app necesita: Google OAuth client id/secret, reCAPTCHA keys, JWT secret (puedes guardarlas en Secret Manager o en `.env` en la VM).
- Repositorio accesible (GitHub/URL) con el código del `backend` y `frontend` que usarás.

Nota: la guía está pensada para ejecutarse desde Google Cloud Console (https://console.cloud.google.com). Usaremos el botón "SSH" del detalle de cada VM para correr comandos en el navegador.

APIs a habilitar (por UI)
-------------------------

1. Ve a Navigation menu → APIs & Services → Library
2. Habilita estas APIs si aún no lo están:
   - Compute Engine API
   - Cloud Storage
   - Secret Manager (opcional)

Parte A — Crear buckets en Cloud Storage (UI)
-------------------------------------------

1. Console → Storage → Browser → Create bucket
   - Nombre: `PROJECT_ID-red-o-images` (recomendado)
   - Location: Regional (ej. `us-central1`)
   - Access: Uniform
2. Una vez creado, en el bucket → Edit → Permissions → Add → Grant the `allUsers` role `Storage Object Viewer` para servir objetos públicamente.
3. Configurar CORS (puede hacerlo desde UI en "Bucket details → Edit CORS" o usando `gsutil`):

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Parte B — Crear VM para MongoDB (UI)
-----------------------------------

1. Console → Compute Engine → VM instances → Create instance
   - Name: `red-o-mongodb`
   - Region / Zone: us-central1 / us-central1-a (o tu preferida)
   - Machine type: e2-micro (o f1-micro si quieres ahorrar)
   - Boot disk: Ubuntu 22.04 LTS, 30 GB
   - Network tags: `mongodb-server`
   - Firewall: no habilitar HTTP/HTTPS para esta VM (mantenerla cerrada)
2. (Opcional) Pegar un *startup script* que instale MongoDB 7 y configure `bindIp: 0.0.0.0` y `authorization: enabled`.

Si prefieres ejecutar manualmente (recomendado para control):

- Pulsa en la VM creada → SSH (Open in browser window) → copia/pega los comandos que siguen.

Dentro de la VM (SSH) — instalar MongoDB y crear usuarios

```bash
# Actualizar
sudo apt-get update && sudo apt-get upgrade -y

# Importar GPG y repositorio
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Permitir conexiones externas
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf

# Habilitar autenticación
if ! grep -q "security:" /etc/mongod.conf; then
  echo -e "\nsecurity:\n  authorization: enabled" | sudo tee -a /etc/mongod.conf
fi

sudo systemctl restart mongod
sudo systemctl enable mongod

# Crear usuarios (ejecutar en mongosh)
mongosh --eval "use admin; db.createUser({ user: 'admin', pwd: 'TU_PASSWORD_ADMIN', roles:[{role:'userAdminAnyDatabase', db:'admin'}, 'readWriteAnyDatabase'] })"
mongosh --eval "use red-o; db.createUser({ user: 'red-o-user', pwd: 'TU_PASSWORD_APP', roles:[{role:'readWrite', db:'red-o'}] })"
```

Guarda las credenciales y considera usar Secret Manager (UI: Secret Manager → Create Secret) para almacenar `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `RECAPTCHA_SECRET`.

Parte C — Crear VM para la aplicación (UI)
-----------------------------------------

1. Console → Compute Engine → VM instances → Create instance
   - Name: `red-o-app`
   - Machine type: e2-micro
   - Boot disk: Ubuntu 22.04 LTS
   - Network tags: `http-server`, `https-server`
   - Firewall: marca "Allow HTTP traffic" y "Allow HTTPS traffic"
   - (Opcional) Puedes pegar un *startup script* para instalar Node/Nginx/PM2 o hacerlo manualmente vía SSH.

2. Conecta por SSH (botón "SSH" justo en la fila de la VM) y ejecuta:

Instalación base en la VM (SSH)

```bash
# Actualizar
sudo apt-get update && sudo apt-get upgrade -y

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Nginx
sudo apt-get install -y nginx

# PM2
sudo npm install -g pm2

# Crear usuario app (opcional)
sudo useradd -m -s /bin/bash red-o || true
sudo mkdir -p /var/www/red-o
sudo chown -R red-o:red-o /var/www-red-o || true
```

Desplegar código (opción recomendada: clonar desde GitHub)

```bash
# Dentro de la VM, como usuario red-o
sudo -u red-o -i bash <<'BASH'
cd ~
git clone https://github.com/TU_USUARIO/TU_REPO.git red-o-src || (cd red-o-src && git pull)

# Backend
cd red-o-src/backend
npm install --production

# Frontend
cd ../frontend
npm install
npm run build
BASH
```

Instalar backend y frontend en rutas de producción

```bash
# Mover frontend
sudo rm -rf /var/www/red-o/frontend/* || true
sudo mv ~/red-o-src/frontend/dist/* /var/www/red-o/frontend/
sudo chown -R red-o:red-o /var/www/red-o

# Instalar backend en /opt
sudo mkdir -p /opt/red-o-backend
sudo tar -czf /tmp/backend.tgz -C ~/red-o-src/backend .
sudo tar -xzf /tmp/backend.tgz -C /opt/red-o-backend
sudo chown -R red-o:red-o /opt/red-o-backend
cd /opt/red-o-backend
sudo -u red-o npm install --production

# Iniciar con PM2
sudo -u red-o pm2 start server.js --name red-o-api
sudo -u red-o pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u red-o --hp /home-red-o || true
```

Configurar DuckDNS (en la VM) — script simple

```bash
mkdir -p ~/duckdns && cd ~/duckdns
cat > duck.sh <<'DUCK'
#!/bin/bash
TOKEN="TU_DUCKDNS_TOKEN"
DOMAIN="red-o-app"
current=""
while true; do
  latest=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
  if [ "$current" != "$latest" ]; then
    current=$latest
    echo url="https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=$latest" | curl -k -o ~/duckdns/duck.log -K -
  fi
  sleep 300
done
DUCK

chmod +x duck.sh
# Run in background
nohup ~/duckdns/duck.sh > ~/duckdns/duck.log 2>&1 &
# Add to crontab for persistence
(crontab -l 2>/dev/null; echo "@reboot nohup /home/$(whoami)/duckdns/duck.sh > /home/$(whoami)/duckdns/duck.log 2>&1 &") | crontab -
```

Configurar Nginx (archivo `/etc/nginx/sites-available/red-o`)

```nginx
server {
    listen 80;
    server_name red-o-app.duckdns.org;

    root /var/www/red-o/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 50M;
}
```

Luego:

```bash
sudo ln -sf /etc/nginx/sites-available/red-o /etc/nginx/sites-enabled/red-o
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Configurar SSL (Let's Encrypt) — desde SSH en la VM

```bash
# Instalar certbot
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Obtener certificado
sudo certbot --nginx -d red-o-app.duckdns.org

# Renovación automática (snap instala timer), verificar
sudo systemctl status snap.certbot.renew.service
```

Parte D — Conexión backend → MongoDB
------------------------------------

- Usar la IP interna o el DNS `red-o-db.duckdns.org` para conectar la app a la base de datos.
- En la VM de la app, en `/opt/red-o-backend/.env` o en Secret Manager, configura:

```env
MONGODB_URI=mongodb://red-o-user:TU_PASSWORD_APP@red-o-db.duckdns.org:27017/red-o?authSource=red-o
JWT_SECRET=... 
GCS_BUCKET=PROJECT_ID-red-o-images
USE_GCS=true
```

Parte E — Verificación final
----------------------------

1. DNS: desde tu máquina local `nslookup red-o-app.duckdns.org` debe devolver la IP pública de la VM `red-o-app`.
2. Navegador: abrir `https://red-o-app.duckdns.org` (si configuraste SSL) o `http://...` para pruebas.
3. Ver logs backend: SSH a `red-o-app` → `pm2 logs red-o-api`.
4. Ver logs nginx: `sudo tail -f /var/log/nginx/error.log`.
5. Ver estado MongoDB: SSH a `red-o-mongodb` → `sudo systemctl status mongod`.

Checklist de variables/secretos a tener listos
--------------------------------------------

- PROJECT_ID de GCP
- DuckDNS token y subdominios (`red-o-app`, `red-o-db`)
- Credenciales MongoDB (admin y app user)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (OAuth)
- RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY
- JWT_SECRET

Buenas prácticas y notas
------------------------

- Si prefieres no exponer `MONGODB` públicamente, configura reglas de firewall y usa IP interna entre VMs (recomendado: configurar la app y la DB en la misma VPC y usar la IP interna).
- Para producción, considera usar Cloud Run (para backend) o Managed MongoDB (Atlas) para alta disponibilidad.
- Guarda secretos sensibles en Secret Manager (UI) y proporciona permisos a la cuenta de servicio de Compute Engine.

Resumen final
-------------

Con estos pasos podrás desplegar la arquitectura del diagrama usando la consola de Google Cloud y las conexiones SSH en navegador. Si quieres, puedo convertir esto en un checklist imprimible o generar comandos automatizados que ejecutes desde Cloud Shell o local.

— Fin

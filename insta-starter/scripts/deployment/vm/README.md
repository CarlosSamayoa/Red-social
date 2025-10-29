# Scripts de Deployment para VMs (Ejecución desde SSH)

Scripts diseñados para ejecutarse **directamente desde la consola SSH** de las VMs de Google Cloud Platform.

## 📁 Scripts disponibles

### 1. `setup-mongodb-vm.sh`
**Ejecutar en**: VM de MongoDB  
**Tiempo**: ~8 minutos  
**Descripción**: Configura MongoDB 7.0 con autenticación y DuckDNS

**Instala y configura:**
- ✅ MongoDB 7.0
- ✅ Acceso remoto (bindIp: 0.0.0.0)
- ✅ Usuarios de MongoDB (admin + app)
- ✅ Autenticación habilitada
- ✅ DuckDNS daemon (actualización cada 5 min)
- ✅ Inicio automático de DuckDNS

**Uso:**
```bash
# Desde SSH de la VM MongoDB
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-mongodb-vm.sh
chmod +x setup-mongodb-vm.sh
./setup-mongodb-vm.sh
```

**Input requerido:**
- DuckDNS Token
- Subdominio DuckDNS (ej: `mi-db`)
- Contraseña para admin de MongoDB
- Contraseña para usuario de aplicación
- Nombre de usuario (default: `red_o_user`)
- Nombre de base de datos (default: `red_o_db`)

---

### 2. `setup-app-vm.sh`
**Ejecutar en**: VM de Aplicación  
**Tiempo**: ~12 minutos  
**Descripción**: Configura Node.js, Nginx, PM2 y deploya la aplicación

**Instala y configura:**
- ✅ Node.js 18
- ✅ Nginx
- ✅ PM2 (process manager)
- ✅ Backend (con PM2)
- ✅ Frontend (build y deploy)
- ✅ DuckDNS daemon
- ✅ Configuración de Nginx (HTTP)

**Uso:**
```bash
# Desde SSH de la VM de Aplicación
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-app-vm.sh
chmod +x setup-app-vm.sh
./setup-app-vm.sh
```

**Input requerido:**
- DuckDNS Token
- Subdominio DuckDNS para App (ej: `mi-app`)
- Subdominio DuckDNS de MongoDB (ej: `mi-db`)
- Usuario y contraseña de MongoDB
- GCP Project ID
- GCS Bucket Name
- JWT Secret
- Google OAuth credentials
- reCAPTCHA keys
- URL del repositorio Git

**Output:**
- Backend corriendo en PM2: `http://mi-app.duckdns.org/api`
- Frontend en Nginx: `http://mi-app.duckdns.org`

---

### 3. `setup-ssl-vm.sh`
**Ejecutar en**: VM de Aplicación  
**Tiempo**: ~3 minutos  
**Descripción**: Configura SSL/HTTPS con Let's Encrypt

**Requisito previo:** `setup-app-vm.sh` completado

**Instala y configura:**
- ✅ Certbot
- ✅ Certificado SSL de Let's Encrypt
- ✅ Nginx con HTTPS
- ✅ Redirección HTTP → HTTPS
- ✅ Headers de seguridad (HSTS, etc.)
- ✅ Auto-renovación de certificados

**Uso:**
```bash
# Desde SSH de la VM de Aplicación (DESPUÉS de setup-app-vm.sh)
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-ssl-vm.sh
chmod +x setup-ssl-vm.sh
./setup-ssl-vm.sh
```

**Input requerido:**
- Dominio (ej: `mi-app.duckdns.org`)
- Email para Let's Encrypt

**Output:**
- HTTPS habilitado: `https://mi-app.duckdns.org`
- HTTP redirige a HTTPS automáticamente
- Certificado válido por 90 días (auto-renovación)

---

## 🚀 Flujo de Deployment Completo

### Paso 0: Crear VMs en GCP Console

1. **Ir a**: https://console.cloud.google.com
2. **Compute Engine** → **Crear instancia**

#### VM MongoDB:
```
Nombre: red-o-mongodb
Región: us-central1-a
Tipo: e2-micro (2 vCPU, 1 GB)
SO: Ubuntu 22.04 LTS
Disco: 30 GB
Firewall: ✅ HTTP y HTTPS
Etiquetas: mongodb-server
```

#### VM Aplicación:
```
Nombre: red-o-app
Región: us-central1-a
Tipo: e2-micro (2 vCPU, 1 GB)
SO: Ubuntu 22.04 LTS
Disco: 30 GB
Firewall: ✅ HTTP y HTTPS
Etiquetas: web-server
```

3. **Crear reglas de firewall** (desde Cloud Shell):
```bash
# Permitir MongoDB
gcloud compute firewall-rules create allow-mongodb \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=mongodb-server
```

---

### Paso 1: Configurar VM MongoDB (8 min)

```bash
# Hacer SSH a red-o-mongodb desde GCP Console
# Click en "SSH" junto a la VM

# Descargar y ejecutar script
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-mongodb-vm.sh
chmod +x setup-mongodb-vm.sh
./setup-mongodb-vm.sh

# Seguir instrucciones interactivas
# Verificar al final que DuckDNS dice "OK"
```

---

### Paso 2: Configurar VM Aplicación (12 min)

```bash
# Hacer SSH a red-o-app desde GCP Console
# Click en "SSH" junto a la VM

# Descargar y ejecutar script
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-app-vm.sh
chmod +x setup-app-vm.sh
./setup-app-vm.sh

# Seguir instrucciones interactivas
# Verificar al final:
# - Backend: pm2 status
# - Frontend: http://mi-app.duckdns.org
```

---

### Paso 3: Configurar SSL (3 min)

```bash
# Desde SSH de red-o-app (misma sesión)

# Descargar y ejecutar script
wget https://raw.githubusercontent.com/TU_USUARIO/Red-social/main/scripts/deployment/vm/setup-ssl-vm.sh
chmod +x setup-ssl-vm.sh
./setup-ssl-vm.sh

# Ingresar dominio y email
# Verificar al final: https://mi-app.duckdns.org
```

---

## 🔍 Verificación

### En VM MongoDB:
```bash
# Ver estado MongoDB
sudo systemctl status mongod

# Conectar a MongoDB
mongosh -u red_o_user -p --authenticationDatabase red_o_db

# Ver DuckDNS log
cat ~/duckdns/duck.log
cat ~/duckdns/update.log

# Ver configuración guardada
cat ~/mongodb-config.txt
```

### En VM Aplicación:
```bash
# Ver backend
pm2 status
pm2 logs red-o-api --lines 50

# Ver Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/red-o-access.log

# Ver DuckDNS
cat ~/duckdns/duck.log

# Ver SSL
sudo certbot certificates

# Ver configuración guardada
cat ~/app-config.txt
cat ~/ssl-config.txt
```

### Desde navegador:
1. **Frontend**: https://mi-app.duckdns.org
2. **API Health**: https://mi-app.duckdns.org/api/health
3. **Registro**: Crear una cuenta
4. **Login**: Iniciar sesión
5. **Upload**: Subir una imagen

---

## 🔄 Actualizaciones

### Actualizar código de la aplicación:

```bash
# SSH a VM App
cd ~/Red-social/insta-starter

# Actualizar desde Git
git pull origin main

# Actualizar backend
cd backend
npm install
pm2 restart red-o-api
pm2 logs red-o-api

# Actualizar frontend
cd ../frontend
npm install
npm run build
sudo rm -rf /var/www/red-o/*
sudo cp -r dist/* /var/www/red-o/
sudo systemctl reload nginx
```

---

## 📚 Comandos Útiles

### MongoDB VM:
```bash
# Logs de MongoDB
sudo journalctl -u mongod -f

# Conectar a MongoDB
mongosh -u admin -p

# Reiniciar MongoDB
sudo systemctl restart mongod

# Ver uso de disco
df -h

# Ver uso de memoria
free -h
```

### App VM:
```bash
# Backend (PM2)
pm2 status
pm2 logs red-o-api
pm2 restart red-o-api
pm2 stop red-o-api
pm2 start red-o-api

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t  # Verificar configuración
sudo tail -f /var/log/nginx/red-o-error.log

# SSL
sudo certbot renew
sudo certbot certificates

# Sistema
htop  # Monitor de procesos
df -h  # Uso de disco
free -h  # Uso de memoria
```

---

## 🐛 Troubleshooting

### MongoDB no acepta conexiones remotas:
```bash
# Verificar bindIp
sudo grep bindIp /etc/mongod.conf
# Debe decir: bindIp: 0.0.0.0

# Reiniciar
sudo systemctl restart mongod

# Verificar firewall
sudo ufw status
```

### Backend no puede conectar a MongoDB:
```bash
# Desde VM App, probar conexión
nc -zv mi-db.duckdns.org 27017

# Verificar .env del backend
cat ~/Red-social/insta-starter/backend/.env | grep MONGODB_URI

# Ver logs del backend
pm2 logs red-o-api --lines 100
```

### 502 Bad Gateway en Nginx:
```bash
# Verificar que backend está corriendo
pm2 status

# Ver logs de backend
pm2 logs red-o-api

# Ver logs de Nginx
sudo tail -f /var/log/nginx/red-o-error.log

# Reiniciar backend
pm2 restart red-o-api
```

### DuckDNS no actualiza:
```bash
# Ver logs
cat ~/duckdns/duck.log
cat ~/duckdns/update.log

# Ejecutar manualmente
~/duckdns/duck.sh

# Verificar crontab
crontab -l

# Verificar IP actual
curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip
```

### SSL no funciona:
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Verificar Nginx
sudo nginx -t
sudo systemctl reload nginx

# Ver logs de Let's Encrypt
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 💰 Costos

Con free tier de GCP (12 meses):

| Recurso | Cantidad | Costo/mes |
|---------|----------|-----------|
| e2-micro VM | 2 | $0 (free tier) |
| Persistent disk 30GB | 2 | $0 (primeros 30GB gratis) |
| Cloud Storage | < 5GB | $0 |
| DuckDNS | ∞ | $0 |
| Let's Encrypt | ∞ | $0 |
| **TOTAL** | - | **$0/mes** |

---

## 📖 Documentación Relacionada

- **[Guía completa de deployment](../../docs/deployment/DEPLOYMENT_FROM_VM_SSH.md)** - Instrucciones detalladas paso a paso
- **[Setup manual](../../docs/deployment/GCP_COMPUTE_ENGINE_DEPLOYMENT.md)** - Si prefieres configurar manualmente

---

## 🎯 Checklist de Deployment

### VM MongoDB:
- [ ] VM creada (e2-micro, Ubuntu 22.04)
- [ ] Firewall configurado (puerto 27017)
- [ ] Script `setup-mongodb-vm.sh` ejecutado
- [ ] MongoDB corriendo: `sudo systemctl status mongod`
- [ ] DuckDNS funcionando: `cat ~/duckdns/duck.log` → "OK"
- [ ] Usuarios creados: admin + app user

### VM Aplicación:
- [ ] VM creada (e2-micro, Ubuntu 22.04)
- [ ] Script `setup-app-vm.sh` ejecutado
- [ ] Backend corriendo: `pm2 status` → "online"
- [ ] Frontend accesible: http://mi-app.duckdns.org
- [ ] DuckDNS funcionando: `cat ~/duckdns/duck.log` → "OK"

### SSL:
- [ ] Script `setup-ssl-vm.sh` ejecutado
- [ ] HTTPS funcionando: https://mi-app.duckdns.org
- [ ] HTTP redirige a HTTPS
- [ ] Certificado válido: `sudo certbot certificates`

### Aplicación:
- [ ] Registro de usuarios funciona
- [ ] Login funciona
- [ ] Upload de imágenes funciona
- [ ] API responde: https://mi-app.duckdns.org/api/health

---

**¡Listo para deployar! 🚀**

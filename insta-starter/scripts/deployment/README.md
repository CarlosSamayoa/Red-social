# Deployment Scripts

Scripts de deployment y gestión de infraestructura en Google Cloud Platform.

## 🏗️ Arquitecturas Disponibles

### Opción 1: **Cloud Run + Compute Engine** (Serverless + VM)
Usa `deploy-gcp.sh` para backend serverless en Cloud Run, MongoDB en Compute Engine.

### Opción 2: **Compute Engine Full** (VMs completas) ⭐ **RECOMENDADO**
Usa `deploy-compute-engine-*.sh` para todo en Compute Engine con DuckDNS y Nginx.

---

## 📜 Scripts para Cloud Run (Opción 1)

### 🚀 `deploy-gcp.sh`
**Deployment completo con Cloud Run**

Este script automatiza todo el proceso de deployment:
- ✅ Habilita APIs necesarias de GCP
- ✅ Crea bucket de Cloud Storage
- ✅ Despliega MongoDB en Compute Engine (e2-micro)
- ✅ Configura Secret Manager
- ✅ Despliega backend en Cloud Run
- ✅ Despliega frontend en Cloud Storage

**Uso:**
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

**Requisitos:**
- Google Cloud CLI instalado
- Proyecto GCP configurado
- Credenciales autenticadas

---

### 🔄 `update-backend.sh`
**Actualizar solo el backend (Cloud Run)**

Despliega cambios del backend a Cloud Run sin afectar otros servicios.

**Uso:**
```bash
chmod +x update-backend.sh
./update-backend.sh
```

**Proceso:**
1. Build de imagen Docker
2. Push a Container Registry
3. Deploy a Cloud Run
4. Actualización de secretos (si es necesario)

---

### 🎨 `update-frontend.sh`
**Actualizar solo el frontend (Cloud Storage)**

Despliega cambios del frontend a Cloud Storage.

**Uso:**
```bash
chmod +x update-frontend.sh
./update-frontend.sh
```

**Proceso:**
1. Build de producción con Vite
2. Upload a Cloud Storage bucket
3. Configuración de caché headers

---

### 🧹 `cleanup-gcp.sh`
**Limpiar todos los recursos de GCP**

⚠️ **PRECAUCIÓN**: Este script elimina TODOS los recursos creados en GCP.

**Uso:**
```bash
chmod +x cleanup-gcp.sh
./cleanup-gcp.sh
```

**Recursos eliminados:**
- Cloud Run services
- Compute Engine instances
- Cloud Storage buckets
- Secret Manager secrets
- Container images

---

## 📜 Scripts para Compute Engine (Opción 2) ⭐

### 🏗️ `deploy-compute-engine-infrastructure.sh`
**Paso 1: Crear infraestructura completa**

Crea todas las instancias y configuraciones base:
- ✅ Instancia de MongoDB (e2-micro con DuckDNS)
- ✅ Instancia de aplicación (e2-micro con DuckDNS)
- ✅ Bucket de Cloud Storage
- ✅ Reglas de firewall
- ✅ Configuración de MongoDB con autenticación
- ✅ DuckDNS para IPs dinámicas

**Uso:**
```bash
chmod +x deploy-compute-engine-infrastructure.sh
./deploy-compute-engine-infrastructure.sh
```

**Información requerida:**
- PROJECT_ID de GCP
- DuckDNS Token
- Subdominios DuckDNS (app y db)
- Contraseñas de MongoDB
- Credenciales de OAuth y reCAPTCHA

**Tiempo estimado:** 5-10 minutos

---

### 🚀 `deploy-compute-engine-app.sh`
**Paso 2: Deployar la aplicación**

Instala y configura el código de la aplicación:
- ✅ Configura DuckDNS en servidor de aplicación
- ✅ Configura Nginx como reverse proxy
- ✅ Instala y ejecuta backend con PM2
- ✅ Despliega frontend build
- ✅ Configura auto-inicio de servicios

**Uso:**
```bash
chmod +x deploy-compute-engine-app.sh
./deploy-compute-engine-app.sh
```

**Pre-requisitos:**
- Haber ejecutado `deploy-compute-engine-infrastructure.sh`
- Frontend debe estar buildeado localmente

**Tiempo estimado:** 3-5 minutos

---

### 🔐 `setup-ssl-compute-engine.sh`
**Paso 3: Configurar SSL/HTTPS**

Instala certificados SSL gratuitos con Let's Encrypt:
- ✅ Instala Certbot
- ✅ Obtiene certificado SSL válido
- ✅ Configura Nginx para HTTPS
- ✅ Redirección HTTP → HTTPS
- ✅ Auto-renovación de certificados
- ✅ Headers de seguridad

**Uso:**
```bash
chmod +x setup-ssl-compute-engine.sh
./setup-ssl-compute-engine.sh
```

**Pre-requisitos:**
- Haber ejecutado `deploy-compute-engine-app.sh`
- DuckDNS debe estar apuntando correctamente

**Tiempo estimado:** 2-3 minutos

---

### 🔄 `update-compute-engine.sh`
**Actualización rápida de código**

Actualiza backend y/o frontend sin recrear infraestructura:
- ✅ Backup automático de versión anterior
- ✅ Cero downtime en frontend
- ✅ Reinicio automático de servicios
- ✅ Validación de configuración Nginx

**Uso:**
```bash
chmod +x update-compute-engine.sh
./update-compute-engine.sh
```

**Opciones interactivas:**
- Actualizar solo backend
- Actualizar solo frontend
- Actualizar ambos

**Tiempo estimado:** 1-2 minutos

---

## 📖 Documentación Relacionada

- [Guía Completa GCP](../../docs/deployment/GCP_DEPLOYMENT.md)
- [Quick Deploy](../../docs/deployment/QUICK_DEPLOY_GCP.md)
- [Checklist de Deployment](../../docs/deployment/DEPLOYMENT_CHECKLIST.md)
- [Troubleshooting](../../docs/deployment/GCP_DEPLOYMENT.md#solución-de-problemas)

## 🔧 Variables de Entorno Requeridas

Antes de ejecutar los scripts, asegúrate de tener configuradas:

```bash
# GCP Project
export PROJECT_ID="tu-project-id"
export REGION="us-central1"
export ZONE="us-central1-a"

# Credenciales (en Secret Manager o .env)
MONGODB_URI
JWT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RECAPTCHA_SECRET_KEY
```

## 💡 Tips

1. **Primera vez**: Usa `deploy-gcp.sh` para setup completo
2. **Desarrollo iterativo**: Usa `update-backend.sh` o `update-frontend.sh`
3. **Testing**: Prueba en local primero con `npm run dev`
4. **Cleanup**: Solo usa `cleanup-gcp.sh` si quieres empezar de cero

## ⚠️ Troubleshooting

**Error: "gcloud command not found"**
```bash
# Instalar Google Cloud CLI
# https://cloud.google.com/sdk/docs/install
```

**Error: "Permission denied"**
```bash
chmod +x *.sh
```

**Error: "API not enabled"**
```bash
# El script deploy-gcp.sh habilita las APIs automáticamente
# O manualmente:
gcloud services enable run.googleapis.com
gcloud services enable compute.googleapis.com
```

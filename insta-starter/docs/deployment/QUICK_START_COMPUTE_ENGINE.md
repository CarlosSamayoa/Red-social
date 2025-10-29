# 🚀 Quick Start - Deployment en Compute Engine con DuckDNS

> **Tiempo total**: ~25 minutos  
> **Costo**: $0/mes (100% en free tier de GCP)  
> **Dificultad**: Media (scripts automatizados)

## 📋 Requisitos Previos (5 minutos)

### 1. Google Cloud Platform
- [ ] Cuenta de GCP creada ([Crear cuenta](https://cloud.google.com/))
- [ ] Google Cloud CLI instalado ([Descargar](https://cloud.google.com/sdk/docs/install))
- [ ] Autenticado: `gcloud auth login`
- [ ] Proyecto creado y configurado

### 2. DuckDNS
- [ ] Cuenta en [DuckDNS.org](https://www.duckdns.org/)
- [ ] Token copiado (ej: `8f3dc55c-d670-4479-b37b-23d7ad6467f9`)
- [ ] 2 subdominios creados:
  - `mi-app.duckdns.org` (para la aplicación)
  - `mi-db.duckdns.org` (para MongoDB)

### 3. Credenciales de Aplicación
- [ ] Google OAuth Client ID y Secret ([Crear aquí](https://console.cloud.google.com/apis/credentials))
- [ ] reCAPTCHA v3 Site Key y Secret ([Crear aquí](https://www.google.com/recaptcha/admin))

### 4. Código Local
- [ ] Repositorio clonado
- [ ] Node.js 18+ instalado
- [ ] Dependencias instaladas (`npm install` en backend y frontend)

---

## 🎯 Deployment en 3 Pasos

### Paso 1: Crear Infraestructura (10 minutos)

Este paso crea todas las VMs, configura MongoDB y DuckDNS.

```bash
cd Red-social/insta-starter
chmod +x scripts/deployment/deploy-compute-engine-infrastructure.sh
./scripts/deployment/deploy-compute-engine-infrastructure.sh
```

**El script te pedirá:**
- ✅ PROJECT_ID de GCP
- ✅ DuckDNS Token
- ✅ Subdominios (app y db)
- ✅ Contraseñas para MongoDB (admin y app user)
- ✅ JWT_SECRET
- ✅ Google OAuth credentials
- ✅ reCAPTCHA credentials

**Lo que hace:**
1. ✅ Habilita APIs de GCP
2. ✅ Crea bucket de Cloud Storage
3. ✅ Crea VM para MongoDB (e2-micro)
4. ✅ Instala y configura MongoDB 7.0
5. ✅ Configura DuckDNS en servidor MongoDB
6. ✅ Crea VM para aplicación (e2-micro)
7. ✅ Instala Node.js, Nginx, PM2
8. ✅ Configura reglas de firewall

**Tiempo**: ~10 minutos

---

### Paso 2: Deployar Aplicación (5 minutos)

Este paso instala tu código en el servidor.

```bash
chmod +x scripts/deployment/deploy-compute-engine-app.sh
./scripts/deployment/deploy-compute-engine-app.sh
```

**El script te pedirá:**
- ✅ Confirmar configuración del paso 1
- ✅ Contraseña de MongoDB app user

**Lo que hace:**
1. ✅ Configura variables de entorno
2. ✅ Build del frontend
3. ✅ Comprime backend y frontend
4. ✅ Sube archivos al servidor
5. ✅ Configura DuckDNS en servidor app
6. ✅ Configura Nginx (HTTP temporal)
7. ✅ Instala backend con PM2
8. ✅ Despliega frontend

**Tiempo**: ~5 minutos

**Tu app estará disponible en**: `http://mi-app.duckdns.org`

---

### Paso 3: Configurar SSL (3 minutos)

Este paso habilita HTTPS con certificado gratuito.

```bash
chmod +x scripts/deployment/setup-ssl-compute-engine.sh
./scripts/deployment/setup-ssl-compute-engine.sh
```

**El script te pedirá:**
- ✅ Dominio de tu app
- ✅ Tu email para Let's Encrypt

**Lo que hace:**
1. ✅ Instala Certbot
2. ✅ Obtiene certificado SSL válido
3. ✅ Configura Nginx para HTTPS
4. ✅ Redirección HTTP → HTTPS
5. ✅ Auto-renovación de certificados

**Tiempo**: ~3 minutos

**Tu app estará disponible en**: `https://mi-app.duckdns.org` 🎉

---

## ✅ Verificación

### 1. Verificar servicios en servidor MongoDB

```bash
gcloud compute ssh red-o-mongodb --zone=us-central1-a

# Verificar MongoDB
sudo systemctl status mongod

# Verificar DuckDNS
cat ~/duckdns/duck.log

# Salir
exit
```

### 2. Verificar servicios en servidor App

```bash
gcloud compute ssh red-o-app --zone=us-central1-a

# Verificar backend (PM2)
pm2 status
pm2 logs red-o-api --lines 20

# Verificar Nginx
sudo systemctl status nginx

# Verificar DuckDNS
cat ~/duckdns/duck.log

# Verificar SSL
sudo certbot certificates

# Salir
exit
```

### 3. Verificar aplicación

1. **Frontend**: Abre `https://mi-app.duckdns.org`
2. **API Health**: `https://mi-app.duckdns.org/api/health`
3. **Registro**: Crea una cuenta
4. **Login**: Inicia sesión
5. **Upload**: Sube una imagen

---

## 🔄 Actualizaciones

Para actualizar el código después del deployment inicial:

```bash
chmod +x scripts/deployment/update-compute-engine.sh
./scripts/deployment/update-compute-engine.sh
```

El script te preguntará qué actualizar:
- ✅ Solo backend
- ✅ Solo frontend
- ✅ Ambos

**Tiempo**: ~2 minutos

---

## 📊 Monitoreo

### Ver logs del backend

```bash
gcloud compute ssh red-o-app --zone=us-central1-a
pm2 logs red-o-api
```

### Ver logs de Nginx

```bash
gcloud compute ssh red-o-app --zone=us-central1-a
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Ver logs de MongoDB

```bash
gcloud compute ssh red-o-mongodb --zone=us-central1-a
sudo journalctl -u mongod -f
```

---

## 🐛 Troubleshooting Rápido

### Error: "Cannot connect to MongoDB"

```bash
# Verificar que MongoDB está corriendo
gcloud compute ssh red-o-mongodb --zone=us-central1-a
sudo systemctl restart mongod

# Verificar conectividad desde servidor app
gcloud compute ssh red-o-app --zone=us-central1-a
nc -zv mi-db.duckdns.org 27017
```

### Error: "502 Bad Gateway"

```bash
# Verificar backend
gcloud compute ssh red-o-app --zone=us-central1-a
pm2 restart red-o-api
pm2 logs red-o-api
```

### Error: "SSL certificate problem"

```bash
# Renovar certificado
gcloud compute ssh red-o-app --zone=us-central1-a
sudo certbot renew
sudo systemctl reload nginx
```

### Error: "DuckDNS no actualiza IP"

```bash
gcloud compute ssh red-o-app --zone=us-central1-a  # o red-o-mongodb
cat ~/duckdns/duck.log
pkill duck
sudo /etc/rc2.d/S10duckdns
```

---

## 💰 Costos

Con free tier de GCP (12 meses):

| Recurso | Cantidad | Costo/mes |
|---------|----------|-----------|
| e2-micro VM (MongoDB) | 1 | $0 (free tier) |
| e2-micro VM (App) | 1 | $0 (free tier) |
| Persistent disk 30GB | 2 | $0 (primeros 30GB gratis) |
| Cloud Storage | < 5GB | $0 (primeros 5GB gratis) |
| DuckDNS | ilimitado | $0 (siempre gratis) |
| Let's Encrypt SSL | ilimitado | $0 (siempre gratis) |
| **TOTAL** | - | **$0-1/mes** |

---

## 📚 Documentación Completa

Para información detallada sobre cada paso:

- **[Guía Completa](GCP_COMPUTE_ENGINE_DEPLOYMENT.md)** - Documentación técnica detallada
- **[Scripts README](../../scripts/deployment/README.md)** - Descripción de cada script
- **[Troubleshooting](GCP_COMPUTE_ENGINE_DEPLOYMENT.md#troubleshooting)** - Solución de problemas

---

## 🎉 ¡Listo!

Tu aplicación está deployada y corriendo en:

✅ **Frontend**: `https://mi-app.duckdns.org`  
✅ **API**: `https://mi-app.duckdns.org/api`  
✅ **MongoDB**: `mi-db.duckdns.org:27017`  
✅ **SSL**: Certificado válido con auto-renovación  
✅ **Costo**: $0/mes

**Próximos pasos sugeridos:**
1. Configurar backups automáticos de MongoDB
2. Configurar monitoreo con Cloud Logging
3. Optimizar performance de Nginx
4. Configurar alertas de uptime

---

<div align="center">

**¿Preguntas? Revisa la [documentación completa](GCP_COMPUTE_ENGINE_DEPLOYMENT.md)**

*Última actualización: Octubre 28, 2025*

</div>

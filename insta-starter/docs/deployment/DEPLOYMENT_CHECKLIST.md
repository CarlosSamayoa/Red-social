# Red-O - Checklist de Despliegue en GCP

## Pre-Despliegue

### Configuración de Google Cloud
- [ ] Cuenta de Google Cloud creada
- [ ] Facturación habilitada
- [ ] Proyecto creado: `red-o-production`
- [ ] gcloud CLI instalado y configurado
- [ ] Autenticación de Docker configurada: `gcloud auth configure-docker`

### Configuración de Servicios Externos
  - [ ] Google OAuth configurado
  - [ ] Client ID obtenido
  - [ ] Client Secret obtenido
  - [ ] Redirect URI configurada: `https://[TU-CLOUD-RUN-URL]/api/auth/google/callback`
  - [ ] reCAPTCHA configurado
  - [ ] Site Key obtenida
  - [ ] Secret Key obtenida

### Archivos de Configuración
- [ ] `backend/.env.example` copiado a `backend/.env`
- [ ] `frontend/.env.example` copiado a `frontend/.env`
- [ ] Variables de entorno configuradas en ambos archivos

## Despliegue

### Opción A: Script Automático
- [ ] Ejecutar: `./deploy-gcp.sh`
- [ ] Proporcionar credenciales de MongoDB cuando se soliciten
- [ ] Proporcionar Google OAuth credentials
- [ ] Proporcionar reCAPTCHA secret
- [ ] Verificar que el script complete sin errores

### Opción B: Deployment Manual

#### 1. APIs y Permisos
- [ ] Habilitar Cloud Run API
- [ ] Habilitar Cloud Storage API
- [ ] Habilitar Secret Manager API
- [ ] Habilitar Compute Engine API
- [ ] Habilitar Cloud Build API

#### 2. MongoDB en Compute Engine
- [ ] VM f1-micro creada
- [ ] MongoDB instalado
- [ ] Autenticación configurada
- [ ] Usuarios creados (admin + app)
- [ ] Regla de firewall creada
- [ ] IP interna obtenida
- [ ] Connection string guardado

#### 3. Cloud Storage
- [ ] Bucket de imágenes creado: `red-o-images-prod`
- [ ] Permisos públicos configurados en bucket de imágenes
- [ ] CORS configurado en bucket de imágenes
- [ ] Bucket de frontend creado: `red-o-frontend-prod`
- [ ] Hosting estático configurado en bucket de frontend
- [ ] Permisos públicos configurados en bucket de frontend

#### 4. Secret Manager
- [ ] Secreto `mongodb-uri` creado
- [ ] Secreto `jwt-secret` creado
- [ ] Secreto `google-client-id` creado
- [ ] Secreto `google-client-secret` creado
- [ ] Secreto `recaptcha-secret` creado
- [ ] Permisos IAM configurados para Cloud Run

#### 5. Backend (Cloud Run)
- [ ] Imagen Docker construida
- [ ] Imagen subida a Container Registry
- [ ] Servicio Cloud Run desplegado
- [ ] Variables de entorno configuradas
- [ ] Secretos vinculados
- [ ] URL del servicio obtenida
- [ ] Endpoint `/health` responde OK

#### 6. Frontend
- [ ] Archivo `.env.production` creado con URL del backend
- [ ] Dependencias instaladas: `npm install`
- [ ] Build de producción ejecutado: `npm run build`
- [ ] Archivos subidos a Cloud Storage
- [ ] URL de frontend verificada

## Post-Despliegue

### Verificación del Backend
- [ ] Health check: `curl https://[BACKEND-URL]/health`
- [ ] Conexión a MongoDB verificada en logs
- [ ] Endpoint de auth probado: `/api/auth/register`
- [ ] Upload de imagen probado

### Verificación del Frontend
- [ ] Página carga correctamente
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Google OAuth funciona
- [ ] reCAPTCHA funciona
- [ ] Upload de imagen funciona
- [ ] Feed muestra publicaciones
- [ ] Mensajes funcionan

### Configuración de Monitoreo
- [ ] Logs de Cloud Run configurados
- [ ] Alertas de facturación configuradas
- [ ] Dashboard de Cloud Monitoring creado (opcional)

### Backups
- [ ] Script de backup de MongoDB configurado
- [ ] Bucket de backups creado
- [ ] Cron job de backups configurado en VM
- [ ] Backup manual probado

### Seguridad
- [ ] Firewall de MongoDB restringido (opcional: solo IPs específicas)
- [ ] Secretos verificados (no hardcodeados)
- [ ] CORS configurado correctamente
- [ ] Rate limiting verificado

## Configuración Opcional

### Dominio Personalizado
- [ ] Dominio comprado/disponible
- [ ] Cloud DNS configurado
- [ ] Registros A/CNAME creados
- [ ] SSL/TLS configurado
- [ ] Redirect HTTP → HTTPS configurado

### CI/CD con Cloud Build
- [ ] Repositorio conectado a Cloud Build
- [ ] Trigger de GitHub configurado
- [ ] `cloudbuild.yaml` configurado
- [ ] Deploy automático probado

### CDN (Cloud CDN)
- [ ] Load Balancer creado
- [ ] Backend bucket configurado
- [ ] Cloud CDN habilitado
- [ ] Caché configurado
- [ ] SSL certificate creado

## Mantenimiento

### Actualizaciones Regulares
- [ ] Script `update-backend.sh` probado
- [ ] Script `update-frontend.sh` probado
- [ ] Proceso de rollback documentado

### Monitoreo Continuo
- [ ] Logs revisados semanalmente
- [ ] Métricas de uso monitoreadas
- [ ] Alertas de costos configuradas
- [ ] Backups verificados mensualmente

## Troubleshooting

### Problemas Comunes Verificados
- [ ] Backend no conecta a MongoDB → IP verificada
- [ ] Frontend no carga → Permisos de bucket verificados
- [ ] Uploads fallan → Permisos GCS verificados
- [ ] CORS errors → Configuración CORS revisada
- [ ] 500 errors → Logs de Cloud Run revisados

## Documentación

- [ ] URL del backend documentada
- [ ] URL del frontend documentada
- [ ] Credenciales guardadas en lugar seguro
- [ ] Proceso de deployment documentado
- [ ] Contactos de soporte definidos

## Costos

- [ ] Presupuesto mensual definido
- [ ] Alertas de facturación configuradas
- [ ] Uso de capa gratuita verificado
- [ ] Proyección de costos calculada

---

## URLs Importantes (Completar después del deployment)

- **Backend API**: `https://red-o-backend-XXXXX-uc.a.run.app`
- **Frontend**: `https://storage.googleapis.com/red-o-frontend-prod/index.html`
- **Cloud Console**: `https://console.cloud.google.com/run?project=red-o-production`
- **Logs**: `https://console.cloud.google.com/logs?project=red-o-production`

## Contactos

- **Desarrollador**: _____________________
- **Email**: _____________________
- **GCP Project ID**: `red-o-production`
- **Región**: `us-central1`

---

**Última actualización**: _____________________
**Versión desplegada**: _____________________
**Estado**: [ ] Desarrollo | [ ] Staging | [ ] Producción

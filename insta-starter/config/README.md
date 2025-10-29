# Configuración

Esta carpeta contiene archivos de configuración para diferentes herramientas y servicios.

## 📁 Estructura

### `ci-cd/`
Configuración de CI/CD (Continuous Integration/Continuous Deployment).

**Archivos:**
- `cloudbuild.yaml` - Pipeline de Cloud Build para GCP

### `postman/`
Colecciones y entornos de Postman para testing de API.

**Archivos:**
- `Red-O-Authentication.postman_collection.json` - Colección de endpoints de autenticación
- `Red-O-Environment.postman_environment.json` - Variables de entorno para Postman

## 🔄 CI/CD (Cloud Build)

### `ci-cd/cloudbuild.yaml`

Pipeline automatizado que se ejecuta en cada push al repositorio:

**Etapas:**
1. **Build Backend** - Construye imagen Docker del backend
2. **Push to Registry** - Sube imagen a Container Registry
3. **Deploy Backend** - Despliega a Cloud Run
4. **Build Frontend** - Compila frontend con Vite
5. **Deploy Frontend** - Sube a Cloud Storage

**Configuración:**
```yaml
timeout: 1800s  # 30 minutos
machineType: 'N1_HIGHCPU_8'
```

**Variables requeridas:**
- `_PROJECT_ID` - ID del proyecto GCP
- `_BACKEND_URL` - URL del backend en Cloud Run

Ver [docs/deployment/GCP_DEPLOYMENT.md](../docs/deployment/GCP_DEPLOYMENT.md#cicd-con-cloud-build) para setup completo.

---

## 🧪 Postman Collections

### Testing de API

#### 1. Importar Colección
```
File → Import → config/postman/Red-O-Authentication.postman_collection.json
```

#### 2. Importar Entorno
```
Environments → Import → config/postman/Red-O-Environment.postman_environment.json
```

#### 3. Configurar Variables
```
BACKEND_URL: http://localhost:8080 (desarrollo)
BACKEND_URL: https://tu-backend.run.app (producción)
```

### Endpoints Incluidos

**Autenticación:**
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Login con Google OAuth
- `GET /api/auth/me` - Obtener usuario actual

**Social:**
- `GET /api/social/posts` - Timeline de posts
- `POST /api/social/posts` - Crear post
- `POST /api/social/posts/:id/like` - Like a post
- `POST /api/social/posts/:id/comment` - Comentar post

**Uploads:**
- `POST /api/uploads/image` - Subir imagen
- `GET /api/uploads/:variant/:filename` - Obtener imagen

### Variables de Entorno

Configura estas variables en el entorno de Postman:

```json
{
  "BACKEND_URL": "http://localhost:8080",
  "TOKEN": "{{jwt_token}}",
  "USER_ID": "{{user_id}}"
}
```

---

## 📖 Documentación Relacionada

- [Guía de Deployment](../docs/deployment/GCP_DEPLOYMENT.md)
- [Sistema de Autenticación](../docs/features/DOCUMENTACION_AUTENTICACION.md)
- [Documentación Técnica](../docs/DOCUMENTACION_TECNICA.md)

## 💡 Tips

### CI/CD
- El pipeline se ejecuta automáticamente en cada push
- Revisa logs en Cloud Build: `gcloud builds log --limit=10`
- Personaliza triggers en la consola de GCP

### Postman
- Usa entornos separados para dev/staging/prod
- Guarda tokens en variables de entorno
- Usa pre-request scripts para auth automática
- Exporta colecciones después de cambios

## 🔒 Seguridad

**IMPORTANTE:** 
- ❌ NO subas archivos `.env` con credenciales reales
- ❌ NO incluyas tokens en las colecciones de Postman
- ✅ Usa variables de entorno para credenciales
- ✅ Mantén secretos en Secret Manager (GCP)

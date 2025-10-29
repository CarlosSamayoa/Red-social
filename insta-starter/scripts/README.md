# Scripts

Esta carpeta contiene todos los scripts de utilidad y deployment del proyecto.

## 📁 Estructura

### `deployment/`
Scripts de deployment y gestión de la infraestructura en Google Cloud Platform.

**Archivos:**
- `deploy-gcp.sh` - Script completo de deployment inicial a GCP
- `update-backend.sh` - Actualizar solo el backend en Cloud Run
- `update-frontend.sh` - Actualizar solo el frontend en Cloud Storage
- `cleanup-gcp.sh` - Limpiar todos los recursos de GCP

### `utils/`
Scripts de utilidad para mantenimiento y debugging.

**Archivos:**
- `fix-token.js` - Utilidad para regenerar tokens JWT

## 🚀 Uso

### Deployment Completo
```bash
cd scripts/deployment
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

### Actualizar Backend
```bash
cd scripts/deployment
chmod +x update-backend.sh
./update-backend.sh
```

### Actualizar Frontend
```bash
cd scripts/deployment
chmod +x update-frontend.sh
./update-frontend.sh
```

### Limpieza de Recursos
```bash
cd scripts/deployment
chmod +x cleanup-gcp.sh
./cleanup-gcp.sh
```

## 📖 Documentación

Ver [docs/deployment/QUICK_DEPLOY_GCP.md](../docs/deployment/QUICK_DEPLOY_GCP.md) para guía completa de deployment.

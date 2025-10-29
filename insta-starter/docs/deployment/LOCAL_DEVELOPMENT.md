# Red-O - Desarrollo Local

## Configuración Inicial

### 1. Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Configurar Variables de Entorno

#### Backend
```bash
cd backend
cp .env.example .env
```

Editar `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/redodb
JWT_SECRET=tu-secret-local-desarrollo
SESSION_SECRET=tu-session-secret
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
RECAPTCHA_SECRET_KEY=tu-recaptcha-secret
FRONTEND_URL=http://localhost:5173
PORT=3002
NODE_ENV=development
```

#### Frontend
```bash
cd frontend
cp .env.example .env
```

Editar `frontend/.env`:
```env
VITE_API_URL=http://localhost:3002/api
VITE_GOOGLE_CLIENT_ID=tu-google-client-id
VITE_RECAPTCHA_SITE_KEY=tu-recaptcha-site-key
```

### 3. Iniciar MongoDB Local

```bash
# Windows (con MongoDB instalado)
mongod --dbpath="C:\data\db"

# Linux/Mac
mongod --dbpath=/data/db

# O usar Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Iniciar Servidores de Desarrollo

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

El backend estará disponible en: `http://localhost:3002`

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

## Estructura de Desarrollo

```
insta-starter/
├── backend/
│   ├── src/
│   │   ├── routes/         # Endpoints de la API
│   │   ├── models/         # Modelos de MongoDB
│   │   ├── middleware/     # Auth, rate limiting, etc.
│   │   ├── config/         # Configuración (passport, etc.)
│   │   └── utils/          # Utilidades (GCS, S3, etc.)
│   ├── storage/            # Archivos locales (desarrollo)
│   ├── scripts/            # Scripts de utilidad
│   ├── server.js           # Punto de entrada
│   ├── Dockerfile          # Para Cloud Run
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # Componentes React
    │   ├── styles/         # CSS
    │   ├── api.js          # Cliente de API
    │   ├── App.jsx         # Componente principal
    │   └── main.jsx        # Punto de entrada
    ├── public/
    ├── vite.config.js
    └── package.json
```

## Comandos Útiles

### Backend

```bash
# Modo desarrollo con hot-reload
npm run dev

# Producción
npm start

# Linting
npm run lint

# Seed de datos de prueba
npm run seed
```

### Frontend

```bash
# Modo desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Testing Local

### Probar Endpoints

```bash
# Health check
curl http://localhost:3002/health

# Registro de usuario
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test1234!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### Probar Upload de Imágenes

1. Ve a `http://localhost:5173`
2. Regístrate/inicia sesión
3. Crea una publicación con imagen
4. Verifica que la imagen se guarde en `backend/storage/`

## Diferencias Desarrollo vs Producción

| Característica | Desarrollo | Producción (GCP) |
|----------------|-----------|------------------|
| MongoDB | Local (localhost) | Compute Engine VM |
| Almacenamiento | Disco local (`/storage`) | Cloud Storage |
| URLs | localhost | Cloud Run + Cloud Storage |
| CORS | Permisivo | Restrictivo |
| Logs | Console | Cloud Logging |
| Secrets | `.env` file | Secret Manager |

## Variables de Entorno

### Backend

| Variable | Desarrollo | Producción | Descripción |
|----------|-----------|-----------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/redodb` | Desde Secret Manager | Connection string de MongoDB |
| `NODE_ENV` | `development` | `production` | Entorno de ejecución |
| `PORT` | `3002` | `8080` | Puerto del servidor |
| `USE_GCS` | `false` | `true` | Usar Cloud Storage vs local |
| `GCS_BUCKET` | - | `red-o-images-prod` | Bucket de GCS |
| `JWT_SECRET` | Local | Desde Secret Manager | Secret para tokens JWT |
| `GOOGLE_CLIENT_ID` | Tu client ID | Desde Secret Manager | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Tu secret | Desde Secret Manager | OAuth Secret |
| `RECAPTCHA_SECRET_KEY` | Tu key | Desde Secret Manager | reCAPTCHA secret |
| `FRONTEND_URL` | `http://localhost:5173` | URL de frontend | Para CORS |

### Frontend

| Variable | Desarrollo | Producción | Descripción |
|----------|-----------|-----------|-------------|
| `VITE_API_URL` | `http://localhost:3002/api` | URL de Cloud Run | URL del backend |
| `VITE_GOOGLE_CLIENT_ID` | Tu client ID | Client ID | Para OAuth |
| `VITE_RECAPTCHA_SITE_KEY` | Tu site key | Site key | Para reCAPTCHA |
| `VITE_GCS_IMAGES_URL` | - | `https://storage.googleapis.com/red-o-images-prod` | URL de imágenes |

## Migrar de Desarrollo a Producción

### 1. Exportar Datos de MongoDB

```bash
# Exportar base de datos local
mongodump --uri="mongodb://localhost:27017/redodb" --out="./backup"
```

### 2. Importar a MongoDB de Producción

```bash
# Obtener IP de la VM de producción
MONGODB_IP=$(gcloud compute instances describe mongodb-server --zone=us-central1-a --format='get(networkInterfaces[0].networkIP)')

# Importar datos
mongorestore --uri="mongodb://redoapp:TU_PASSWORD@$MONGODB_IP:27017/redodb?authSource=redodb" ./backup/redodb
```

### 3. Migrar Imágenes a Cloud Storage

```bash
# Subir imágenes locales a GCS
gsutil -m rsync -r backend/storage/ gs://red-o-images-prod/
```

## Troubleshooting Local

### MongoDB no conecta
```bash
# Verificar que MongoDB esté corriendo
mongosh

# Si no funciona, iniciar servicio
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Puerto ya en uso
```bash
# Encontrar proceso en puerto 3002
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3002 | xargs kill -9
```

### CORS errors
Verificar que `FRONTEND_URL` en backend/.env coincida con la URL del frontend

### Imágenes no cargan
Verificar que la carpeta `backend/storage/` exista y tenga permisos de escritura

## Scripts de Desarrollo

### Crear usuario de prueba
```bash
cd backend
node scripts/create-test-user.js
```

### Limpiar publicaciones corruptas
```bash
cd backend
node scripts/clean-corrupt-posts.js
```

### Seed de datos
```bash
cd backend
node scripts/seed.js
```

## Hot Reload

### Backend
El backend usa `--watch` de Node.js (Node 18+):
- Se reinicia automáticamente al guardar archivos
- No requiere nodemon

### Frontend
Vite proporciona hot-reload automático:
- Cambios en componentes se reflejan instantáneamente
- No requiere recargar página (HMR)

## Debugging

### Backend
```javascript
// Agregar breakpoints con debugger
router.post('/endpoint', async (req, res) => {
  debugger; // Pausar aquí
  // ...
});
```

### Frontend
```javascript
// Console logging
console.log('User data:', user);

// React DevTools en navegador
```

### VS Code Launch Configuration

Crear `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/server.js",
      "envFile": "${workspaceFolder}/backend/.env"
    }
  ]
}
```

## Buenas Prácticas

1. ✅ **Nunca commitear .env** - Usar .env.example
2. ✅ **Usar diferentes bases de datos** - dev vs test vs prod
3. ✅ **Probar localmente antes de deploy** 
4. ✅ **Mantener dependencias actualizadas**: `npm outdated`
5. ✅ **Usar mismo Node version** que producción (18+)
6. ✅ **Probar en modo producción localmente**:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

## Siguientes Pasos

Una vez que todo funcione localmente:

1. Seguir `QUICK_DEPLOY_GCP.md` para desplegar
2. Usar `DEPLOYMENT_CHECKLIST.md` para verificar
3. Configurar CI/CD con `cloudbuild.yaml`

## Recursos

- **Documentación de API**: `http://localhost:3002/api/health`
- **MongoDB Compass**: `mongodb://localhost:27017/redodb`
- **React DevTools**: Extensión de Chrome
- **Postman Collection**: `Red-O-Authentication.postman_collection.json`

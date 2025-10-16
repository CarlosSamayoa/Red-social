# 🚀 Quick Start - Red-O

## Levantar Frontend + Backend con UN SOLO COMANDO

```bash
npm start
```

o también:

```bash
npm run dev
```

¡Eso es todo! 🎉

---

## 📋 Qué hace este comando

Ejecuta **simultáneamente** (usando `concurrently`):
- **Backend** en `http://localhost:3002` (carpeta `backend/`)
- **Frontend** en `http://localhost:5173` (carpeta `frontend/`)

Los cambios se recargan automáticamente en ambos servicios.

---

## 🔧 Primera Vez / Setup Inicial

Si es la primera vez que usas el proyecto:

```bash
# 1. Instalar todas las dependencias
npm run install:all

# 2. Configurar variables de entorno (copia .env.example a .env)
npm run setup

# 3. Editar los archivos .env con tus valores reales
# - backend/.env (MONGO_URI, JWT_SECRET, etc.)
# - frontend/.env (opcional, usa defaults)

# 4. Levantar la aplicación
npm start
```

---

## 📦 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Levanta backend + frontend en modo desarrollo |
| `npm run dev` | Alias de `npm start` |
| `npm run dev:backend` | Solo backend |
| `npm run dev:frontend` | Solo frontend |
| `npm run install:all` | Instala deps en raíz, backend y frontend |
| `npm run build` | Build de producción del frontend |
| `npm run start:prod` | Ejecuta backend en modo producción |
| `npm run seed` | Pobla la base de datos con datos de prueba |

---

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3002/api
- **Health Check**: http://localhost:3002/api/health
- **Archivos estáticos**: http://localhost:3002/static

---

## ⚙️ Variables de Entorno Críticas

### Backend (.env)
```env
PORT=3002
MONGO_URI=mongodb://localhost:27017/insta
JWT_SECRET=tu-secreto-super-seguro-aqui
SESSION_SECRET=otro-secreto-aqui
```

### Frontend (.env) - Opcional
```env
VITE_API=http://localhost:3002/api
```

---

## 🛠️ Troubleshooting

### Backend no arranca
- ✅ Verifica que MongoDB esté corriendo
- ✅ Revisa que `backend/.env` existe y tiene `MONGO_URI`
- ✅ Puerto 3002 no esté ocupado

### Frontend no arranca
- ✅ Puerto 5173 no esté ocupado
- ✅ Ejecuta `npm run install:all` de nuevo

### Errores CORS
- ✅ Verifica que el backend esté escuchando en 3002
- ✅ Recarga el navegador después de reiniciar el backend

---

## 📝 Notas

- El comando usa **colores** para diferenciar logs:
  - 🔵 **BACK** (azul) = Backend
  - 🟣 **FRONT** (magenta) = Frontend
  
- Para detener ambos servicios: `Ctrl+C`

- Si solo quieres ejecutar uno de los dos:
  ```bash
  npm run dev:backend   # Solo backend
  npm run dev:frontend  # Solo frontend
  ```

---

¡Feliz desarrollo! 🎨✨

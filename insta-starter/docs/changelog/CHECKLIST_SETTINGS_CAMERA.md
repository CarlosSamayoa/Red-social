# ✅ CHECKLIST DE VERIFICACIÓN - Configuración y Cámara

**Fecha**: Octubre 19, 2025  
**Componentes**: Settings.jsx, UploadPostModal.jsx, backend users.js

---

## 📋 FUNCIONALIDADES A VERIFICAR

### 1. ⚙️ Configuración - Cambio de Foto de Perfil

**URL**: `http://localhost:5173/settings`

#### Pasos de Prueba:
1. ✅ Navegar a `/settings`
2. ✅ Verificar que estás en la pestaña "👤 Perfil"
3. ✅ Ver foto de perfil actual (o avatar con inicial)
4. ✅ Click en "Seleccionar foto"
5. ✅ Elegir imagen desde tu dispositivo
6. ✅ Ver preview de la nueva foto
7. ✅ Click en "✅ Guardar Foto"
8. ✅ Esperar mensaje "Foto de perfil actualizada correctamente"
9. ✅ Verificar que la página recarga automáticamente
10. ✅ Confirmar que la nueva foto aparece en:
    - Header de la app
    - Perfil de usuario
    - Feed (en tus publicaciones)

**Endpoint Backend**: `POST /api/users/profile-photo`
- Acepta: `multipart/form-data` con campo `profile_image`
- Retorna: `{ success: true, imageUrl: string }`

---

### 2. 👤 Configuración - Cambio de Nombre de Usuario

**URL**: `http://localhost:5173/settings`

#### Pasos de Prueba:
1. ✅ Navegar a `/settings`
2. ✅ Click en pestaña "🔒 Seguridad"
3. ✅ Ver sección "Cambiar Nombre de Usuario"
4. ✅ Ver nombre de usuario actual (ej: `@usuario_actual`)
5. ✅ Escribir nuevo nombre en "Nuevo Nombre de Usuario"
6. ✅ Escribir contraseña actual en "Contraseña Actual"
7. ✅ Click en "💾 Cambiar Nombre de Usuario"
8. ✅ Ver mensaje de éxito: "✅ Nombre de usuario cambiado correctamente"
9. ✅ Esperar recarga automática (2 segundos)
10. ✅ Verificar cambio en:
    - Header de la app
    - Perfil de usuario (`/u/nuevo_nombre`)
    - URL del perfil

**Validaciones Frontend**:
- Mínimo 3 caracteres
- Solo letras, números y guiones bajos
- Campo obligatorio de contraseña

**Validaciones Backend**:
- Formato correcto (regex: `^[a-zA-Z0-9_]+$`)
- Username no esté en uso
- Contraseña correcta
- Conversión a minúsculas automática

**Endpoint Backend**: `POST /api/users/change-username`
```json
{
  "newUsername": "nuevo_nombre",
  "password": "contraseña_actual"
}
```

**Respuesta Exitosa**:
```json
{
  "success": true,
  "message": "Nombre de usuario cambiado correctamente",
  "newUsername": "nuevo_nombre"
}
```

**Errores Posibles**:
- `400`: "Este nombre de usuario ya está en uso"
- `400`: "Contraseña incorrecta"
- `400`: "El nombre de usuario debe tener al menos 3 caracteres"
- `400`: "El nombre de usuario solo puede contener letras, números y guiones bajos"

---

### 3. 🔒 Configuración - Cambio de Contraseña

**URL**: `http://localhost:5173/settings`

#### Pasos de Prueba:
1. ✅ Navegar a `/settings`
2. ✅ Click en pestaña "🔒 Seguridad"
3. ✅ Scroll hasta "Cambiar Contraseña"
4. ✅ Escribir contraseña actual
5. ✅ Escribir nueva contraseña (mínimo 6 caracteres)
6. ✅ Confirmar nueva contraseña
7. ✅ Click en "💾 Cambiar Contraseña"
8. ✅ Ver mensaje: "✅ Contraseña cambiada correctamente"
9. ✅ Formulario se limpia automáticamente
10. ✅ Cerrar sesión e iniciar sesión con nueva contraseña

**Endpoint Backend**: `POST /api/users/change-password`
- Ya existente, funcional

---

### 4. 📸 Crear Publicación - Acceso a Cámara

**URL**: Click en botón de crear publicación (+) en cualquier página

#### Pasos de Prueba:

##### 4.1 Verificar Interfaz
1. ✅ Click en botón "+" para crear publicación
2. ✅ Ver modal "Crear Publicación"
3. ✅ Ver dos opciones lado a lado:
   - 📁 "Selecciona archivos" (izquierda)
   - 📸 "Usar cámara" (derecha)

##### 4.2 Probar Cámara
1. ✅ Click en "📸 Usar cámara"
2. ✅ Navegador solicita permiso para acceder a la cámara
3. ✅ Click en "Permitir" en el popup del navegador
4. ✅ Ver preview en vivo de la cámara
5. ✅ Ver tu imagen en tiempo real
6. ✅ Ver botones:
   - "📷 Capturar Foto" (botón principal)
   - "Cancelar" (botón secundario)

##### 4.3 Capturar Foto
1. ✅ Click en "📷 Capturar Foto"
2. ✅ Cámara se cierra automáticamente
3. ✅ Ver preview de la foto capturada
4. ✅ Foto aparece en el área de edición
5. ✅ Puede aplicar filtros a la foto
6. ✅ Ver nombre del archivo: `camera-[timestamp].jpg`
7. ✅ Agregar caption
8. ✅ Click en "Publicar"
9. ✅ Foto se sube correctamente
10. ✅ Aparece en el feed

##### 4.4 Probar Cancelar
1. ✅ Click en "📸 Usar cámara"
2. ✅ Permitir acceso
3. ✅ Ver preview de cámara
4. ✅ Click en "Cancelar"
5. ✅ Cámara se cierra
6. ✅ Vuelve a pantalla de selección
7. ✅ Sin errores en consola

##### 4.5 Probar Cerrar Modal con Cámara Activa
1. ✅ Abrir modal de crear publicación
2. ✅ Click en "📸 Usar cámara"
3. ✅ Permitir acceso
4. ✅ Ver preview de cámara activo
5. ✅ Click en ✕ para cerrar modal
6. ✅ Modal se cierra
7. ✅ Cámara se desactiva automáticamente
8. ✅ Luz de cámara se apaga
9. ✅ Sin memory leaks

##### 4.6 Manejo de Errores
1. **Permiso Denegado**:
   - ✅ Click en "Denegar" cuando pide permiso
   - ✅ Ver alerta: "Permiso denegado. Por favor permite el acceso..."

2. **Sin Cámara**:
   - ✅ Probar en dispositivo sin cámara
   - ✅ Ver alerta: "No se encontró ninguna cámara..."

3. **Cámara en Uso**:
   - ✅ Abrir cámara en otra app
   - ✅ Intentar usar en Red-O
   - ✅ Ver alerta: "La cámara está siendo usada por otra aplicación"

---

## 🔧 CÓDIGO IMPLEMENTADO

### Frontend - Settings.jsx

**Estados agregados**:
```javascript
const [usernameForm, setUsernameForm] = useState({
  newUsername: '',
  password: ''
});
const [usernameLoading, setUsernameLoading] = useState(false);
const [usernameError, setUsernameError] = useState('');
const [usernameSuccess, setUsernameSuccess] = useState('');
```

**Funciones agregadas**:
- `handleUsernameChange(e)` - Maneja cambios en inputs
- `handleUsernameSubmit(e)` - Envía cambio de username al backend

**UI agregada**:
- Formulario completo con username actual visible
- Input para nuevo username con validación pattern
- Input para contraseña de confirmación
- Mensajes de error/éxito
- Botón con estado de loading

---

### Frontend - UploadPostModal.jsx

**Estados agregados**:
```javascript
const [showCamera, setShowCamera] = useState(false);
const [stream, setStream] = useState(null);
const videoRef = React.useRef(null);
const canvasRef = React.useRef(null);
```

**Funciones agregadas**:
- `startCamera()` - Solicita acceso y activa cámara
- `stopCamera()` - Detiene todos los tracks del stream
- `capturePhoto()` - Captura frame, convierte a File, genera preview

**useEffects agregados**:
- Efecto para asignar srcObject cuando cambia stream
- Efecto de limpieza para detener stream al desmontar
- Efecto para limpiar cámara al cerrar modal

**UI agregada**:
- Botones duales (Archivos / Cámara)
- Elemento `<video>` para preview en vivo
- Elemento `<canvas>` oculto para captura
- Botones "Capturar Foto" y "Cancelar"
- Manejo de errores con mensajes específicos

---

### Backend - users.js

**Endpoint nuevo**:
```javascript
router.post('/change-username', requireAuth, async (req, res, next) => {
  // Validaciones
  // Verificar contraseña
  // Verificar disponibilidad de username
  // Actualizar en BD
  // Retornar éxito
});
```

**Validaciones**:
- Longitud mínima (3 caracteres)
- Formato correcto (regex)
- Username no duplicado
- Contraseña correcta
- Conversión a lowercase

---

## 🧪 TESTING EN DIFERENTES NAVEGADORES

### Chrome/Edge (Recomendado)
- ✅ Acceso a cámara: Excelente
- ✅ MediaStream API: Completo
- ✅ Calidad de captura: Alta
- ✅ Permisos: Fácil gestión

### Firefox
- ✅ Acceso a cámara: Bueno
- ✅ MediaStream API: Completo
- ✅ Calidad de captura: Alta
- ⚠️ Puede requerir configuración adicional en about:config

### Safari (macOS/iOS)
- ✅ Acceso a cámara: Bueno
- ⚠️ Requiere HTTPS (incluso en desarrollo local con certificado)
- ✅ Calidad de captura: Alta
- ⚠️ En localhost puede funcionar sin HTTPS

### Mobile (Chrome/Safari)
- ✅ Acceso a cámara frontal/trasera
- ✅ Touch para capturar
- ✅ Responsive design
- ⚠️ Requiere HTTPS en producción

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### 1. Cámara no se activa
**Problema**: Click en "Usar cámara" no hace nada

**Soluciones**:
- Verificar que navegador tenga permisos
- Verificar que no esté bloqueado por extensiones
- Abrir DevTools → Console para ver errores
- Verificar que `navigator.mediaDevices` exista

### 2. Video congelado
**Problema**: Preview se congela después de un tiempo

**Soluciones**:
- Verificar que useEffect de limpieza funcione
- Verificar que stream.getTracks() se llame
- Revisar console para errores de stream

### 3. Foto se ve distorsionada
**Problema**: Imagen capturada tiene proporción incorrecta

**Soluciones**:
- Verificar que canvas.width = video.videoWidth
- Verificar que canvas.height = video.videoHeight
- No usar CSS para redimensionar canvas

### 4. Luz de cámara no se apaga
**Problema**: LED de cámara sigue encendido después de cerrar

**Soluciones**:
- Verificar que stopCamera() se llame
- Verificar que todos los tracks se detengan:
  ```javascript
  stream.getTracks().forEach(track => track.stop());
  ```
- Verificar useEffect de limpieza

### 5. Username no se actualiza en la UI
**Problema**: Cambio exitoso pero no se ve reflejado

**Soluciones**:
- Verificar actualización de localStorage
- Verificar recarga de página (window.location.reload)
- Verificar que componentes usen user del localStorage

### 6. Error "Username ya en uso" aunque esté disponible
**Problema**: Backend rechaza username válido

**Soluciones**:
- Verificar conversión a lowercase en frontend y backend
- Verificar query de MongoDB con collation
- Verificar que no se compare con el mismo usuario

---

## 📊 RESULTADOS ESPERADOS

### Después de Cambio de Username:
1. ✅ URL del perfil cambia de `/u/viejo` a `/u/nuevo`
2. ✅ Header muestra `@nuevo`
3. ✅ Settings muestra `@nuevo`
4. ✅ Publicaciones muestran `@nuevo`
5. ✅ Búsqueda encuentra por nuevo username
6. ✅ Login funciona con nuevo username

### Después de Cambio de Foto:
1. ✅ Avatar en header actualizado
2. ✅ Foto en perfil actualizada
3. ✅ Foto en publicaciones actualizada
4. ✅ Foto en comentarios actualizada
5. ✅ Foto en mensajes actualizada

### Después de Captura de Cámara:
1. ✅ Foto capturada con calidad alta (JPEG 95%)
2. ✅ Tamaño apropiado (1280x720 o resolución de cámara)
3. ✅ Filtros aplicables a foto capturada
4. ✅ Face detection funciona en foto capturada
5. ✅ Publicación exitosa

---

## 🚀 COMANDOS PARA TESTING

### Iniciar Frontend:
```bash
cd frontend
npm run dev
```

### Iniciar Backend:
```bash
cd backend
node server.js
```

### Verificar permisos de cámara (Chrome DevTools):
```
chrome://settings/content/camera
```

### Resetear permisos de sitio:
```
Click en candado (🔒) en barra de URL
→ Permisos del sitio
→ Restablecer permisos
```

---

## ✅ CHECKLIST FINAL

Antes de marcar como completado, verificar:

### Settings - Foto de Perfil:
- [ ] Modal de selección abre correctamente
- [ ] Preview funciona
- [ ] Upload exitoso
- [ ] Foto actualizada en toda la app
- [ ] Sin errores en consola

### Settings - Username:
- [ ] Validación de formato funciona
- [ ] Verificación de disponibilidad funciona
- [ ] Verificación de contraseña funciona
- [ ] Actualización exitosa en BD
- [ ] Actualización visible en toda la app
- [ ] Recarga automática después de cambio

### Settings - Contraseña:
- [ ] Verificación de contraseña actual funciona
- [ ] Validación de longitud funciona
- [ ] Confirmación de contraseña funciona
- [ ] Cambio exitoso
- [ ] Login con nueva contraseña funciona

### Cámara:
- [ ] Permisos solicitados correctamente
- [ ] Preview en vivo funciona
- [ ] Captura guarda imagen correctamente
- [ ] Calidad de imagen es buena
- [ ] Filtros aplicables
- [ ] Face detection funciona
- [ ] Publicación exitosa
- [ ] Stream se limpia correctamente
- [ ] Sin memory leaks
- [ ] Funciona en Chrome
- [ ] Funciona en Firefox
- [ ] Funciona en mobile

---

**Última actualización**: Octubre 19, 2025  
**Responsable**: Equipo de Desarrollo RED-O

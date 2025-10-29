# 🔧 Configuración de Google OAuth

## ⚠️ Error Actual

```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

Este error ocurre porque el origen `http://localhost:5173` no está autorizado en Google Cloud Console.

---

## ✅ Solución: Configurar Orígenes Autorizados

### Paso 1: Acceder a Google Cloud Console

1. Ve a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Inicia sesión con la cuenta de Google que creó el proyecto

### Paso 2: Encontrar tu Client ID

Busca el Client ID que tienes configurado:
```
407408718192.apps.googleusercontent.com
```

### Paso 3: Editar las Credenciales

1. Haz clic en el Client ID
2. En la sección **"Orígenes de JavaScript autorizados"**, agrega:
   - `http://localhost:5173` (Vite dev server)
   - `http://localhost:3000` (Opcional, por si cambias el puerto)
   - `http://127.0.0.1:5173` (Opcional, pero recomendado)

3. En la sección **"URIs de redirección autorizadas"**, agrega:
   - `http://localhost:5173`
   - `http://localhost:3000`

### Paso 4: Guardar Cambios

1. Haz clic en **"Guardar"**
2. Espera unos segundos (puede tardar hasta 5 minutos en propagarse)
3. Recarga tu aplicación

---

## 🔄 Alternativa: Crear Nuevo Client ID

Si no tienes acceso al Client ID existente, crea uno nuevo:

### 1. Crear Credenciales OAuth 2.0

1. Ve a [Credentials](https://console.cloud.google.com/apis/credentials)
2. Clic en **"+ CREATE CREDENTIALS"**
3. Selecciona **"OAuth client ID"**
4. Tipo de aplicación: **"Web application"**
5. Nombre: `Red-O Instagram Local Dev`

### 2. Configurar Orígenes

**Orígenes de JavaScript autorizados:**
```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
```

**URIs de redirección autorizadas:**
```
http://localhost:5173
http://localhost:3000
```

### 3. Copiar el Client ID

Copia el Client ID generado (formato: `XXXXXXXXX.apps.googleusercontent.com`)

### 4. Actualizar .env

Edita el archivo `frontend/.env`:
```properties
VITE_API=http://localhost:3002/api
VITE_GOOGLE_CLIENT_ID=TU_NUEVO_CLIENT_ID_AQUI.apps.googleusercontent.com
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

---

## 🔓 Habilitar Google Login en la App

Una vez configurado correctamente en Google Cloud Console:

### Editar `frontend/src/components/Login.jsx`

Descomenta las líneas 295-307:

```jsx
// Busca este comentario y descomenta el código
{/* TODO: Configurar orígenes autorizados en Google Cloud Console */}
{/* Para habilitar: Agregar http://localhost:5173 en https://console.cloud.google.com/apis/credentials */}
{/*
<div style={{width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 18}}>
  <GoogleLogin
    onSuccess={handleGoogleLoginSuccess}
    onError={handleGoogleLoginError}
    theme="outline"
    size="large"
    text="signin_with"
    shape="pill"
    width="300px"
  />
</div>
*/}
```

Reemplazar con:

```jsx
<div style={{width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 18}}>
  <GoogleLogin
    onSuccess={handleGoogleLoginSuccess}
    onError={handleGoogleLoginError}
    theme="outline"
    size="large"
    text="signin_with"
    shape="pill"
    width="300px"
  />
</div>
```

Y **eliminar** el mensaje de advertencia amarillo que está debajo.

---

## 🧪 Verificar la Configuración

### 1. Reinicia el servidor de desarrollo

```bash
npm start
```

### 2. Abre la aplicación

```
http://localhost:5173
```

### 3. Verifica en la consola del navegador

No deberían aparecer errores relacionados con Google OAuth.

### 4. Prueba el botón "Sign in with Google"

Debería abrir el popup de autenticación de Google sin errores.

---

## 📝 Notas Importantes

- **Producción**: Cuando despliegues a producción, deberás agregar tu dominio real a los orígenes autorizados
- **HTTPS**: En producción, Google OAuth requiere HTTPS (no HTTP)
- **Dominios múltiples**: Puedes agregar múltiples orígenes (local, staging, production)
- **Client Secret**: No incluyas el Client Secret en el frontend, solo el Client ID

---

## 🆘 Troubleshooting

### Error persiste después de configurar

1. Limpia caché del navegador (Ctrl + Shift + Delete)
2. Cierra y abre el navegador
3. Espera 5-10 minutos (propagación de Google)
4. Verifica que el Client ID en `.env` sea exactamente el mismo que en Google Cloud Console

### No tienes acceso al proyecto de Google Cloud

Contacta al propietario del proyecto o crea tu propio proyecto de Google Cloud y genera tus propias credenciales OAuth.

---

## 📚 Documentación Oficial

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/gsi/web)
- [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)

# Resumen de Cambios - Última Semana

## Backend
- Se agregó y unificó el endpoint `/api/auth/login` para aceptar usuario o correo electrónico (campo `identifier`) y contraseña.
- Se corrigió la validación y el flujo de login en ambos archivos: `auth.js` (producción) y `auth.dev.js` (desarrollo).
- Se agregó el endpoint protegido `/api/auth/me` para obtener los datos del usuario autenticado mediante JWT.
- Se corrigió el orden de declaración de `router` en ambos archivos de rutas para evitar errores de inicialización.
- Se mejoró la validación de registro, exigiendo los campos: `email`, `username`, `name` y `password`.
- Se ajustó la configuración de CORS para permitir cualquier origen.
- Se agregó el campo `author: carlos s` en los `package.json` de backend y frontend.

## Frontend
- El formulario de login ahora permite ingresar usuario o correo electrónico en el mismo campo (`identifier`).
- Se eliminó la validación estricta de email en el login.
- Se actualizó la petición de login para enviar el campo `identifier`.

## Pruebas y Documentación
- Se proporcionaron ejemplos y markdown para probar registro, login y verificación de token JWT desde Postman.
- Se corrigieron instrucciones para el uso correcto de los endpoints y headers.

## Otros
- Se revisó y mejoró el flujo de autenticación y validación de tokens.
- Se solucionaron errores 404 y 401 relacionados con rutas y autenticación.

---

**Fecha de corte:** 17 de septiembre de 2025

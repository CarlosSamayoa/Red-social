# 📚 Documentación de Red-O

Esta carpeta contiene toda la documentación del proyecto organizada por categorías.

## 📁 Estructura de Documentación

### 🚀 Deployment
Guías y recursos para desplegar la aplicación en producción.

- **[GCP_DEPLOYMENT.md](deployment/GCP_DEPLOYMENT.md)** - Guía completa de Google Cloud Platform
  - 3 opciones de MongoDB (Compute Engine, Cloud Run, Atlas)
  - Configuración paso a paso
  - Scripts automatizados
  - Troubleshooting

- **[QUICK_DEPLOY_GCP.md](deployment/QUICK_DEPLOY_GCP.md)** - Deploy en 5 minutos
  - Pasos rápidos para deployment
  - Comandos esenciales
  - Verificación rápida

- **[DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md)** - Lista de verificación completa
  - Pre-deployment
  - Durante deployment
  - Post-deployment
  - Mantenimiento

- **[DEPLOYMENT_SUMMARY.md](deployment/DEPLOYMENT_SUMMARY.md)** - Resumen ejecutivo
  - Arquitectura final
  - Costos estimados
  - Recursos preparados

- **[LOCAL_DEVELOPMENT.md](deployment/LOCAL_DEVELOPMENT.md)** - Desarrollo local
  - Configuración inicial
  - Variables de entorno
  - Comandos útiles
  - Debugging

- **[AWS_DEPLOYMENT.md](deployment/AWS_DEPLOYMENT.md)** - Alternativa con AWS
  - Lambda + S3 + DocumentDB
  - Serverless Framework
  - Comparación con GCP

- **[SETUP_COMPLETO.md](deployment/SETUP_COMPLETO.md)** - Setup general del proyecto
- **[QUICK_START.md](deployment/QUICK_START.md)** - Inicio rápido original
- **[CONFIGURAR_GOOGLE_OAUTH.md](deployment/CONFIGURAR_GOOGLE_OAUTH.md)** - Configuración OAuth

### ✨ Features
Documentación de características implementadas.

- **[DOCUMENTACION_AUTENTICACION.md](features/DOCUMENTACION_AUTENTICACION.md)** - Sistema de autenticación
  - JWT tokens
  - Google OAuth
  - reCAPTCHA
  - Seguridad

- **[MULTIPLE_MEDIA_IMPLEMENTATION.md](features/MULTIPLE_MEDIA_IMPLEMENTATION.md)** - Upload multimedia
  - Múltiples archivos
  - Imágenes y videos
  - Filtros de imagen
  - Procesamiento con Sharp

- **[MODERNIZACION_FRONTEND.md](features/MODERNIZACION_FRONTEND.md)** - UI/UX moderna
  - Modo oscuro
  - Diseño responsive
  - Animaciones
  - Componentes modernos

### 📝 Changelog
Historial de cambios, correcciones y mejoras.

- **[CAMBIOS_SEMANA.md](changelog/CAMBIOS_SEMANA.md)** - Cambios semanales
- **[CAMBIOS_SETTINGS_CAMERA.md](changelog/CAMBIOS_SETTINGS_CAMERA.md)** - Cambios en Settings y Cámara
- **[CHECKLIST_SETTINGS_CAMERA.md](changelog/CHECKLIST_SETTINGS_CAMERA.md)** - Checklist de verificación
- **[CORRECCIONES_CHAT_NAVEGACION_MODO_OSCURO.md](changelog/CORRECCIONES_CHAT_NAVEGACION_MODO_OSCURO.md)** - Fixes de chat y navegación
- **[CORRECCIONES_DISEÑO.md](changelog/CORRECCIONES_DISEÑO.md)** - Correcciones de diseño
- **[CORRECCIONES_FILTROS_MODO_OSCURO.md](changelog/CORRECCIONES_FILTROS_MODO_OSCURO.md)** - Fixes de filtros
- **[CORRECCIONES_MENSAJES_MODO_OSCURO.md](changelog/CORRECCIONES_MENSAJES_MODO_OSCURO.md)** - Fixes de mensajería
- **[CORRECCIONES_MODO_OSCURO_FILTROS.md](changelog/CORRECCIONES_MODO_OSCURO_FILTROS.md)** - Fixes modo oscuro
- **[FIX_IMAGEN_PERFIL.md](changelog/FIX_IMAGEN_PERFIL.md)** - Fix de imagen de perfil
- **[FIX_PROFILE_IMAGE_FIELD.md](changelog/FIX_PROFILE_IMAGE_FIELD.md)** - Fix de campo profile_image
- **[MEJORAS_IMPLEMENTADAS.md](changelog/MEJORAS_IMPLEMENTADAS.md)** - Mejoras generales
- **[RESUMEN_EJECUTIVO_19_OCT.md](changelog/RESUMEN_EJECUTIVO_19_OCT.md)** - Resumen ejecutivo octubre
- **[PROYECTO_COMPLETADO.md](changelog/PROYECTO_COMPLETADO.md)** - Hitos del proyecto

### 📄 General
Documentación técnica y requisitos.

- **[DOCUMENTACION_TECNICA.md](DOCUMENTACION_TECNICA.md)** - Documentación técnica completa
  - Arquitectura del sistema
  - Stack tecnológico
  - APIs y endpoints
  - Modelos de datos

- **[CUMPLIMIENTO_REQUISITOS.md](CUMPLIMIENTO_REQUISITOS.md)** - Cumplimiento de requisitos académicos
  - Requisitos funcionales
  - Requisitos no funcionales
  - Checklist de entrega

---

## 🔍 Navegación Rápida

### Para Comenzar
1. Leer [README principal](../README.md)
2. Configurar desarrollo local: [LOCAL_DEVELOPMENT.md](deployment/LOCAL_DEVELOPMENT.md)
3. Probar la aplicación localmente

### Para Desplegar
1. Revisar [QUICK_DEPLOY_GCP.md](deployment/QUICK_DEPLOY_GCP.md)
2. Seguir [DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md)
3. Consultar [GCP_DEPLOYMENT.md](deployment/GCP_DEPLOYMENT.md) para detalles

### Para Entender el Sistema
1. Leer [DOCUMENTACION_TECNICA.md](DOCUMENTACION_TECNICA.md)
2. Revisar [DOCUMENTACION_AUTENTICACION.md](features/DOCUMENTACION_AUTENTICACION.md)
3. Ver características en carpeta `features/`

### Para Troubleshooting
1. Consultar [GCP_DEPLOYMENT.md](deployment/GCP_DEPLOYMENT.md) - Sección "Solución de Problemas"
2. Revisar logs en `changelog/` para ver fixes anteriores
3. Verificar [DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md)

---

## 📊 Estadísticas de Documentación

- **Total de documentos**: 29 archivos .md
- **Guías de deployment**: 9
- **Documentación de features**: 3
- **Historial de cambios**: 13
- **Documentación técnica**: 2
- **README principal**: 1

---

Última actualización: Octubre 2025

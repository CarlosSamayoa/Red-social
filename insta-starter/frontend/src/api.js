// Configuración de API - usa variable de entorno o localhost
export const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API || 'http://localhost:3002/api';

// URL base para archivos estáticos
// En producción (GCP), los archivos están en Cloud Storage
// En desarrollo, están en /static del servidor local
const getStaticUrl = () => {
  if (import.meta.env.VITE_STATIC_URL) {
    return import.meta.env.VITE_STATIC_URL;
  }
  // Derivar STATIC desde API para desarrollo local
  const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API || 'http://localhost:3002/api';
  return apiBase.replace('/api', '/static');
};

export const STATIC = getStaticUrl();

// URL base para imágenes de Cloud Storage (solo en producción)
export const GCS_IMAGES = import.meta.env.VITE_GCS_IMAGES_URL || '';

export function authHeaders() {
  const t = localStorage.getItem('token') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}
export async function getJSON(path) {
  const r = await fetch(`${API}${path}`, { headers: { ...authHeaders() } });
  if (!r.ok) {
    if (r.status === 401) {
      // Token inválido - limpiar y redirigir
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('uid');
      console.warn('Token inválido detectado - limpiando almacenamiento local');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Intentar parsear JSON, si falla usar mensaje genérico
    const text = await r.text();
    let errorMessage = `Error ${r.status}: ${r.statusText}`;
    
    try {
      const errorData = JSON.parse(text);
      // Extraer solo el mensaje, nunca el objeto completo
      if (errorData.message && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error && typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch (parseError) {
      // Si no es JSON válido, usar el texto solo si es corto
      if (text.length > 0 && text.length < 200 && !text.includes('<html')) {
        errorMessage = text;
      }
    }
    
    throw new Error(errorMessage);
  }
  return r.json();
}
export async function postForm(path, formData) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { ...authHeaders() }, body: formData });
  if (!r.ok) {
    if (r.status === 401) {
      // Token inválido - limpiar y redirigir
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('uid');
      console.warn('Token inválido detectado - limpiando almacenamiento local');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Intentar parsear JSON, si falla usar mensaje genérico
    const text = await r.text();
    let errorMessage = `Error ${r.status}: ${r.statusText}`;
    
    try {
      const errorData = JSON.parse(text);
      // Extraer solo el mensaje, nunca el objeto completo
      if (errorData.message && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error && typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch (parseError) {
      // Si no es JSON válido, usar el texto solo si es corto
      if (text.length > 0 && text.length < 200 && !text.includes('<html')) {
        errorMessage = text;
      }
    }
    
    throw new Error(errorMessage);
  }
  return r.json();
}
export async function postJSON(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
  if (!r.ok) {
    if (r.status === 401) {
      // Token inválido - limpiar y redirigir
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('uid');
      console.warn('Token inválido detectado - limpiando almacenamiento local');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Intentar parsear JSON, si falla usar mensaje genérico
    const text = await r.text();
    let errorMessage = `Error ${r.status}: ${r.statusText}`;
    
    try {
      const errorData = JSON.parse(text);
      console.log('🔍 Error recibido del servidor:', errorData);
      
      // Extraer solo el mensaje, nunca el objeto completo
      if (errorData.message && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error && typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch (parseError) {
      // Si no es JSON válido, usar el texto solo si es corto
      if (text.length > 0 && text.length < 200 && !text.includes('<html')) {
        errorMessage = text;
      }
    }
    
    throw new Error(errorMessage);
  }
  return r.json();
}

export async function deleteJSON(path) {
  const r = await fetch(`${API}${path}`, { 
    method: 'DELETE', 
    headers: { ...authHeaders() } 
  });
  if (!r.ok) {
    if (r.status === 401) {
      // Token inválido - limpiar y redirigir
      localStorage.removeItem('token');
      console.warn('Token inválido detectado - limpiando almacenamiento local');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    // Intentar parsear JSON, si falla usar mensaje genérico
    const text = await r.text();
    try {
      const errorData = JSON.parse(text);
      // Priorizar 'message' sobre 'error' porque 'error' puede ser un código
      throw new Error(errorData.message || errorData.error || `Error ${r.status}`);
    } catch (parseError) {
      // Si no es JSON válido, usar el texto o un mensaje genérico
      throw new Error(text.length < 200 ? text : `Error ${r.status}: ${r.statusText}`);
    }
  }
  return r.json();
}

// Función para construir URL de imagen
// Si la URL ya es completa (https://), devolverla tal cual
// Si es relativa (/static/...), usar el servidor de API
// Si viene de GCS (https://storage.googleapis.com/...), devolverla tal cual
export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path; // URL completa
  }
  // If a GCS images base URL is configured, prefer it (production)
  if (GCS_IMAGES) {
    // Ensure no duplicate slashes
    const base = GCS_IMAGES.replace(/\/$/, '');
    // remove leading /static/ if present
    const relative = path.replace(/^\/static\//, '');
    return `${base}/${relative}`;
  }

  if (path.startsWith('/static/')) {
    return STATIC.replace('/static', '') + path; // URL relativa al servidor
  }

  return path; // Devolver tal cual por seguridad
}

// Función para limpiar autenticación
export function clearAuth() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

// Función para verificar si hay token
export function hasToken() {
  return !!localStorage.getItem('token');
}

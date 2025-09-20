const API = import.meta.env.VITE_API || 'http://localhost:3001/api';
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
    throw new Error(await r.text());
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
    throw new Error(await r.text());
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
    throw new Error(await r.text());
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
    throw new Error(await r.text());
  }
  return r.json();
}

export const STATIC = 'http://localhost:3001/static';

// Función para limpiar autenticación
export function clearAuth() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

// Función para verificar si hay token
export function hasToken() {
  return !!localStorage.getItem('token');
}

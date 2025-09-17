import { getIdToken } from './auth/cognito';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function authFetch(path, options = {}) {
  const token = getIdToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json');
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

import axios from 'axios';

const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Axios client with auth interceptor
export const apiClient = axios.create({
  baseURL: base,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Legacy fetch-based request function for backward compatibility
async function req(p, o = {}) {
  const res = await fetch(base + p, { headers: { 'Content-Type': 'application/json' }, ...o });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const login = (b) => req('/auth/login', { method: 'POST', body: JSON.stringify(b) });
export const feed = (page = 0) => req('/feed?page=' + page);
export const search = (q) => req('/search?q=' + encodeURIComponent(q));
export const listScripts = (p = 0) => req('/scripts?page=' + p);
export const getScript = (id) => req('/scripts/' + id);
export const createScript = (d) => req('/scripts', { method: 'POST', body: JSON.stringify(d) });
export const listAuditions = (p = 0) => req('/auditions?page=' + p);
export const getAudition = (id) => req('/auditions/' + id);
export const createAudition = (d) => req('/auditions', { method: 'POST', body: JSON.stringify(d) });
export const requestAccess = (scriptId, userId) => req('/requests', { method: 'POST', body: JSON.stringify({ scriptId, requesterId: userId }) });
export const listRequests = () => req('/requests');
export const listComments = (sid) => req('/scripts/' + sid + '/comments');
export const postComment = (sid, body) => req('/scripts/' + sid + '/comments', { method: 'POST', body: JSON.stringify(body) });
export const listNotifications = (userId) => req('/notifications?userId=' + userId);
export const listMessages = (room) => req('/messages?room=' + room);
export const postMessage = (msg) => req('/messages', { method: 'POST', body: JSON.stringify(msg) });

export const likeScript = (id, userId) => req(`/scripts/${id}/like`, { method: 'POST', body: JSON.stringify({ userId }) });
export const followUser = (id, userId) => req(`/users/${id}/follow`, { method: 'POST', body: JSON.stringify({ userId }) });

// Update a user's profile. Accepts the user id and partial data to merge.
export const updateUser = (id, data) =>
  req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export default apiClient;

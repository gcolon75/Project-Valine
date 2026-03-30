// Admin service — allowlist management
import { apiClient } from './api.js';

export const getAllowedEmails = () => apiClient.get('/admin/allowed-emails').then(r => r.data);

export const addAllowedEmail = (email) =>
  apiClient.post('/admin/allowed-emails', { email }).then(r => r.data);

export const removeAllowedEmail = (email) =>
  apiClient.delete(`/admin/allowed-emails/${encodeURIComponent(email)}`).then(r => r.data);

// Admin service — allowlist management
import { apiClient } from './api.js';

export const getAllowedEmails = () => apiClient.get('/admin/allowed-emails');

export const addAllowedEmail = (email) =>
  apiClient.post('/admin/allowed-emails', { email });

export const removeAllowedEmail = (email) =>
  apiClient.delete(`/admin/allowed-emails/${encodeURIComponent(email)}`);

import { apiClient } from './api.js';

export const submitWaitlist = (data) =>
  apiClient.post('/waitlist', data).then(r => r.data);

export const getWaitlist = () =>
  apiClient.get('/admin/waitlist').then(r => r.data);

export const updateWaitlistStatus = (id, status) =>
  apiClient.patch(`/admin/waitlist/${id}`, { status }).then(r => r.data);

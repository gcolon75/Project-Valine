import { apiClient } from './api.js';

/**
 * POST /script-feedback — writer submits a new request
 * Returns { checkoutUrl, requestId }. Caller redirects to checkoutUrl.
 */
export const submitFeedbackRequest = async ({ title, scriptUrl, pageCount, useFreeEval }) => {
  const { data } = await apiClient.post('/script-feedback', {
    title,
    scriptUrl,
    pageCount,
    useFreeEval: !!useFreeEval,
  });
  return data;
};

/**
 * GET /script-feedback?role=mine|available|mine-as-reader|admin
 */
export const listFeedbackRequests = async (role = 'mine') => {
  const { data } = await apiClient.get('/script-feedback', { params: { role } });
  return data?.requests ?? [];
};

export const getFeedbackRequest = async (id) => {
  const { data } = await apiClient.get(`/script-feedback/${id}`);
  return data?.request;
};

export const approveFeedbackRequest = async (id) => {
  const { data } = await apiClient.post(`/script-feedback/${id}/approve`);
  return data?.request;
};

export const denyFeedbackRequest = async (id, reason) => {
  const { data } = await apiClient.post(`/script-feedback/${id}/deny`, { reason });
  return data?.request;
};

export const acceptFeedbackRequest = async (id) => {
  const { data } = await apiClient.post(`/script-feedback/${id}/accept`);
  return data?.request;
};

export const submitFeedbackNotes = async (id, summaryNotes) => {
  const { data } = await apiClient.post(`/script-feedback/${id}/submit-notes`, { summaryNotes });
  return data?.request;
};

// Annotations
export const listFeedbackAnnotations = async (id) => {
  const { data } = await apiClient.get(`/script-feedback/${id}/annotations`);
  return data?.annotations ?? [];
};

export const createFeedbackAnnotation = async (id, annotation) => {
  const { data } = await apiClient.post(`/script-feedback/${id}/annotations`, annotation);
  return data?.annotation;
};

export const updateFeedbackAnnotation = async (annotationId, patch) => {
  const { data } = await apiClient.put(`/script-feedback/annotations/${annotationId}`, patch);
  return data?.annotation;
};

export const deleteFeedbackAnnotation = async (annotationId) => {
  await apiClient.delete(`/script-feedback/annotations/${annotationId}`);
};

// Admin reader management
export const adminListReaders = async () => {
  const { data } = await apiClient.get('/script-feedback/admin/readers');
  return data?.readers ?? [];
};

export const adminSearchUsers = async (q) => {
  const { data } = await apiClient.get('/script-feedback/admin/users', { params: { q } });
  return data?.users ?? [];
};

export const adminSetReader = async (userId, isReader) => {
  const { data } = await apiClient.post(`/script-feedback/admin/readers/${userId}`, { isReader });
  return data?.user;
};

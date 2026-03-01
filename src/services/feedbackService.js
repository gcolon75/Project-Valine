import api from './api';

// Request to give feedback on a post
export const requestFeedback = async (postId, message = '') => {
  const response = await api.post(`/posts/${postId}/feedback-request`, { message });
  return response.data;
};

// Get the current user's feedback status for a post
export const getFeedbackStatus = async (postId) => {
  const response = await api.get(`/posts/${postId}/feedback-status`);
  return response.data;
};

// List feedback requests (sent or received)
export const listFeedbackRequests = async ({ type = 'received', status = null } = {}) => {
  const params = new URLSearchParams({ type });
  if (status) params.append('status', status);
  const response = await api.get(`/feedback-requests?${params.toString()}`);
  return response.data;
};

// Get a single feedback request with full details
export const getFeedbackRequest = async (requestId) => {
  const response = await api.get(`/feedback-requests/${requestId}`);
  return response.data;
};

// Approve a feedback request (owner only)
export const approveFeedbackRequest = async (requestId, response = '') => {
  const res = await api.post(`/feedback-requests/${requestId}/approve`, { response });
  return res.data;
};

// Deny a feedback request (owner only)
export const denyFeedbackRequest = async (requestId, response = '') => {
  const res = await api.post(`/feedback-requests/${requestId}/deny`, { response });
  return res.data;
};

// Get all annotations for a feedback request
export const getAnnotations = async (feedbackRequestId) => {
  const response = await api.get(`/feedback-requests/${feedbackRequestId}/annotations`);
  return response.data;
};

// Create a new annotation
export const createAnnotation = async (feedbackRequestId, annotation) => {
  const response = await api.post(`/feedback-requests/${feedbackRequestId}/annotations`, annotation);
  return response.data;
};

// Update an annotation
export const updateAnnotation = async (annotationId, updates) => {
  const response = await api.put(`/annotations/${annotationId}`, updates);
  return response.data;
};

// Delete an annotation
export const deleteAnnotation = async (annotationId) => {
  const response = await api.delete(`/annotations/${annotationId}`);
  return response.data;
};

export default {
  requestFeedback,
  getFeedbackStatus,
  listFeedbackRequests,
  getFeedbackRequest,
  approveFeedbackRequest,
  denyFeedbackRequest,
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
};

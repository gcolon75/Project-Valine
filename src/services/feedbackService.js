import { apiClient } from './api.js';

// Request to give feedback on a post
export const requestFeedback = async (postId, message = '') => {
  const { data } = await apiClient.post(`/posts/${postId}/feedback-request`, { message });
  return data;
};

// Get the current user's feedback status for a post
export const getFeedbackStatus = async (postId) => {
  const { data } = await apiClient.get(`/posts/${postId}/feedback-status`);
  return data;
};

// List feedback requests (sent or received)
export const listFeedbackRequests = async ({ type = 'received', status = null } = {}) => {
  const params = new URLSearchParams({ type });
  if (status) params.append('status', status);
  const { data } = await apiClient.get(`/feedback-requests?${params.toString()}`);
  return data;
};

// Get a single feedback request with full details
export const getFeedbackRequest = async (requestId) => {
  const { data } = await apiClient.get(`/feedback-requests/${requestId}`);
  return data;
};

// Approve a feedback request (owner only)
export const approveFeedbackRequest = async (requestId, responseMsg = '') => {
  const { data } = await apiClient.post(`/feedback-requests/${requestId}/approve`, { response: responseMsg });
  return data;
};

// Deny a feedback request (owner only)
export const denyFeedbackRequest = async (requestId, responseMsg = '') => {
  const { data } = await apiClient.post(`/feedback-requests/${requestId}/deny`, { response: responseMsg });
  return data;
};

// Get all annotations for a feedback request
export const getAnnotations = async (feedbackRequestId) => {
  const { data } = await apiClient.get(`/feedback-requests/${feedbackRequestId}/annotations`);
  return data;
};

// Create a new annotation
export const createAnnotation = async (feedbackRequestId, annotation) => {
  const { data } = await apiClient.post(`/feedback-requests/${feedbackRequestId}/annotations`, annotation);
  return data;
};

// Update an annotation
export const updateAnnotation = async (annotationId, updates) => {
  const { data } = await apiClient.put(`/annotations/${annotationId}`, updates);
  return data;
};

// Delete an annotation
export const deleteAnnotation = async (annotationId) => {
  const { data } = await apiClient.delete(`/annotations/${annotationId}`);
  return data;
};

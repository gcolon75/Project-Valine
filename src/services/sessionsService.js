// src/services/sessionsService.js
import apiClient from './api';

/**
 * Get all active sessions for the current user
 * @returns {Promise<{sessions: Array}>} List of active sessions
 */
export const getSessions = async () => {
  const { data } = await apiClient.get('/privacy/sessions');
  return data;
};

/**
 * Revoke/terminate a specific session
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const revokeSession = async (sessionId) => {
  const { data } = await apiClient.delete(`/privacy/sessions/${sessionId}`);
  return data;
};

/**
 * Check if session tracking is enabled
 * Helper to determine if sessions feature should be shown
 * @returns {boolean}
 */
export const isSessionTrackingEnabled = () => {
  return import.meta.env.VITE_USE_SESSION_TRACKING === 'true';
};

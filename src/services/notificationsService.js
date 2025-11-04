// src/services/notificationsService.js
import apiClient from './api';

/**
 * Get user notifications
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of notifications
 * @param {string} params.cursor - Pagination cursor
 * @param {string} params.type - Filter by notification type
 * @param {boolean} params.unreadOnly - Only unread notifications
 * @returns {Promise} Notifications data
 */
export const getNotifications = async (params = {}) => {
  const {
    limit = 50,
    cursor = null,
    type = null,
    unreadOnly = false
  } = params;
  
  const queryParams = { limit };
  if (cursor) queryParams.cursor = cursor;
  if (type) queryParams.type = type;
  if (unreadOnly) queryParams.unreadOnly = true;
  
  const { data } = await apiClient.get('/notifications', { params: queryParams });
  return data;
};

/**
 * Mark notification as read
 * @param {string} id - Notification ID
 * @returns {Promise} Updated notification
 */
export const markNotificationRead = async (id) => {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data;
};

/**
 * Mark all notifications as read
 * @returns {Promise} Success response
 */
export const markAllNotificationsRead = async () => {
  const { data } = await apiClient.patch('/notifications/read-all');
  return data;
};

/**
 * Delete a notification
 * @param {string} id - Notification ID
 * @returns {Promise} Success response
 */
export const deleteNotification = async (id) => {
  const { data } = await apiClient.delete(`/notifications/${id}`);
  return data;
};

/**
 * Get unread notification count
 * @returns {Promise} Count object
 */
export const getUnreadCount = async () => {
  const { data } = await apiClient.get('/notifications/unread-count');
  return data;
};

/**
 * Get unread counts for notifications and messages
 * @returns {Promise<{notifications: number, messages: number}>}
 */
export const getUnreadCounts = async () => {
  const { data } = await apiClient.get('/unread-counts');
  return data;
};

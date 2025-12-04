import { apiClient } from './api.js';

/**
 * Connection/Follow Service
 * Handles following, followers, and follow requests
 */

/**
 * Get pending follow requests for the current user.
 * Returns requests where other users want to follow the authenticated user.
 * Authentication is handled via the auth token, so no userId parameter is needed.
 * @returns {Promise<Object>} Object containing requests array
 */
export const getConnectionRequests = async () => {
  const { data } = await apiClient.get('/connections/requests');
  return data;
};

/**
 * Send a follow request to a user (for private profiles)
 * @param {string} targetUserId - User ID to send request to
 */
export const sendConnectionRequest = async (targetUserId) => {
  const { data } = await apiClient.post('/connections/request', { targetUserId });
  return data;
};

/**
 * Approve a follow request
 * @param {string} requestId - Request ID to approve
 */
export const approveRequest = async (requestId) => {
  const { data } = await apiClient.post(`/connections/requests/${requestId}/approve`);
  return data;
};

/**
 * Reject a follow request
 * @param {string} requestId - Request ID to reject
 */
export const rejectRequest = async (requestId) => {
  const { data } = await apiClient.post(`/connections/requests/${requestId}/reject`);
  return data;
};

/**
 * Follow a user directly (for public profiles)
 * @param {string} targetUserId - User ID to follow
 */
export const followUser = async (targetUserId) => {
  const { data } = await apiClient.post('/connections/follow', { targetUserId });
  return data;
};

/**
 * Unfollow a user
 * @param {string} targetUserId - User ID to unfollow
 */
export const unfollowUser = async (targetUserId) => {
  const { data } = await apiClient.post('/connections/unfollow', { targetUserId });
  return data;
};

/**
 * Get connection/follow status with a user
 * @param {string} targetUserId - User ID to check
 * @returns {Object} { isFollowing, isFollowedBy, requestPending, requestSent }
 */
export const getConnectionStatus = async (targetUserId) => {
  const { data } = await apiClient.get(`/connections/status/${targetUserId}`);
  return data;
};

/**
 * Get followers list for a user
 * @param {string} userId - User ID (optional, defaults to current user)
 */
export const getFollowers = async (userId) => {
  const params = userId ? { userId } : {};
  const { data } = await apiClient.get('/connections/followers', { params });
  return data;
};

/**
 * Get following list for a user
 * @param {string} userId - User ID (optional, defaults to current user)
 */
export const getFollowing = async (userId) => {
  const params = userId ? { userId } : {};
  const { data } = await apiClient.get('/connections/following', { params });
  return data;
};

/**
 * Follow back a user who follows you (after accepting their request)
 * @param {string} targetUserId - User ID to follow back
 */
export const followBack = async (targetUserId) => {
  // Follow back is just a follow action
  return followUser(targetUserId);
};

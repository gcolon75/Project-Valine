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
  return {
    isFollowing: !!data?.isFollowing,
    isFollowedBy: !!data?.isFollowedBy,
    requestPending: data?.requestPending ?? false,
    requestSent: data?.requestSent ?? false,
  };
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

// ========== NEW SOCIAL GRAPH FUNCTIONS ==========

/**
 * Follow a user by profile ID
 * @param {string} profileId - Profile ID to follow
 * @returns {Promise<Object>} { isFollowing, message }
 */
export const followProfile = async (profileId) => {
  const { data } = await apiClient.post(`/profiles/${profileId}/follow`);
  return data;
};

/**
 * Unfollow a user by profile ID
 * @param {string} profileId - Profile ID to unfollow
 * @returns {Promise<Object>} { isFollowing, message }
 */
export const unfollowProfile = async (profileId) => {
  const { data } = await apiClient.delete(`/profiles/${profileId}/follow`);
  return data;
};

/**
 * Get followers list for a profile
 * @param {string} profileId - Profile ID
 * @returns {Promise<Object>} { items, count }
 */
export const getProfileFollowers = async (profileId) => {
  const { data } = await apiClient.get(`/profiles/${profileId}/followers`);
  return data;
};

/**
 * Get following list for a profile
 * @param {string} profileId - Profile ID
 * @returns {Promise<Object>} { items, count }
 */
export const getProfileFollowing = async (profileId) => {
  const { data } = await apiClient.get(`/profiles/${profileId}/following`);
  return data;
};

/**
 * Get current user's followers
 * @returns {Promise<Object>} { items, count }
 */
export const getMyFollowers = async () => {
  const { data } = await apiClient.get('/me/followers');
  return data;
};

/**
 * Get current user's following list
 * @returns {Promise<Object>} { items, count }
 */
export const getMyFollowing = async () => {
  const { data } = await apiClient.get('/me/following');
  return data;
};

/**
 * Block a user by profile ID
 * @param {string} profileId - Profile ID to block
 * @returns {Promise<Object>} { isBlocked, message }
 */
export const blockProfile = async (profileId) => {
  const { data } = await apiClient.post(`/profiles/${profileId}/block`);
  return data;
};

/**
 * Unblock a user by profile ID
 * @param {string} profileId - Profile ID to unblock
 * @returns {Promise<Object>} { isBlocked, message }
 */
export const unblockProfile = async (profileId) => {
  const { data } = await apiClient.delete(`/profiles/${profileId}/block`);
  return data;
};

/**
 * Get list of users current user has blocked
 * @returns {Promise<Object>} { items, count }
 */
export const getMyBlocks = async () => {
  const { data } = await apiClient.get('/me/blocks');
  return data;
};

/**
 * Get connection status with a profile
 * @param {string} profileId - Profile ID to check
 * @returns {Promise<Object>} { isFollowing, isFollowedBy, isBlocked, isBlockedBy }
 */
export const getProfileStatus = async (profileId) => {
  const { data } = await apiClient.get(`/profiles/${profileId}/status`);
  return data;
};

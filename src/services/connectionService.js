import { apiClient } from './api.js';

// ─── Network (mutual connection) API ─────────────────────────────────────────

/**
 * Send a network connection request to a profile.
 * @param {string} profileId
 * @returns {{ networkStatus: string, message: string }}
 */
export const sendNetworkRequest = async (profileId) => {
  const { data } = await apiClient.post(`/profiles/${profileId}/connect`);
  return data;
};

/**
 * Cancel your own pending request OR remove an accepted connection.
 * @param {string} profileId
 */
export const cancelNetworkRequest = async (profileId) => {
  const { data } = await apiClient.delete(`/profiles/${profileId}/connect`);
  return data;
};

/** Alias for cancelNetworkRequest */
export const removeFromNetwork = cancelNetworkRequest;

/**
 * Accept an incoming connection request from a profile.
 * @param {string} profileId
 */
export const acceptNetworkRequest = async (profileId) => {
  const { data } = await apiClient.post(`/profiles/${profileId}/connect/accept`);
  return data;
};

/**
 * Decline an incoming connection request from a profile.
 * @param {string} profileId
 */
export const declineNetworkRequest = async (profileId) => {
  const { data } = await apiClient.post(`/profiles/${profileId}/connect/decline`);
  return data;
};

/**
 * Get accepted network connections for a profile.
 * @param {string} profileId
 * @returns {{ items: Array, count: number }}
 */
export const getProfileNetwork = async (profileId) => {
  const { data } = await apiClient.get(`/profiles/${profileId}/network`);
  return data;
};

/**
 * Get network/connection status with a profile.
 * @param {string} profileId
 * @returns {{ networkStatus: 'none'|'pending_sent'|'pending_received'|'connected', isBlocked, isBlockedBy, visibility, messagePermission }}
 */
export const getProfileStatus = async (profileId) => {
  const { data } = await apiClient.get(`/profiles/${profileId}/status`);
  return data;
};

// ─── Block API ────────────────────────────────────────────────────────────────

export const blockProfile = async (profileId) => {
  const { data } = await apiClient.post(`/profiles/${profileId}/block`);
  return data;
};

export const unblockProfile = async (profileId) => {
  const { data } = await apiClient.delete(`/profiles/${profileId}/block`);
  return data;
};

export const getMyBlocks = async () => {
  const { data } = await apiClient.get('/me/blocks');
  return data;
};

// ─── Deprecated — kept so old imports don't crash at runtime ─────────────────

/** @deprecated Use sendNetworkRequest */
export const followProfile = (profileId) => sendNetworkRequest(profileId);

/** @deprecated Use cancelNetworkRequest */
export const unfollowProfile = (profileId) => cancelNetworkRequest(profileId);

/** @deprecated Use getProfileNetwork */
export const getProfileFollowers = (profileId) => getProfileNetwork(profileId);

/** @deprecated Use getProfileNetwork */
export const getProfileFollowing = (profileId) => getProfileNetwork(profileId);

export const getMyFollowers = () => apiClient.get('/me/followers').then(r => r.data);
export const getMyFollowing = () => apiClient.get('/me/following').then(r => r.data);

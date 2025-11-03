// src/services/reelsService.js
import apiClient from './api';

/**
 * Get reels feed
 * @param {number} limit - Number of reels to fetch
 * @param {string} cursor - Cursor for pagination
 * @returns {Promise} Reels data
 */
export const getReels = async (limit = 20, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  
  const { data } = await apiClient.get('/reels', { params });
  return data;
};

/**
 * Get a single reel by ID
 * @param {string} id - Reel ID
 * @returns {Promise} Reel data
 */
export const getReel = async (id) => {
  const { data } = await apiClient.get(`/reels/${id}`);
  return data;
};

/**
 * Like/unlike a reel
 * @param {string} id - Reel ID
 * @returns {Promise} Updated reel data
 */
export const toggleReelLike = async (id) => {
  const { data } = await apiClient.post(`/reels/${id}/like`);
  return data;
};

/**
 * Bookmark/unbookmark a reel
 * @param {string} id - Reel ID
 * @returns {Promise} Updated reel data
 */
export const toggleReelBookmark = async (id) => {
  const { data } = await apiClient.post(`/reels/${id}/bookmark`);
  return data;
};

/**
 * Get comments for a reel
 * @param {string} id - Reel ID
 * @param {number} limit - Number of comments
 * @returns {Promise} Comments data
 */
export const getReelComments = async (id, limit = 20) => {
  const { data } = await apiClient.get(`/reels/${id}/comments`, {
    params: { limit }
  });
  return data;
};

/**
 * Add a comment to a reel
 * @param {string} id - Reel ID
 * @param {string} content - Comment content
 * @returns {Promise} New comment data
 */
export const addReelComment = async (id, content) => {
  const { data } = await apiClient.post(`/reels/${id}/comments`, { content });
  return data;
};

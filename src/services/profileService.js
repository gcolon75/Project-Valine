// Profile service - API client for profile links and profile data
import { apiClient } from './api.js';

/**
 * Get the current user's profile
 * @returns {Promise<Object>} Current user's profile data
 */
export const getMyProfile = async () => {
  const { data } = await apiClient.get('/me/profile');
  return data;
};

/**
 * Update the current user's profile
 * @param {Object} updates - Profile updates including displayName, headline, bio, avatar, etc.
 * @param {boolean} [updates.onboardingComplete] - Set to true to mark onboarding as complete
 * @returns {Promise<Object>} Updated profile
 */
export const updateMyProfile = async (updates) => {
  const { data } = await apiClient.patch('/me/profile', updates);
  return data;
};

/**
 * Get user profile with links
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Profile data with links array
 */
export const getProfile = async (userId) => {
  try {
    const { data } = await apiClient.get(`/profiles/id/${userId}`);
    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Profile not found');
    }
    throw error;
  }
};

/**
 * Update user profile (including title, headline, and links)
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @param {string} [updates.title] - Professional title
 * @param {string} [updates.headline] - Profile headline
 * @param {Array} [updates.links] - Profile links array
 * @returns {Promise<Object>} Updated profile
 */
export const updateProfile = async (userId, updates) => {
  try {
    const { data } = await apiClient.put(`/profiles/id/${userId}`, updates);
    return data;
  } catch (error) {
    // Handle specific error cases
    if (error.response?.status === 409) {
      throw new Error(error.response.data?.message || 'Conflict: Resource already exists');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Validation error');
    }
    throw error;
  }
};

/**
 * Get all profile links for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of profile links
 */
export const getProfileLinks = async (userId) => {
  const { data } = await apiClient.get(`/profiles/${userId}/links`);
  return data.links;
};

/**
 * Create a new profile link
 * @param {string} userId - User ID
 * @param {Object} link - Link data
 * @param {string} link.label - Display label (1-40 characters)
 * @param {string} link.url - URL (http/https, max 2048 characters)
 * @param {string} link.type - Link type (website|imdb|showreel|other)
 * @returns {Promise<Object>} Created link
 */
export const createProfileLink = async (userId, link) => {
  const { data } = await apiClient.post(`/profiles/${userId}/links`, link);
  return data.link;
};

/**
 * Update an existing profile link
 * @param {string} userId - User ID
 * @param {string} linkId - Link ID
 * @param {Object} updates - Link updates
 * @param {string} [updates.label] - Display label
 * @param {string} [updates.url] - URL
 * @param {string} [updates.type] - Link type
 * @returns {Promise<Object>} Updated link
 */
export const updateProfileLink = async (userId, linkId, updates) => {
  const { data } = await apiClient.patch(`/profiles/${userId}/links/${linkId}`, updates);
  return data.link;
};

/**
 * Delete a profile link
 * @param {string} userId - User ID
 * @param {string} linkId - Link ID
 * @returns {Promise<Object>} Success response
 */
export const deleteProfileLink = async (userId, linkId) => {
  const { data } = await apiClient.delete(`/profiles/${userId}/links/${linkId}`);
  return data;
};

/**
 * Batch update profile links (optimized for saving all links at once)
 * Uses the profile PATCH endpoint to update all links in one request
 * @param {string} userId - User ID
 * @param {Array} links - Array of link objects
 * @returns {Promise<Object>} Updated profile with links
 */
export const batchUpdateProfileLinks = async (userId, links) => {
  // Transform links to API format (convert frontend types to backend types)
  const apiLinks = links.map(link => ({
    id: link.id, // Include id if updating existing link
    label: link.label.trim(),
    url: link.url.trim(),
    type: mapLinkTypeToApi(link.type)
  }));

  return await updateProfile(userId, { links: apiLinks });
};

/**
 * Map frontend link type to API link type
 * @param {string} type - Frontend link type
 * @returns {string} API link type
 */
const mapLinkTypeToApi = (type) => {
  // If already in API format, return as-is
  if (['website', 'imdb', 'showreel', 'other'].includes(type)) {
    return type;
  }

  // Map frontend types to API types
  const typeMap = {
    'Website': 'website',
    'Portfolio': 'website',
    'IMDb': 'imdb',
    'LinkedIn': 'other',
    'Twitter': 'other',
    'Instagram': 'other',
    'YouTube': 'showreel',
    'Vimeo': 'showreel',
    'SoundCloud': 'showreel',
    'Other': 'other'
  };

  return typeMap[type] || 'other';
};

/**
 * Map API link type to frontend link type
 * @param {string} type - API link type
 * @returns {string} Frontend link type
 */
export const mapLinkTypeFromApi = (type) => {
  const typeMap = {
    'website': 'Website',
    'imdb': 'IMDb',
    'showreel': 'Showreel',
    'other': 'Other'
  };

  return typeMap[type] || 'Website';
};

/**
 * Reorder profile links
 * @param {string} userId - User ID
 * @param {Array<string>} linkIds - Ordered array of link IDs
 * @returns {Promise<Object>} Updated profile with reordered links
 */
export const reorderProfileLinks = async (userId, linkIds) => {
  const { data } = await apiClient.post(`/profiles/${userId}/links/reorder`, {
    linkIds
  });
  return data;
};

/**
 * Request presigned URL for avatar upload
 * @param {string} userId - User ID
 * @param {string} fileName - File name
 * @param {string} fileType - MIME type (e.g., 'image/jpeg')
 * @returns {Promise<Object>} Presigned URL data { uploadUrl, fileUrl }
 */
export const requestAvatarUploadUrl = async (userId, fileName, fileType) => {
  const { data } = await apiClient.post(`/profiles/${userId}/avatar/presign`, {
    fileName,
    fileType
  });
  return data;
};

/**
 * Upload avatar to presigned S3 URL
 * @param {string} uploadUrl - Presigned S3 upload URL
 * @param {Blob} file - Image file blob
 * @param {string} fileType - MIME type
 * @returns {Promise<void>}
 */
export const uploadAvatarToS3 = async (uploadUrl, file, fileType) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': fileType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
};

/**
 * List education entries for the current user
 * @returns {Promise<Array>} Array of education entries
 */
export const listEducation = async () => {
  const { data } = await apiClient.get('/me/profile/education');
  return data;
};

/**
 * Create a new education entry
 * @param {Object} education - Education data
 * @returns {Promise<Object>} Created education entry
 */
export const createEducation = async (education) => {
  const { data } = await apiClient.post('/me/profile/education', education);
  return data;
};

/**
 * Update an education entry
 * @param {string} id - Education entry ID
 * @param {Object} updates - Education updates
 * @returns {Promise<Object>} Updated education entry
 */
export const updateEducation = async (id, updates) => {
  const { data } = await apiClient.put(`/me/profile/education/${id}`, updates);
  return data;
};

/**
 * Delete an education entry
 * @param {string} id - Education entry ID
 * @returns {Promise<Object>} Success response
 */
export const deleteEducation = async (id) => {
  const { data } = await apiClient.delete(`/me/profile/education/${id}`);
  return data;
};

/**
 * List experience entries for the current user
 * @returns {Promise<Array>} Array of experience entries
 */
export const listExperience = async () => {
  const { data } = await apiClient.get('/me/profile/experience');
  return data;
};

/**
 * Create a new experience entry
 * @param {Object} experience - Experience data
 * @returns {Promise<Object>} Created experience entry
 */
export const createExperience = async (experience) => {
  const { data } = await apiClient.post('/me/profile/experience', experience);
  return data;
};

/**
 * Update an experience entry
 * @param {string} id - Experience entry ID
 * @param {Object} updates - Experience updates
 * @returns {Promise<Object>} Updated experience entry
 */
export const updateExperience = async (id, updates) => {
  const { data } = await apiClient.put(`/me/profile/experience/${id}`, updates);
  return data;
};

/**
 * Delete an experience entry
 * @param {string} id - Experience entry ID
 * @returns {Promise<Object>} Success response
 */
export const deleteExperience = async (id) => {
  const { data } = await apiClient.delete(`/me/profile/experience/${id}`);
  return data;
};

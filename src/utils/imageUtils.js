/**
 * Image utility functions for cache-busting and URL manipulation
 */

/**
 * Get a cache-busted image URL by appending a version query parameter
 * This prevents browsers from showing stale cached images after updates
 * 
 * @param {string} url - Base image URL
 * @param {string|number} version - Version identifier (timestamp, updatedAt, or version number)
 * @returns {string} URL with cache-busting query parameter
 */
export const getCacheBustedImageUrl = (url, version) => {
  if (!url) return url;
  
  // If no version provided, use current timestamp
  const versionParam = version || Date.now();
  
  // Check if URL already has query parameters
  const separator = url.includes('?') ? '&' : '?';
  
  // Append version parameter
  return `${url}${separator}v=${versionParam}`;
};

/**
 * Extract version from profile data for cache-busting
 * Uses updatedAt timestamp if available, otherwise falls back to Date.now()
 * 
 * @param {object} profile - Profile object
 * @returns {number} Version identifier (timestamp)
 */
export const getProfileImageVersion = (profile) => {
  if (!profile) return Date.now();
  
  // Try to use updatedAt timestamp from profile
  if (profile.updatedAt) {
    const timestamp = new Date(profile.updatedAt).getTime();
    if (!isNaN(timestamp)) return timestamp;
  }
  
  // Fallback to current time
  return Date.now();
};

/**
 * Get cache-busted avatar URL for a profile
 * 
 * @param {string} avatarUrl - Avatar URL
 * @param {object} profile - Profile object with updatedAt timestamp
 * @returns {string} Cache-busted avatar URL
 */
export const getCacheBustedAvatarUrl = (avatarUrl, profile) => {
  if (!avatarUrl) return avatarUrl;
  return getCacheBustedImageUrl(avatarUrl, getProfileImageVersion(profile));
};

/**
 * Get cache-busted banner URL for a profile
 * 
 * @param {string} bannerUrl - Banner URL
 * @param {object} profile - Profile object with updatedAt timestamp
 * @returns {string} Cache-busted banner URL
 */
export const getCacheBustedBannerUrl = (bannerUrl, profile) => {
  if (!bannerUrl) return bannerUrl;
  return getCacheBustedImageUrl(bannerUrl, getProfileImageVersion(profile));
};

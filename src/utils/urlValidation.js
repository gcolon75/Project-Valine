// URL validation utilities for profile links
// Ensures only http/https protocols are allowed to prevent XSS attacks

/**
 * Validates if a URL is safe and uses http/https protocol
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid and safe, false otherwise
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validates if a URL string has proper format before attempting to parse
 * @param {string} url - The URL string to check
 * @returns {boolean} - True if format is valid
 */
export const hasValidUrlFormat = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it starts with http:// or https://
  const urlPattern = /^https?:\/\/.+/i;
  return urlPattern.test(url.trim());
};

/**
 * Sanitizes a URL by ensuring it has http/https protocol
 * @param {string} url - The URL to sanitize
 * @returns {string} - Sanitized URL
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // If already has protocol, validate and return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return isValidUrl(trimmed) ? trimmed : '';
  }
  
  // Otherwise, add https:// by default
  const withProtocol = `https://${trimmed}`;
  return isValidUrl(withProtocol) ? withProtocol : '';
};

/**
 * Validates URL length constraints
 * @param {string} url - The URL to validate
 * @param {number} maxLength - Maximum allowed length (default 2048)
 * @returns {boolean} - True if within length limits
 */
export const isValidUrlLength = (url, maxLength = 2048) => {
  if (!url || typeof url !== 'string') return true; // Empty is valid
  return url.length <= maxLength;
};

/**
 * Comprehensive URL validation for profile links
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, error?: string }} - Validation result with error message
 */
export const validateProfileUrl = (url) => {
  if (!url || url.trim() === '') {
    return { valid: true }; // Empty URLs are valid (optional field)
  }
  
  const trimmed = url.trim();
  
  if (!isValidUrlLength(trimmed)) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' };
  }
  
  if (!hasValidUrlFormat(trimmed)) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }
  
  if (!isValidUrl(trimmed)) {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  return { valid: true };
};

/**
 * Valid link types for profile links (API spec)
 */
export const VALID_LINK_TYPES = ['website', 'imdb', 'showreel', 'other'];

/**
 * Maximum number of profile links allowed
 */
export const MAX_PROFILE_LINKS = 20;

/**
 * Validates a link object for profile links
 * @param {{ label: string, url: string, type?: string }} link - The link object to validate
 * @returns {{ valid: boolean, errors: object }} - Validation result with field errors
 */
export const validateProfileLink = (link) => {
  const errors = {};
  
  if (!link || typeof link !== 'object') {
    return { valid: false, errors: { _form: 'Invalid link object' } };
  }
  
  // Validate label (API spec: 1-40 characters)
  if (!link.label || typeof link.label !== 'string' || link.label.trim() === '') {
    errors.label = 'Label is required';
  } else if (link.label.length < 1) {
    errors.label = 'Label must be at least 1 character';
  } else if (link.label.length > 40) {
    errors.label = 'Label must be 40 characters or less';
  }
  
  // Validate URL
  if (!link.url || typeof link.url !== 'string' || link.url.trim() === '') {
    errors.url = 'URL is required';
  } else {
    const urlValidation = validateProfileUrl(link.url);
    if (!urlValidation.valid) {
      errors.url = urlValidation.error;
    }
  }
  
  // Validate type (required, must be one of the valid types)
  if (!link.type || typeof link.type !== 'string') {
    errors.type = 'Type is required';
  } else if (!VALID_LINK_TYPES.includes(link.type)) {
    errors.type = `Type must be one of: ${VALID_LINK_TYPES.join(', ')}`;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates an array of profile links
 * @param {Array} links - Array of link objects
 * @returns {{ valid: boolean, errors: object, globalErrors: string[] }} - Validation result
 */
export const validateProfileLinks = (links) => {
  const errors = {};
  const globalErrors = [];
  
  if (!Array.isArray(links)) {
    return { valid: false, errors: {}, globalErrors: ['Links must be an array'] };
  }
  
  // Check max links constraint
  if (links.length > MAX_PROFILE_LINKS) {
    globalErrors.push(`Maximum of ${MAX_PROFILE_LINKS} links allowed (you have ${links.length})`);
  }
  
  // Validate each link
  links.forEach((link, index) => {
    const validation = validateProfileLink(link);
    if (!validation.valid) {
      errors[index] = validation.errors;
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0 && globalErrors.length === 0,
    errors,
    globalErrors
  };
};

/**
 * Validation utilities for API inputs
 */

/**
 * Standard error response format
 * @param {string} code - Error code (e.g., 'INVALID_INPUT')
 * @param {string} message - Human-readable error message
 * @param {object} details - Additional error details
 * @returns {object} Formatted error object
 */
export function createError(code, message, details = {}) {
  return {
    error: {
      code,
      message,
      details
    }
  }
}

/**
 * Validate URL format and protocol
 * @param {string} url - URL to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateUrl(url) {
  if (!url) {
    return { valid: true } // Empty URLs are allowed (optional fields)
  }
  
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        valid: false,
        error: 'URL protocol must be http or https'
      }
    }
    
    // Check for reasonable URL length
    if (url.length > 2048) {
      return {
        valid: false,
        error: 'URL exceeds maximum length of 2048 characters'
      }
    }
    
    return { valid: true }
  } catch (e) {
    return {
      valid: false,
      error: 'Invalid URL format'
    }
  }
}

/**
 * Validate theme value
 * @param {string} theme - Theme value to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateTheme(theme) {
  if (theme === undefined || theme === null) {
    return { valid: true }
  }
  
  if (!['light', 'dark'].includes(theme)) {
    return {
      valid: false,
      error: 'Theme must be "light" or "dark"'
    }
  }
  
  return { valid: true }
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @param {string} fieldName - Name of field for error message
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateStringLength(value, min, max, fieldName = 'field') {
  if (value == null || value === '') {
    if (min > 0) {
      return {
        valid: false,
        error: `${fieldName} is required`
      }
    }
    return { valid: true }
  }
  
  if (value.length < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min} characters`
    }
  }
  
  if (value.length > max) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${max} characters`
    }
  }
  
  return { valid: true }
}

/**
 * Sanitize string input by trimming leading and trailing whitespace
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string with whitespace trimmed
 */
export function sanitizeString(input) {
  if (!input) return input
  return String(input).trim()
}

/**
 * Sanitize and normalize URL
 * @param {string} url - URL to sanitize
 * @returns {string} Normalized URL
 */
export function sanitizeUrl(url) {
  if (!url) return url
  
  try {
    // Parse URL to normalize it (removes extra slashes, normalizes encoding, etc.)
    const parsed = new URL(url.trim())
    
    // Reconstruct URL to normalize it
    return parsed.toString()
  } catch {
    // If URL is invalid, return as-is (will be caught by validation)
    return url
  }
}

/**
 * Valid profile link types
 */
export const VALID_LINK_TYPES = ['website', 'imdb', 'showreel', 'other']

/**
 * Validate profile link type
 * @param {string} type - Link type to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateLinkType(type) {
  if (!type) {
    return {
      valid: false,
      error: 'Link type is required'
    }
  }
  
  if (!VALID_LINK_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Link type must be one of: ${VALID_LINK_TYPES.join(', ')}`
    }
  }
  
  return { valid: true }
}

/**
 * Validate profile link object
 * @param {object} link - Link object to validate
 * @returns {object} { valid: boolean, error?: string, field?: string }
 */
export function validateProfileLink(link) {
  if (!link || typeof link !== 'object') {
    return {
      valid: false,
      error: 'Link must be an object',
      field: 'link'
    }
  }
  
  // Validate label
  const labelValidation = validateStringLength(link.label, 1, 40, 'label')
  if (!labelValidation.valid) {
    return {
      ...labelValidation,
      field: 'label'
    }
  }
  
  // Validate URL (required for profile links)
  if (!link.url) {
    return {
      valid: false,
      error: 'URL is required',
      field: 'url'
    }
  }
  
  const urlValidation = validateUrl(link.url)
  if (!urlValidation.valid) {
    return {
      ...urlValidation,
      field: 'url'
    }
  }
  
  // Validate type
  const typeValidation = validateLinkType(link.type)
  if (!typeValidation.valid) {
    return {
      ...typeValidation,
      field: 'type'
    }
  }
  
  return { valid: true }
}

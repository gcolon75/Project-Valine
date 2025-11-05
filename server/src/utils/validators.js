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

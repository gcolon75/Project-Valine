// src/utils/validation.js
/**
 * Shared validation utilities for forms and user input
 */

/**
 * Email validation regex (RFC 5322 simplified)
 * Matches most common email formats while avoiding complex edge cases
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Password strength validation
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * 
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if two passwords match
 * @param {string} password - First password
 * @param {string} confirmPassword - Second password
 * @returns {boolean} - True if they match
 */
export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword;
}

/**
 * Validate field is not empty
 * @param {string} value - Field value
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateRequired(value, fieldName = 'This field') {
  const valid = value && value.trim().length > 0;
  return {
    valid,
    error: valid ? null : `${fieldName} is required`
  };
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} max - Maximum length
 * @param {number} min - Minimum length (optional)
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateLength(value, max, min = 0, fieldName = 'This field') {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (value.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  
  if (value.length > max) {
    return { valid: false, error: `${fieldName} must be ${max} characters or less` };
  }
  
  return { valid: true, error: null };
}

/**
 * URL validation
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate form fields
 * Generic validator that can be used for any form
 * @param {Object} fields - Object with field names as keys and values
 * @param {Object} rules - Validation rules for each field
 * @returns {Object} - { valid: boolean, errors: Object }
 * 
 * @example
 * const errors = validateForm(
 *   { email: 'test@example.com', password: 'weak' },
 *   {
 *     email: ['required', 'email'],
 *     password: ['required', { type: 'minLength', value: 8 }]
 *   }
 * );
 */
export function validateForm(fields, rules) {
  const errors = {};
  let valid = true;
  
  Object.keys(rules).forEach(fieldName => {
    const fieldRules = Array.isArray(rules[fieldName]) ? rules[fieldName] : [rules[fieldName]];
    const value = fields[fieldName];
    
    for (const rule of fieldRules) {
      if (rule === 'required') {
        const result = validateRequired(value, fieldName);
        if (!result.valid) {
          errors[fieldName] = result.error;
          valid = false;
          break;
        }
      } else if (rule === 'email') {
        if (!isValidEmail(value)) {
          errors[fieldName] = 'Please enter a valid email address';
          valid = false;
          break;
        }
      } else if (rule === 'url') {
        if (!isValidUrl(value)) {
          errors[fieldName] = 'Please enter a valid URL';
          valid = false;
          break;
        }
      } else if (typeof rule === 'object') {
        // Custom rule object
        if (rule.type === 'minLength') {
          if (!value || value.length < rule.value) {
            errors[fieldName] = rule.message || `Must be at least ${rule.value} characters`;
            valid = false;
            break;
          }
        } else if (rule.type === 'maxLength') {
          if (value && value.length > rule.value) {
            errors[fieldName] = rule.message || `Must be ${rule.value} characters or less`;
            valid = false;
            break;
          }
        }
      }
    }
  });
  
  return { valid, errors };
}

export default {
  isValidEmail,
  validatePassword,
  passwordsMatch,
  validateRequired,
  validateLength,
  isValidUrl,
  validateForm
};

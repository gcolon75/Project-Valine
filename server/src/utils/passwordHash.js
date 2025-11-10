/**
 * Password Hashing Utilities
 * Uses bcryptjs for secure password hashing (argon2 requires native dependencies)
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // Recommended for bcrypt (balance security vs performance)

/**
 * Hash a plaintext password using bcrypt
 * @param {string} password - Plaintext password to hash
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a hashed password
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  
  return await bcrypt.compare(password, hash);
}

/**
 * Normalize email for deduplication
 * - Lowercase
 * - Trim whitespace
 * @param {string} email - Email to normalize
 * @returns {string} - Normalized email
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }
  
  return email.toLowerCase().trim();
}

/**
 * Validate password strength
 * Minimum 8 characters for MVP
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, message?: string }
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // MVP: Just length check. Production would add complexity checks
  // TODO: Add checks for uppercase, lowercase, numbers, special chars
  // TODO: Check against common password breach lists
  
  return { valid: true };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email format is valid
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Simple email validation - not vulnerable to ReDoS
  // Format: localpart@domain.tld
  // More strict than RFC 5322 but safe and practical
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

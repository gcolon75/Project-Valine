/**
 * Allowlist Configuration Utility
 * 
 * Provides utilities for checking email allowlist on the frontend.
 * This is a client-side convenience check - the actual security enforcement
 * happens on the backend.
 */

/**
 * Get the list of allowed emails from environment variable
 * @returns {string[]} Array of lowercase, trimmed allowed email addresses
 */
export const getAllowedEmails = () => {
  const allowlistEnv = import.meta.env.VITE_ALLOWED_USER_EMAILS || '';
  return allowlistEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Check if an email is in the allowlist
 * @param {string} email - Email address to check
 * @returns {boolean} True if email is allowed, false otherwise
 */
export const isEmailAllowed = (email) => {
  if (!email) return false;
  
  const allowedEmails = getAllowedEmails();
  
  // If no allowlist configured, allow all (frontend doesn't enforce, backend does)
  if (allowedEmails.length === 0) return true;
  
  const normalizedEmail = email.trim().toLowerCase();
  return allowedEmails.includes(normalizedEmail);
};

/**
 * Check if allowlist enforcement is active
 * @returns {boolean} True if allowlist is configured and active
 */
export const isAllowlistActive = () => {
  return getAllowedEmails().length > 0;
};

/**
 * Get the count of allowed emails
 * @returns {number} Number of emails in the allowlist
 */
export const getAllowlistCount = () => {
  return getAllowedEmails().length;
};

/**
 * Get a user-friendly message for restricted registration
 * @returns {string} Message to display when registration is restricted
 */
export const getRestrictedMessage = () => {
  return 'Registration is restricted. Only pre-approved accounts may sign in.';
};

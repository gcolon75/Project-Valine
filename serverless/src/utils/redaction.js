/**
 * Redaction Utilities
 * 
 * Provides utilities for redacting sensitive information from logs and responses
 * to prevent accidental secret exposure.
 */

import crypto from 'crypto';

/**
 * List of key patterns that should be redacted when logging
 */
const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /pass$/i,
  /pwd$/i,
  /auth/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /credential/i,
  /jwt/i,
  /bearer/i,
  /webhook/i,
  /discord.*token/i,
  /pat$/i,
  /smtp.*pass/i,
  /db.*url/i,
  /database.*url/i,
  /connection.*string/i
];

/**
 * Check if a key should be redacted based on patterns
 * @param {string} key - The key name to check
 * @returns {boolean} - True if the key should be redacted
 */
export function shouldRedact(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Create a fixed-length hash fingerprint of a value for logging
 * @param {string} value - The value to hash
 * @param {number} length - Length of the hash prefix to return (default: 12)
 * @returns {string} - Hashed fingerprint
 */
export function hashFingerprint(value, length = 12) {
  if (!value) {
    return '<empty>';
  }
  
  if (typeof value !== 'string') {
    value = String(value);
  }
  
  const hash = crypto.createHash('sha256').update(value).digest('hex');
  return hash.slice(0, length);
}

/**
 * Redact a value for safe logging
 * @param {string} key - The key name (used to determine if redaction is needed)
 * @param {any} value - The value to potentially redact
 * @param {Object} options - Redaction options
 * @param {boolean} options.useHash - Return hash fingerprint instead of mask (default: true)
 * @param {number} options.hashLength - Length of hash fingerprint (default: 12)
 * @returns {string} - Redacted value or original if not sensitive
 */
export function redactValue(key, value, options = {}) {
  const { useHash = true, hashLength = 12 } = options;
  
  // If key doesn't need redaction, return original value
  if (!shouldRedact(key)) {
    return value;
  }
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '<not set>';
  }
  
  // Return hash fingerprint or masked value
  if (useHash) {
    return `<redacted:${hashFingerprint(value, hashLength)}>`;
  }
  
  return '<redacted>';
}

/**
 * Redact sensitive fields in an object for logging
 * @param {Object} obj - Object to redact
 * @param {Object} options - Redaction options
 * @returns {Object} - New object with redacted values
 */
export function redactObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const redacted = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      // Recursively redact nested objects
      redacted[key] = redactObject(value, options);
    } else {
      // Redact primitive values if key matches pattern
      redacted[key] = redactValue(key, value, options);
    }
  }
  
  return redacted;
}

/**
 * Redact email addresses for privacy (show only first 2 chars and domain)
 * @param {string} email - Email to redact
 * @returns {string} - Redacted email (e.g., "us***@example.com")
 */
export function redactEmail(email) {
  if (!email || typeof email !== 'string') {
    return email;
  }
  
  const [localPart, domain] = email.split('@');
  if (!domain) {
    return email; // Invalid email format
  }
  
  if (localPart.length <= 2) {
    return `${localPart}***@${domain}`;
  }
  
  return `${localPart.slice(0, 2)}***@${domain}`;
}

/**
 * Create a redacted copy of environment variables for logging
 * @param {Object} env - Environment object (default: process.env)
 * @param {Array<string>} allowedKeys - Keys that are safe to log (not redacted)
 * @returns {Object} - Redacted environment object
 */
export function redactEnv(env = process.env, allowedKeys = []) {
  const safe = [
    'NODE_ENV',
    'AWS_REGION',
    'STAGE',
    'LOG_LEVEL',
    'ENABLE_REGISTRATION',
    'CSRF_ENABLED',
    'RATE_LIMITING_ENABLED',
    ...allowedKeys
  ];
  
  const redacted = {};
  
  for (const [key, value] of Object.entries(env)) {
    if (safe.includes(key)) {
      redacted[key] = value;
    } else if (shouldRedact(key)) {
      redacted[key] = redactValue(key, value);
    } else {
      // For non-sensitive, non-allowed keys, show partial value
      redacted[key] = value?.length > 20 ? `${value.slice(0, 10)}...` : value;
    }
  }
  
  return redacted;
}

/**
 * Check if a string value matches known insecure default patterns
 * @param {string} key - Environment variable key
 * @param {string} value - Value to check
 * @returns {boolean} - True if value is an insecure default
 */
export function isInsecureDefault(key, value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const insecurePatterns = {
    JWT_SECRET: [
      'dev-secret-key-change-in-production',
      'your-super-secret-jwt-key-change-this-in-production',
      'change-me',
      'secret',
      'password',
      '12345'
    ],
    DATABASE_URL: [
      'postgresql://username:password@host:5432/valine_db',
      'postgresql://user:pass@localhost',
      'mysql://username:password@host'
    ],
    SMTP_PASS: [
      'your-smtp-password-or-api-key',
      'password',
      '12345'
    ],
    DISCORD_BOT_TOKEN: [
      'your-discord-bot-token',
      'change-me'
    ],
    PAT: [
      'your-github-pat',
      'ghp_example',
      'github_pat_example'
    ]
  };
  
  // Check if this key has known insecure patterns
  const patterns = insecurePatterns[key];
  if (!patterns) {
    return false;
  }
  
  // Check if value matches any insecure pattern
  const normalizedValue = value.toLowerCase().trim();
  return patterns.some(pattern => 
    normalizedValue.includes(pattern.toLowerCase())
  );
}

/**
 * Validate that a secret meets minimum security requirements
 * @param {string} key - Secret key name
 * @param {string} value - Secret value
 * @returns {Object} - Validation result { valid: boolean, reason?: string }
 */
export function validateSecret(key, value) {
  if (!value) {
    return { valid: false, reason: 'Secret is empty or not set' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, reason: 'Secret must be a string' };
  }
  
  // Check for insecure defaults
  if (isInsecureDefault(key, value)) {
    return { valid: false, reason: 'Secret uses insecure default value' };
  }
  
  // Minimum length check for critical secrets
  const minLengths = {
    JWT_SECRET: 32,
    DISCORD_BOT_TOKEN: 50,
    PAT: 20,
    ORCHESTRATION_BOT_PAT: 20,
    SMTP_PASS: 8
  };
  
  const minLength = minLengths[key];
  if (minLength && value.length < minLength) {
    return { 
      valid: false, 
      reason: `Secret too short (minimum ${minLength} characters)` 
    };
  }
  
  return { valid: true };
}

export default {
  shouldRedact,
  hashFingerprint,
  redactValue,
  redactObject,
  redactEmail,
  redactEnv,
  isInsecureDefault,
  validateSecret
};

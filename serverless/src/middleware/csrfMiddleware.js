/**
 * CSRF Token Middleware (Phase 3)
 * Implements CSRF protection for cookie-based authentication
 */

import crypto from 'crypto';

const CSRF_ENABLED = process.env.CSRF_ENABLED === 'true';

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} CSRF token
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash CSRF token for storage/verification
 * @param {string} token - CSRF token to hash
 * @returns {string} Hashed token
 */
const hashCsrfToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate CSRF cookie (non-HttpOnly so JavaScript can read it)
 * @param {string} token - CSRF token
 * @returns {string} Set-Cookie header value
 */
export const generateCsrfCookie = (token) => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const IS_PRODUCTION = NODE_ENV === 'production';
  
  // Use SameSite=None for cross-site requests (CloudFront frontend + API Gateway backend)
  // SameSite=None requires Secure flag
  const sameSite = IS_PRODUCTION ? 'None' : 'Lax';
  
  // Non-HttpOnly cookie so frontend can read it
  let cookie = `XSRF-TOKEN=${token}; Path=/; SameSite=${sameSite}; Max-Age=${15 * 60}`; // 15 minutes
  
  // Secure flag is required for SameSite=None, always include in production
  if (IS_PRODUCTION) {
    cookie += '; Secure';
  }
  
  // Don't set Domain - let browser set it to the API domain for cross-site cookies
  
  return cookie;
};

/**
 * Extract CSRF token from cookie
 * @param {string} cookieHeader - Cookie header string
 * @returns {string|null} CSRF token or null
 */
const extractCsrfTokenFromCookie = (cookieHeader) => {
  if (!cookieHeader) return null;
  
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  
  return cookies['XSRF-TOKEN'] || null;
};

/**
 * Extract CSRF token from X-CSRF-Token header
 * @param {object} headers - Request headers
 * @returns {string|null} CSRF token or null
 */
const extractCsrfTokenFromHeader = (headers) => {
  return headers['x-csrf-token'] || headers['X-CSRF-Token'] || null;
};

/**
 * Verify CSRF token matches
 * @param {string} cookieToken - Token from cookie
 * @param {string} headerToken - Token from header
 * @returns {boolean} True if tokens match
 */
const verifyCsrfToken = (cookieToken, headerToken) => {
  if (!cookieToken || !headerToken) return false;
  
  // Constant-time comparison to prevent timing attacks
  const cookieHash = hashCsrfToken(cookieToken);
  const headerHash = hashCsrfToken(headerToken);
  
  return crypto.timingSafeEqual(
    Buffer.from(cookieHash),
    Buffer.from(headerHash)
  );
};

/**
 * CSRF protection middleware
 * Validates CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
 * 
 * @param {object} event - Lambda event object
 * @returns {object|null} Error response if CSRF validation fails, null if valid
 */
export const csrfProtection = (event) => {
  // Skip if CSRF is disabled
  if (!CSRF_ENABLED) {
    return null;
  }
  
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  
  // Only protect state-changing methods
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!protectedMethods.includes(method)) {
    return null; // GET requests don't need CSRF protection
  }
  
  // Extract tokens
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const cookieToken = extractCsrfTokenFromCookie(cookieHeader);
  const headerToken = extractCsrfTokenFromHeader(event.headers || {});
  
  // Verify tokens
  const isValid = verifyCsrfToken(cookieToken, headerToken);
  
  if (!isValid) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token'
      })
    };
  }
  
  return null; // Valid, allow request to proceed
};

/**
 * Wrapper function to apply CSRF protection to Lambda handlers
 * @param {Function} handler - Original Lambda handler
 * @returns {Function} Wrapped handler with CSRF protection
 */
export const withCsrfProtection = (handler) => {
  return async (event) => {
    // Check CSRF token
    const csrfError = csrfProtection(event);
    
    if (csrfError) {
      return csrfError;
    }
    
    // Call original handler
    return await handler(event);
  };
};

/**
 * Clear CSRF cookie
 * @returns {string} Set-Cookie header to clear CSRF cookie
 */
export const clearCsrfCookie = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const IS_PRODUCTION = NODE_ENV === 'production';
  
  // Use SameSite=None for cross-site requests (CloudFront frontend + API Gateway backend)
  // SameSite=None requires Secure flag
  const sameSite = IS_PRODUCTION ? 'None' : 'Lax';
  
  let cookie = `XSRF-TOKEN=; Path=/; SameSite=${sameSite}; Max-Age=0`;
  
  // Secure flag is required for SameSite=None, always include in production
  if (IS_PRODUCTION) {
    cookie += '; Secure';
  }
  
  // Don't set Domain - let browser set it to the API domain for cross-site cookies
  
  return cookie;
};

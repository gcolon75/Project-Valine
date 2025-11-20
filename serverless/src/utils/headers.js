/**
 * Utility functions for generating HTTP response headers
 * Includes CORS, security headers, and content-type helpers
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Get allowed CORS origins based on environment
 * @returns {string[]} List of allowed origins
 */
const getAllowedOrigins = () => {
  const origins = [FRONTEND_URL];
  
  // Add CloudFront distribution in production
  if (IS_PRODUCTION) {
    origins.push('https://dkmxy676d3vgc.cloudfront.net');
  }
  
  // Allow localhost in development
  if (!IS_PRODUCTION) {
    origins.push('http://localhost:3000', 'http://localhost:5173');
  }
  
  return origins;
};

/**
 * Get CORS headers for the given request origin
 * Restricts to allowed origins (no wildcard) for security
 * @param {object} event - Lambda event object (optional)
 * @returns {object} CORS headers
 */
export const getCorsHeaders = (event) => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin || '';
  
  // Check if request origin is allowed
  const allowOrigin = allowedOrigins.includes(requestOrigin) 
    ? requestOrigin 
    : allowedOrigins[0]; // Default to FRONTEND_URL
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
};

export function json(data, statusCode = 200, extra = {}) {
  // Merge CORS headers with extra headers
  const corsHeaders = getCorsHeaders(extra.event);
  delete extra.event; // Remove event from extra headers
  
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      ...extra,
    },
    body: JSON.stringify(data),
  };
}

export function error(statusCode = 400, message = 'Bad Request', extra = {}) {
  return json({ error: message }, statusCode, extra);
}

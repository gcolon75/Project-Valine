/**
 * Utility functions for generating HTTP response headers
 * Includes CORS, security headers, and content-type helpers
 */

// Service version from package.json (can be set via env var in deployment)
const SERVICE_VERSION = process.env.SERVICE_VERSION || '0.0.1';

/**
 * Get auth mode from environment configuration
 * @returns {string} Current auth mode
 */
const getAuthMode = () => {
  const registrationEnabled = process.env.ENABLE_REGISTRATION === 'true';
  const hasAllowlist = (process.env.ALLOWED_USER_EMAILS || '').trim().length > 0;
  
  if (!registrationEnabled && hasAllowlist) {
    return 'owner-only';
  } else if (!registrationEnabled) {
    return 'registration-disabled';
  } else if (hasAllowlist) {
    return 'allowlist-restricted';
  }
  return 'open';
};

/**
 * Get allowed CORS origins based on environment
 * @returns {string[]} List of allowed origins
 */
const getAllowedOrigins = () => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const isProduction = process.env.NODE_ENV === 'production';
  const origins = [frontendUrl];
  
  // Add CloudFront distribution in production
  if (isProduction) {
    origins.push('https://dkmxy676d3vgc.cloudfront.net');
  }
  
  // Allow localhost in development
  if (!isProduction) {
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
  
  // Extract correlationId if provided
  const correlationId = extra.correlationId;
  delete extra.correlationId; // Remove from headers
  
  const headers = {
    'content-type': 'application/json',
    ...corsHeaders,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'x-service-version': SERVICE_VERSION,
    'x-auth-mode': getAuthMode(),
    ...extra,
  };
  
  // Add correlation ID header if provided
  if (correlationId) {
    headers['x-correlation-id'] = correlationId;
  }
  
  return {
    statusCode,
    headers,
    body: JSON.stringify(data),
  };
}

export function error(statusCode = 400, message = 'Bad Request', extra = {}) {
  return json({ error: message }, statusCode, extra);
}

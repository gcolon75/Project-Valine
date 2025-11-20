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
  if (IS_PRODUCTION) {
    origins.push('https://dkmxy676d3vgc.cloudfront.net');
  } else {
    origins.push('http://localhost:3000', 'http://localhost:5173');
  }
  return origins;
};

/**
 * Get CORS headers
 * @param {object} event
 */
export const getCorsHeaders = (event) => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin || '';
  const allowOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  };
};

/**
 * JSON response
 */
export function json(data, statusCode = 200, extra = {}) {
  const corsHeaders = getCorsHeaders(extra.event);
  delete extra.event;
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

/**
 * FIX: Accept statusCode first, message second (matches usage throughout handlers)
 */
export function error(statusCode = 400, message = 'Bad Request', extra = {}) {
  return json({ error: message }, statusCode, extra);
}
/**
 * Utility functions for generating HTTP response headers
 * Includes CORS, security headers, and content-type helpers
 */

import { isPrismaDegraded } from '../db/client.js';

// Service version - re-evaluated each time to allow tests to change it
const getServiceVersion = () => process.env.SERVICE_VERSION || '0.0.1';

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
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token,X-Requested-With,Cookie',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
};

export function json(data, statusCode = 200, extra = {}) {
  // Extract and remove special properties
  const event = extra.event;
  const correlationId = extra.correlationId;
  
  // Create clean extra object without special properties
  const cleanExtra = { ...extra };
  delete cleanExtra.event;
  delete cleanExtra.correlationId;
  
  // Merge CORS headers with extra headers
  const corsHeaders = getCorsHeaders(event);
  
  const headers = {
    'content-type': 'application/json',
    ...cleanExtra, // Spread extra first so it can be overridden
    ...corsHeaders, // Then CORS headers (higher priority)
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'x-service-version': getServiceVersion(),
    'x-auth-mode': getAuthMode(),
  };
  
  // Add correlation ID header if provided
  if (correlationId) {
    headers['x-correlation-id'] = correlationId;
  }
  
  // Add prisma degraded header if in degraded mode
  if (isPrismaDegraded()) {
    headers['x-prisma-degraded'] = 'true';
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

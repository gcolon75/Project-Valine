/**
 * Correlation ID utility for request tracing
 * Generates unique IDs to correlate logs across a single request lifecycle
 */

import crypto from 'crypto';

/**
 * Generate a unique correlation ID for request tracking
 * @returns {string} UUID v4 correlation ID
 */
export function generateCorrelationId() {
  return crypto.randomUUID();
}

/**
 * Create structured log entry with correlation ID
 * @param {string} correlationId - Correlation ID for the request
 * @param {string} event - Event name (e.g., 'login_denied', 'registration_denied')
 * @param {object} metadata - Additional metadata for the log
 * @returns {object} Structured log object
 */
export function createStructuredLog(correlationId, event, metadata = {}) {
  return {
    timestamp: new Date().toISOString(),
    correlationId,
    event,
    ...metadata
  };
}

/**
 * Log structured event to console with correlation ID
 * @param {string} correlationId - Correlation ID for the request
 * @param {string} event - Event name
 * @param {object} metadata - Additional metadata
 * @param {string} level - Log level (info, warn, error)
 */
export function logStructured(correlationId, event, metadata = {}, level = 'info') {
  const log = createStructuredLog(correlationId, event, metadata);
  
  switch (level) {
    case 'error':
      console.error(JSON.stringify(log));
      break;
    case 'warn':
      console.warn(JSON.stringify(log));
      break;
    default:
      console.log(JSON.stringify(log));
  }
}

/**
 * Log diagnostic info about auth headers/cookies (redacted)
 * Used by protected handlers to diagnose authentication issues
 * @param {string} handler - Handler name for log prefix
 * @param {object} event - Lambda event object
 */
export function logAuthDiagnostics(handler, event) {
  const hasCookiesArray = Array.isArray(event.cookies) && event.cookies.length > 0;
  const hasHeaderCookie = !!(event.headers?.cookie || event.headers?.Cookie);
  const hasAuthHeader = !!(event.headers?.authorization || event.headers?.Authorization);
  
  console.log(`[${handler}] [AUTH_DIAG]`, {
    hasCookiesArray,
    cookiesArrayLength: hasCookiesArray ? event.cookies.length : 0,
    hasHeaderCookie,
    hasAuthHeader,
    timestamp: new Date().toISOString(),
  });
}

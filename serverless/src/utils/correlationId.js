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

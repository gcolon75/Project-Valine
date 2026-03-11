/**
 * Authentication middleware utilities for serverless handlers
 */

import { getUserIdFromEvent } from './tokenManager.js';

/**
 * No-op: email verification is disabled for beta.
 * Always returns null so callers proceed without a 403.
 *
 * @returns {Promise<null>}
 */
export async function requireEmailVerified(_userId) {
  // Email verification disabled for beta — always passes
  return null;
}

/**
 * Get authenticated user ID from event (cookie or header)
 * @param {object} event - Lambda event object
 * @returns {string|null} User ID or null
 */
export function getAuthenticatedUserId(event) {
  return getUserIdFromEvent(event);
}

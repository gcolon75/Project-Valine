/**
 * Authentication middleware utilities for serverless handlers
 */

import { getUserIdFromEvent } from './tokenManager.js';

/**
 * Check if user's email is verified
 * Returns error response if not verified, null otherwise
 * 
 * Email verification disabled for beta — always passes.
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<Object|null>} Error response or null if verified
 */
export async function requireEmailVerified(userId) {
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

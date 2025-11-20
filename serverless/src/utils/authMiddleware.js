/**
 * Authentication middleware utilities for serverless handlers
 */

import { getPrisma } from '../db/client.js';
import { error } from './headers.js';
import { getUserIdFromEvent } from './tokenManager.js';

/**
 * Check if user's email is verified
 * Returns error response if not verified, null otherwise
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<Object|null>} Error response or null if verified
 */
export async function requireEmailVerified(userId) {
  if (!userId) {
    return error(401, 'Unauthorized - No valid token provided');
  }

  const prisma = getPrisma();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true }
  });

  if (!user) {
    return error(404, 'User not found');
  }

  if (!user.emailVerified) {
    return error(403, 'Email verification required. Please verify your email address to access this resource.');
  }

  return null; // User is verified, no error
}

/**
 * Get authenticated user ID from event (cookie or header)
 * @param {object} event - Lambda event object
 * @returns {string|null} User ID or null
 */
export function getAuthenticatedUserId(event) {
  return getUserIdFromEvent(event);
}

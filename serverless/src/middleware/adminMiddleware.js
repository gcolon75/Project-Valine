/**
 * Admin RBAC (Role-Based Access Control) middleware
 * Checks if user has admin privileges based on ADMIN_ROLE_IDS
 */

import { getPrisma } from '../db/client.js';
import { error } from '../utils/headers.js';
import { getAuthenticatedUserId } from '../utils/authMiddleware.js';

/**
 * Get admin role IDs from environment
 * @returns {string[]} Array of admin user IDs
 */
function getAdminRoleIds() {
  const adminIds = process.env.ADMIN_ROLE_IDS || '';
  return adminIds.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Check if user is admin
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin(userId) {
  if (!userId) return false;
  
  const adminIds = getAdminRoleIds();
  
  // If no admin IDs configured, fall back to checking user role in database
  if (adminIds.length === 0) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    
    // Check if user has an admin-like role
    return user && (user.role === 'admin' || user.role === 'moderator');
  }
  
  // Check if userId is in admin list
  return adminIds.includes(userId);
}

/**
 * Require admin access middleware
 * Returns error response if user is not admin, null otherwise
 * 
 * @param {object} event - Lambda event object
 * @returns {Promise<Object|null>} Error response or null if authorized
 */
export async function requireAdmin(event) {
  const userId = getAuthenticatedUserId(event);
  
  if (!userId) {
    return error(401, 'Unauthorized - Authentication required');
  }
  
  const isAdminUser = await isAdmin(userId);
  
  if (!isAdminUser) {
    return error(403, 'Forbidden - Admin access required');
  }
  
  return null; // User is admin, no error
}

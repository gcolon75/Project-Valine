/**
 * Rate limiting configuration for different endpoint types
 * Defines request limits and time windows for various API routes
 */

export const rateLimitConfig = {
  // Authentication endpoints - strict limits to prevent brute force
  auth: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },

  // Email verification resend - very strict to prevent abuse
  emailVerification: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour (5 per hour)
    message: 'Too many verification email requests. Please try again later.',
  },

  // Moderation reports - strict limits to prevent spam
  reports: {
    maxRequests: parseInt(process.env.REPORTS_MAX_PER_HOUR || '5', 10),
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many reports submitted. Please try again later.',
  },

  // Write endpoints (POST/PUT/DELETE) - moderate limits for authenticated users
  write: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many write requests. Please try again later.',
  },

  // Read endpoints (GET) - lenient limits
  read: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many read requests. Please try again later.',
  },
};

/**
 * Get rate limit configuration for a specific route and method
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {object} Rate limit configuration
 */
export function getRateLimitConfig(path, method) {
  // Email verification resend gets very strict limits
  if (path === '/auth/resend-verification') {
    return rateLimitConfig.emailVerification;
  }

  // Reports endpoint gets strict limits
  if (path === '/reports' && method === 'POST') {
    return rateLimitConfig.reports;
  }

  // Auth endpoints get strict limits
  if (path.startsWith('/auth/')) {
    return rateLimitConfig.auth;
  }

  // Write operations get moderate limits
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    return rateLimitConfig.write;
  }

  // Read operations get lenient limits
  return rateLimitConfig.read;
}

/**
 * Check if rate limiting should be applied to this route
 * @param {string} path - Request path
 * @returns {boolean} True if rate limiting should be applied
 */
export function shouldRateLimit(path) {
  // Skip rate limiting for health checks
  if (path === '/health' || path === '/meta') {
    return false;
  }

  return true;
}

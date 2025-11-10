/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter for MVP
 * Production should use Redis or a distributed solution
 */

const rateLimitStore = new Map();

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let cleanupInterval = null;

/**
 * Start cleanup interval to remove expired entries
 */
function startCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetAt < now) {
          rateLimitStore.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
    
    // Don't keep the process alive for cleanup
    cleanupInterval.unref();
  }
}

/**
 * Create a rate limiter middleware
 * @param {object} options - Rate limiter configuration
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {string} options.message - Error message
 * @param {function} options.keyGenerator - Function to generate rate limit key
 * @returns {function} - Express middleware
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 10,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => {
      // Use IP address by default
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  } = options;
  
  // Start cleanup when first limiter is created
  startCleanup();
  
  return function rateLimiterMiddleware(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || record.resetAt < now) {
      // Create new record or reset expired one
      record = {
        count: 0,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, record);
    }
    
    record.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
    
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter,
      });
    }
    
    next();
  };
}

/**
 * Signup rate limiter - 10 requests per minute per IP
 */
export const signupRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
  message: 'Too many signup attempts from this IP, please try again later',
  keyGenerator: (req) => `signup:${req.ip || 'unknown'}`,
});

/**
 * Login rate limiter - 5 requests per minute per IP
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 5,
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => `login:${req.ip || 'unknown'}`,
});

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore() {
  rateLimitStore.clear();
}

/**
 * Stop cleanup interval (for testing)
 */
export function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

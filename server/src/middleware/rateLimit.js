/**
 * Simple rate limiting middleware for API endpoints
 * Uses in-memory storage for tracking request counts
 */

import { createError } from '../utils/validators.js'

/**
 * In-memory store for rate limit tracking
 * Structure: { userId: { count: number, resetTime: number } }
 */
const rateLimitStore = new Map()

/**
 * Clean up expired entries periodically
 */
let cleanupInterval = null

function startCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetTime < now) {
          rateLimitStore.delete(key)
        }
      }
    }, 60000) // Clean up every minute
    
    // Allow cleanup to be stopped (useful for tests)
    if (cleanupInterval.unref) {
      cleanupInterval.unref()
    }
  }
}

function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

// Start cleanup on module load
startCleanup()

/**
 * Rate limiting middleware
 * 
 * @param {object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.maxRequests - Maximum requests per window (default: 10)
 * @param {string} options.keyExtractor - Function to extract key from request (default: uses userId from params)
 * @returns {Function} Express middleware
 */
export function rateLimitMiddleware(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 10,
    keyExtractor = (req) => req.params.userId || req.ip
  } = options

  return (req, res, next) => {
    const key = keyExtractor(req)
    
    if (!key) {
      // If no key can be extracted, allow the request
      return next()
    }

    const now = Date.now()
    const record = rateLimitStore.get(key)

    if (!record || record.resetTime < now) {
      // First request in window or window has expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      
      // Set rate limit headers
      res.set('X-RateLimit-Limit', maxRequests.toString())
      res.set('X-RateLimit-Remaining', (maxRequests - 1).toString())
      res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString())
      
      return next()
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      
      res.set('X-RateLimit-Limit', maxRequests.toString())
      res.set('X-RateLimit-Remaining', '0')
      res.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
      res.set('Retry-After', retryAfter.toString())
      
      return res.status(429).json(
        createError('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', {
          retryAfter,
          resetTime: new Date(record.resetTime).toISOString()
        })
      )
    }

    // Increment count
    record.count++
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString())
    res.set('X-RateLimit-Remaining', (maxRequests - record.count).toString())
    res.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
    
    next()
  }
}

/**
 * Reset rate limit for a specific key (useful for testing)
 * @param {string} key - Key to reset
 */
export function resetRateLimit(key) {
  rateLimitStore.delete(key)
}

/**
 * Clear all rate limit records (useful for testing)
 */
export function clearRateLimits() {
  rateLimitStore.clear()
}

/**
 * Stop the cleanup interval (useful for testing and shutdown)
 */
export { stopCleanup }

export default rateLimitMiddleware

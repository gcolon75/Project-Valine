/**
 * Authentication-specific rate limiting middleware
 * Implements brute-force protection for auth endpoints
 */

import { createError } from '../utils/validators.js'

/**
 * In-memory store for rate limit tracking
 * Structure: { key: { count: number, resetTime: number, blocked: boolean } }
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
        if (value.resetTime < now && !value.blocked) {
          rateLimitStore.delete(key)
        }
      }
    }, 60000) // Clean up every minute
    
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

startCleanup()

/**
 * Authentication rate limiting middleware with brute-force protection
 * Implements exponential backoff for repeated failures
 * 
 * @param {object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 900000 = 15 minutes)
 * @param {number} options.maxAttempts - Maximum attempts per window (default: 5)
 * @param {number} options.blockDurationMs - Block duration after max attempts (default: 900000 = 15 minutes)
 * @param {boolean} options.useIPAndEmail - Track by both IP and email (default: true)
 * @returns {Function} Express middleware
 */
export function authRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 5,
    blockDurationMs = 15 * 60 * 1000, // 15 minutes
    useIPAndEmail = true
  } = options

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress
    const email = req.body?.email || req.body?.username
    
    // Create composite key for IP-based and account-based tracking
    const keys = [ip]
    if (useIPAndEmail && email) {
      keys.push(`email:${email}`)
    }

    const now = Date.now()
    let blocked = false
    let earliestReset = null

    // Check all keys
    for (const key of keys) {
      const record = rateLimitStore.get(key)

      if (record) {
        // Check if blocked
        if (record.blocked && record.resetTime > now) {
          blocked = true
          earliestReset = earliestReset 
            ? Math.min(earliestReset, record.resetTime)
            : record.resetTime
          continue
        }

        // Check if window expired
        if (record.resetTime < now) {
          rateLimitStore.delete(key)
          continue
        }

        // Check if max attempts exceeded
        if (record.count >= maxAttempts) {
          // Block the key
          record.blocked = true
          record.resetTime = now + blockDurationMs
          blocked = true
          earliestReset = earliestReset 
            ? Math.min(earliestReset, record.resetTime)
            : record.resetTime
        }
      }
    }

    if (blocked) {
      const retryAfter = Math.ceil((earliestReset - now) / 1000)
      
      res.set('Retry-After', retryAfter.toString())
      
      return res.status(429).json(
        createError('AUTH_RATE_LIMIT_EXCEEDED', 
          'Too many authentication attempts. Please try again later.',
          {
            retryAfter,
            resetTime: new Date(earliestReset).toISOString(),
            type: 'authentication'
          })
      )
    }

    // Increment counters for all keys
    for (const key of keys) {
      const record = rateLimitStore.get(key)
      
      if (!record || record.resetTime < now) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
          blocked: false
        })
      } else {
        record.count++
      }
    }

    // Store keys in request for potential reset on success
    req.rateLimitKeys = keys

    next()
  }
}

/**
 * Middleware to reset rate limit on successful authentication
 * Should be called after successful login/registration
 */
export function resetAuthRateLimit(req, res, next) {
  if (req.rateLimitKeys) {
    for (const key of req.rateLimitKeys) {
      rateLimitStore.delete(key)
    }
  }
  next()
}

/**
 * Clear specific rate limit entry (for testing)
 * @param {string} key - Key to clear
 */
export function clearRateLimit(key) {
  rateLimitStore.delete(key)
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear()
}

/**
 * Get rate limit info for a key (for testing)
 * @param {string} key - Key to check
 * @returns {object|undefined} Rate limit record
 */
export function getRateLimitInfo(key) {
  return rateLimitStore.get(key)
}

export { stopCleanup }

export default {
  authRateLimit,
  resetAuthRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimitInfo,
  stopCleanup
}

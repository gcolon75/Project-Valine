import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  authRateLimit,
  resetAuthRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimitInfo,
  stopCleanup
} from '../authRateLimit.js'

describe('Auth Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits()
  })

  afterEach(() => {
    clearAllRateLimits()
    stopCleanup()
  })

  describe('authRateLimit middleware', () => {
    it('should allow requests within limit', async () => {
      const middleware = authRateLimit({ maxAttempts: 3, windowMs: 60000 })
      
      const req = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' }
      }
      const res = {
        status: () => res,
        json: () => res,
        set: () => res
      }
      let nextCalled = false
      const next = () => { nextCalled = true }

      // First request
      middleware(req, res, next)
      expect(nextCalled).toBe(true)

      // Second request
      nextCalled = false
      middleware(req, res, next)
      expect(nextCalled).toBe(true)

      // Third request
      nextCalled = false
      middleware(req, res, next)
      expect(nextCalled).toBe(true)
    })

    it('should block requests exceeding limit', async () => {
      const middleware = authRateLimit({ maxAttempts: 2, windowMs: 60000 })
      
      const req = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' }
      }
      let responseStatus = null
      let responseBody = null
      const res = {
        status: (code) => {
          responseStatus = code
          return res
        },
        json: (data) => {
          responseBody = data
          return res
        },
        set: () => res
      }
      const next = () => {}

      // First two requests should pass
      middleware(req, res, next)
      middleware(req, res, next)

      // Third request should be blocked
      middleware(req, res, next)
      
      expect(responseStatus).toBe(429)
      expect(responseBody).toBeDefined()
      expect(responseBody.code || responseBody.error).toBe('AUTH_RATE_LIMIT_EXCEEDED')
      expect((responseBody.details && responseBody.details.retryAfter) || responseBody.retryAfter).toBeDefined()
    })

    it('should track by IP address', async () => {
      const middleware = authRateLimit({ maxAttempts: 2, windowMs: 60000 })
      
      const req1 = { ip: '192.168.1.1', body: {} }
      const req2 = { ip: '192.168.1.2', body: {} }
      const res = {
        status: () => res,
        json: () => res,
        set: () => res
      }
      let nextCalled = 0
      const next = () => { nextCalled++ }

      // Different IPs should have separate limits
      middleware(req1, res, next)
      middleware(req1, res, next)
      middleware(req2, res, next)
      middleware(req2, res, next)

      expect(nextCalled).toBe(4)
    })

    it('should track by email address', async () => {
      const middleware = authRateLimit({ 
        maxAttempts: 2, 
        windowMs: 60000,
        useIPAndEmail: true 
      })
      
      const req1 = { 
        ip: '192.168.1.1', 
        body: { email: 'user1@example.com' } 
      }
      const req2 = { 
        ip: '192.168.1.2', 
        body: { email: 'user1@example.com' } 
      }
      let blocked = false
      const res = {
        status: (code) => {
          if (code === 429) blocked = true
          return res
        },
        json: () => res,
        set: () => res
      }
      const next = () => {}

      // Same email from different IPs should be blocked
      middleware(req1, res, next)
      middleware(req1, res, next)
      middleware(req2, res, next) // Third attempt with same email
      
      expect(blocked).toBe(true)
    })

    it('should reset rate limit on successful auth', async () => {
      const middleware = authRateLimit({ maxAttempts: 2, windowMs: 60000 })
      
      const req = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' }
      }
      const res = {
        status: () => res,
        json: () => res,
        set: () => res
      }
      let nextCalled = 0
      const next = () => { nextCalled++ }

      // Make two attempts
      middleware(req, res, next)
      middleware(req, res, next)

      // Reset rate limit
      resetAuthRateLimit(req, res, next)

      // Should be able to make more attempts
      middleware(req, res, next)
      middleware(req, res, next)

      expect(nextCalled).toBe(5) // 2 + 1 (reset) + 2 = 5
    })

    it('should include retry-after header', async () => {
      const middleware = authRateLimit({ maxAttempts: 1, windowMs: 60000 })
      
      const req = {
        ip: '192.168.1.1',
        body: {}
      }
      let retryAfterHeader = null
      const res = {
        status: () => res,
        json: () => res,
        set: (key, value) => {
          if (key === 'Retry-After') {
            retryAfterHeader = value
          }
          return res
        }
      }
      const next = () => {}

      // First request passes
      middleware(req, res, next)
      
      // Second request is blocked
      middleware(req, res, next)
      
      expect(retryAfterHeader).toBeDefined()
      expect(parseInt(retryAfterHeader)).toBeGreaterThan(0)
    })
  })

  describe('clearRateLimit', () => {
    it('should clear specific rate limit entry', async () => {
      const middleware = authRateLimit({ maxAttempts: 1, windowMs: 60000 })
      
      const req = { ip: '192.168.1.1', body: {} }
      const res = {
        status: () => res,
        json: () => res,
        set: () => res
      }
      let nextCalled = 0
      const next = () => { nextCalled++ }

      // Make one attempt
      middleware(req, res, next)
      
      // Verify rate limit exists
      const info = getRateLimitInfo('192.168.1.1')
      expect(info).toBeDefined()
      expect(info.count).toBe(1)
      
      // Clear rate limit
      clearRateLimit('192.168.1.1')
      
      // Verify rate limit is cleared
      const infoAfter = getRateLimitInfo('192.168.1.1')
      expect(infoAfter).toBeUndefined()
      
      // Should be able to make more attempts
      middleware(req, res, next)
      expect(nextCalled).toBe(2)
    })
  })

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', async () => {
      const middleware = authRateLimit({ maxAttempts: 1, windowMs: 60000 })
      
      const req1 = { ip: '192.168.1.1', body: {} }
      const req2 = { ip: '192.168.1.2', body: {} }
      const res = {
        status: () => res,
        json: () => res,
        set: () => res
      }
      const next = () => {}

      // Make attempts from different IPs
      middleware(req1, res, next)
      middleware(req2, res, next)
      
      // Verify rate limits exist
      expect(getRateLimitInfo('192.168.1.1')).toBeDefined()
      expect(getRateLimitInfo('192.168.1.2')).toBeDefined()
      
      // Clear all
      clearAllRateLimits()
      
      // Verify all are cleared
      expect(getRateLimitInfo('192.168.1.1')).toBeUndefined()
      expect(getRateLimitInfo('192.168.1.2')).toBeUndefined()
    })
  })

  describe('getRateLimitInfo', () => {
    it('should return rate limit info', async () => {
      const middleware = authRateLimit({ maxAttempts: 5, windowMs: 60000 })
      
      const req = { ip: '192.168.1.1', body: {} }
      const res = {
        status: () => res,
        json: () => res,
        set: () => res
      }
      const next = () => {}

      // Make two attempts
      middleware(req, res, next)
      middleware(req, res, next)
      
      const info = getRateLimitInfo('192.168.1.1')
      expect(info).toBeDefined()
      expect(info.count).toBe(2)
      expect(info.resetTime).toBeGreaterThan(Date.now())
      expect(info.blocked).toBe(false)
    })

    it('should return undefined for non-existent key', () => {
      const info = getRateLimitInfo('non-existent-key')
      expect(info).toBeUndefined()
    })
  })
})

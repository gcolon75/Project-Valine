/**
 * Unit tests for Rate Limit middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimitMiddleware, resetRateLimit, clearRateLimits } from '../rateLimit.js'

describe('Rate Limit Middleware', () => {
  let req, res, next

  beforeEach(() => {
    clearRateLimits()

    req = {
      params: { userId: 'test_user' },
      ip: '127.0.0.1'
    }

    res = {
      json: vi.fn(),
      set: vi.fn(),
      status: vi.fn(() => res)
    }

    next = vi.fn()
  })

  afterEach(() => {
    clearRateLimits()
  })

  describe('Basic functionality', () => {
    it('should call next() for first request', () => {
      const middleware = rateLimitMiddleware()
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should set rate limit headers on first request', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 10 })
      middleware(req, res, next)

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '10')
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '9')
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String))
    })

    it('should allow requests up to limit', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 3 })

      // First request
      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      // Second request
      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(2)

      // Third request
      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(3)
    })

    it('should block requests after limit exceeded', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 2 })

      // First request - allowed
      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      // Second request - allowed
      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(2)

      // Reset mocks for third request
      res.status.mockClear()
      res.json.mockClear()

      // Third request - should be blocked
      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(2) // Still 2, not called again
      expect(res.status).toHaveBeenCalledWith(429)
    })
  })

  describe('Rate limit headers', () => {
    it('should decrement remaining count with each request', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 5 })

      // First request
      middleware(req, res, next)
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4')

      res.set.mockClear()

      // Second request
      middleware(req, res, next)
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '3')

      res.set.mockClear()

      // Third request
      middleware(req, res, next)
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '2')
    })

    it('should set remaining to 0 when limit exceeded', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      // First request (uses the one allowed)
      middleware(req, res, next)

      res.set.mockClear()

      // Second request (over limit)
      middleware(req, res, next)
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
    })

    it('should set Retry-After header when rate limited', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      middleware(req, res, next)
      res.set.mockClear()

      // Exceed limit
      middleware(req, res, next)
      
      expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(String))
      const retryAfterCall = res.set.mock.calls.find(call => call[0] === 'Retry-After')
      expect(parseInt(retryAfterCall[1])).toBeGreaterThan(0)
    })
  })

  describe('Configuration options', () => {
    it('should use custom maxRequests', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 2 })

      middleware(req, res, next)
      middleware(req, res, next)
      
      res.status.mockClear()
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(429)
    })

    it('should use custom windowMs', () => {
      const middleware = rateLimitMiddleware({ 
        maxRequests: 1,
        windowMs: 100 // 100ms window
      })

      // First request
      middleware(req, res, next)
      
      res.status.mockClear()
      
      // Second request immediately (should be blocked)
      middleware(req, res, next)
      expect(res.status).toHaveBeenCalledWith(429)
    })

    it('should use custom key extractor', () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 1,
        keyExtractor: (req) => req.params.customId
      })

      const req1 = { params: { customId: 'custom_1' } }
      const req2 = { params: { customId: 'custom_2' } }

      // Different keys should have separate limits
      middleware(req1, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      middleware(req2, res, next)
      expect(next).toHaveBeenCalledTimes(2)
    })

    it('should allow request when key extractor returns null', () => {
      const middleware = rateLimitMiddleware({
        keyExtractor: () => null
      })

      middleware(req, res, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('Error response format', () => {
    it('should return proper error structure when rate limited', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      // Use up the limit
      middleware(req, res, next)

      res.json.mockClear()
      res.status.mockClear()

      // Exceed limit
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(429)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
            message: expect.any(String),
            details: expect.objectContaining({
              retryAfter: expect.any(Number),
              resetTime: expect.any(String)
            })
          })
        })
      )
    })

    it('should include retryAfter in seconds', () => {
      const middleware = rateLimitMiddleware({ 
        maxRequests: 1,
        windowMs: 60000 // 60 seconds
      })

      middleware(req, res, next)
      middleware(req, res, next)

      const errorData = res.json.mock.calls[0][0]
      expect(errorData.error.details.retryAfter).toBeGreaterThan(0)
      expect(errorData.error.details.retryAfter).toBeLessThanOrEqual(60)
    })
  })

  describe('Per-user rate limiting', () => {
    it('should track separate limits for different users', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      const req1 = { params: { userId: 'user1' }, ip: '127.0.0.1' }
      const req2 = { params: { userId: 'user2' }, ip: '127.0.0.2' }

      // User 1 uses their limit
      middleware(req1, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      // User 2 should still be able to make requests
      middleware(req2, res, next)
      expect(next).toHaveBeenCalledTimes(2)
    })

    it('should block only the user who exceeded limit', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      const req1 = { params: { userId: 'user1' }, ip: '127.0.0.1' }
      const req2 = { params: { userId: 'user2' }, ip: '127.0.0.2' }

      // User 1 exceeds limit
      middleware(req1, res, next)
      
      res.status.mockClear()
      middleware(req1, res, next)
      expect(res.status).toHaveBeenCalledWith(429)

      res.status.mockClear()

      // User 2 should still be allowed
      middleware(req2, res, next)
      expect(res.status).not.toHaveBeenCalledWith(429)
      expect(next).toHaveBeenCalledTimes(2)
    })
  })

  describe('Utility functions', () => {
    it('should reset rate limit for specific key', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      // Exceed limit
      middleware(req, res, next)
      
      res.status.mockClear()
      middleware(req, res, next)
      expect(res.status).toHaveBeenCalledWith(429)

      // Reset limit
      resetRateLimit('test_user')

      res.status.mockClear()
      next.mockClear()

      // Should be allowed again
      middleware(req, res, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalledWith(429)
    })

    it('should clear all rate limits', () => {
      const middleware = rateLimitMiddleware({ maxRequests: 1 })

      const req1 = { params: { userId: 'user1' }, ip: '127.0.0.1' }
      const req2 = { params: { userId: 'user2' }, ip: '127.0.0.2' }

      // Both users exceed limit
      middleware(req1, res, next)
      middleware(req1, res, next)
      
      middleware(req2, res, next)
      middleware(req2, res, next)

      // Clear all
      clearRateLimits()

      res.status.mockClear()
      next.mockClear()

      // Both should be allowed again
      middleware(req1, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      middleware(req2, res, next)
      expect(next).toHaveBeenCalledTimes(2)
    })
  })

  describe('Window expiration', () => {
    it('should reset count after window expires', async () => {
      const middleware = rateLimitMiddleware({ 
        maxRequests: 1,
        windowMs: 50 // 50ms window for testing
      })

      // Use up the limit
      middleware(req, res, next)
      
      res.status.mockClear()
      next.mockClear()

      // Immediately exceeds limit
      middleware(req, res, next)
      expect(res.status).toHaveBeenCalledWith(429)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 60))

      res.status.mockClear()
      next.mockClear()

      // Should be allowed again
      middleware(req, res, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalledWith(429)
    })
  })
})

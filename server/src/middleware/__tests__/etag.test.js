/**
 * Unit tests for ETag middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { etagMiddleware } from '../etag.js'

describe('ETag Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      method: 'GET',
      get: vi.fn()
    }

    res = {
      json: vi.fn(),
      set: vi.fn(),
      status: vi.fn(() => res),
      end: vi.fn()
    }

    next = vi.fn()
  })

  describe('Basic functionality', () => {
    it('should call next() for GET requests', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should call next() for HEAD requests', () => {
      req.method = 'HEAD'
      const middleware = etagMiddleware()
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should call next() for non-GET/HEAD requests without modification', () => {
      req.method = 'POST'
      const middleware = etagMiddleware()
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      // res.json should not be modified for POST
      res.json({ test: 'data' })
      expect(res.json).toHaveBeenCalled()
    })
  })

  describe('ETag generation', () => {
    it('should add ETag header to response', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      const testData = { test: 'data' }
      res.json(testData)

      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^"[a-f0-9]+"$/))
    })

    it('should add Cache-Control header with default max-age', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      res.json({ test: 'data' })

      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300')
    })

    it('should use custom max-age when provided', () => {
      const middleware = etagMiddleware({ maxAge: 600 })
      middleware(req, res, next)

      res.json({ test: 'data' })

      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=600')
    })

    it('should generate same ETag for identical content', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      const testData = { id: 1, name: 'test' }
      
      // First call
      res.json(testData)
      const firstEtag = res.set.mock.calls.find(call => call[0] === 'ETag')[1]

      // Reset mocks
      res.set.mockClear()

      // Second call with same data
      res.json(testData)
      const secondEtag = res.set.mock.calls.find(call => call[0] === 'ETag')[1]

      expect(firstEtag).toBe(secondEtag)
    })

    it('should generate different ETags for different content', () => {
      const middleware = etagMiddleware()
      
      // First request
      middleware(req, res, next)
      res.json({ id: 1 })
      const firstEtag = res.set.mock.calls.find(call => call[0] === 'ETag')[1]

      // Reset for second request
      res.set.mockClear()
      const req2 = { method: 'GET', get: vi.fn() }
      const res2 = {
        json: vi.fn(),
        set: vi.fn(),
        status: vi.fn(() => res2),
        end: vi.fn()
      }

      // Second request with different data
      middleware(req2, res2, next)
      res2.json({ id: 2 })
      const secondEtag = res2.set.mock.calls.find(call => call[0] === 'ETag')[1]

      expect(firstEtag).not.toBe(secondEtag)
    })
  })

  describe('Conditional requests (If-None-Match)', () => {
    it('should return 304 when ETag matches', () => {
      const testData = { test: 'data' }
      const middleware = etagMiddleware()
      
      // First request to get the ETag
      middleware(req, res, next)
      res.json(testData)
      
      const etag = res.set.mock.calls.find(call => call[0] === 'ETag')[1]
      
      // Reset mocks for second request
      res.set.mockClear()
      res.status.mockClear()
      res.end.mockClear()
      
      // Second request with matching ETag
      req.get.mockReturnValue(etag)
      const req2 = { method: 'GET', get: vi.fn(() => etag) }
      const res2 = {
        json: vi.fn(),
        set: vi.fn(),
        status: vi.fn(() => res2),
        end: vi.fn()
      }
      const next2 = vi.fn()
      
      middleware(req2, res2, next2)
      res2.json(testData)

      expect(res2.status).toHaveBeenCalledWith(304)
      expect(res2.end).toHaveBeenCalled()
    })

    it('should return 200 when ETag does not match', () => {
      req.get.mockReturnValue('"different-etag"')
      
      const middleware = etagMiddleware()
      middleware(req, res, next)

      const testData = { test: 'data' }
      const result = res.json(testData)

      // Should not call status(304) or end()
      expect(res.status).not.toHaveBeenCalledWith(304)
      expect(res.end).not.toHaveBeenCalled()
    })

    it('should return full response when If-None-Match is not provided', () => {
      req.get.mockReturnValue(null)
      
      const middleware = etagMiddleware()
      middleware(req, res, next)

      const testData = { test: 'data' }
      res.json(testData)

      expect(res.status).not.toHaveBeenCalledWith(304)
      expect(res.set).toHaveBeenCalledWith('ETag', expect.any(String))
    })
  })

  describe('Error handling', () => {
    it('should handle null data gracefully', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      expect(() => res.json(null)).not.toThrow()
      expect(res.set).toHaveBeenCalledWith('ETag', expect.any(String))
    })

    it('should handle undefined data gracefully', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      expect(() => res.json(undefined)).not.toThrow()
      expect(res.set).toHaveBeenCalledWith('ETag', expect.any(String))
    })

    it('should handle arrays', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      const arrayData = [{ id: 1 }, { id: 2 }]
      res.json(arrayData)

      expect(res.set).toHaveBeenCalledWith('ETag', expect.any(String))
    })

    it('should handle strings', () => {
      const middleware = etagMiddleware()
      middleware(req, res, next)

      res.json('simple string')

      expect(res.set).toHaveBeenCalledWith('ETag', expect.any(String))
    })
  })
})

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  setCSRFToken,
  verifyCSRFToken,
  clearCSRFToken,
  getCSRFToken
} from '../csrf.js'

describe('CSRF Middleware', () => {
  // Mock environment for tests
  const originalEnv = process.env.CSRF_ENABLED

  beforeEach(() => {
    process.env.CSRF_ENABLED = 'true'
  })

  afterAll(() => {
    process.env.CSRF_ENABLED = originalEnv
  })

  describe('setCSRFToken', () => {
    it('should set CSRF token in cookie and locals', () => {
      const req = { ip: '192.168.1.1' }
      let cookieSet = false
      let cookieValue = null
      const res = {
        cookie: (name, value, options) => {
          if (name === 'csrf-token') {
            cookieSet = true
            cookieValue = value
          }
        },
        locals: {}
      }
      let nextCalled = false
      const next = () => { nextCalled = true }

      setCSRFToken(req, res, next)

      expect(nextCalled).toBe(true)
      expect(cookieSet).toBe(true)
      expect(cookieValue).toBeDefined()
      expect(cookieValue.length).toBe(64) // 32 bytes hex
      expect(res.locals.csrfToken).toBe(cookieValue)
    })

    it('should skip if CSRF is disabled', () => {
      process.env.CSRF_ENABLED = 'false'

      const req = {}
      const res = { cookie: () => {}, locals: {} }
      let nextCalled = false
      const next = () => { nextCalled = true }

      setCSRFToken(req, res, next)

      expect(nextCalled).toBe(true)
      expect(res.locals.csrfToken).toBeUndefined()
    })

    it('should generate different tokens for different sessions', () => {
      const req1 = { ip: '192.168.1.1' }
      const req2 = { ip: '192.168.1.2' }
      const res1 = { cookie: () => {}, locals: {} }
      const res2 = { cookie: () => {}, locals: {} }
      const next = () => {}

      setCSRFToken(req1, res1, next)
      setCSRFToken(req2, res2, next)

      expect(res1.locals.csrfToken).toBeDefined()
      expect(res2.locals.csrfToken).toBeDefined()
      expect(res1.locals.csrfToken).not.toBe(res2.locals.csrfToken)
    })
  })

  describe('verifyCSRFToken', () => {
    it('should skip verification for safe methods', () => {
      const req = { method: 'GET' }
      const res = {}
      let nextCalled = false
      const next = () => { nextCalled = true }

      verifyCSRFToken(req, res, next)

      expect(nextCalled).toBe(true)
    })

    it('should require token for POST requests', () => {
      const req = { method: 'POST', ip: '192.168.1.1', body: {} }
      let statusCode = null
      let responseBody = null
      const res = {
        status: (code) => {
          statusCode = code
          return res
        },
        json: (data) => {
          responseBody = data
          return res
        }
      }
      const next = () => {}

      verifyCSRFToken(req, res, next)

      expect(statusCode).toBe(403)
      expect(responseBody.error).toBe('CSRF_TOKEN_MISSING')
    })

    it('should accept valid token from header', () => {
      const req = { ip: '192.168.1.1' }
      const res = { cookie: () => {}, locals: {} }
      const next = () => {}

      // Generate token first
      setCSRFToken(req, res, next)
      const token = res.locals.csrfToken

      // Now verify
      const req2 = {
        method: 'POST',
        ip: '192.168.1.1',
        header: (name) => {
          if (name === 'x-csrf-token') return token
          return null
        },
        body: {}
      }
      let nextCalled = false
      const next2 = () => { nextCalled = true }

      verifyCSRFToken(req2, res, next2)

      expect(nextCalled).toBe(true)
    })

    it('should accept valid token from body', () => {
      const req = { ip: '192.168.1.1' }
      const res = { cookie: () => {}, locals: {} }
      const next = () => {}

      // Generate token first
      setCSRFToken(req, res, next)
      const token = res.locals.csrfToken

      // Now verify
      const req2 = {
        method: 'POST',
        ip: '192.168.1.1',
        header: () => null,
        body: { _csrf: token }
      }
      let nextCalled = false
      const next2 = () => { nextCalled = true }

      verifyCSRFToken(req2, res, next2)

      expect(nextCalled).toBe(true)
    })

    it('should reject invalid token', () => {
      const req = { ip: '192.168.1.1' }
      const res = { cookie: () => {}, locals: {} }
      const next = () => {}

      // Generate token first
      setCSRFToken(req, res, next)

      // Try with wrong token
      const req2 = {
        method: 'POST',
        ip: '192.168.1.1',
        header: (name) => {
          if (name === 'x-csrf-token') return 'wrong-token'
          return null
        },
        body: {}
      }
      let statusCode = null
      const res2 = {
        status: (code) => {
          statusCode = code
          return res2
        },
        json: () => res2
      }

      verifyCSRFToken(req2, res2, () => {})

      expect(statusCode).toBe(403)
    })

    it('should skip if CSRF is disabled', () => {
      process.env.CSRF_ENABLED = 'false'

      const req = { method: 'POST', body: {} }
      const res = {}
      let nextCalled = false
      const next = () => { nextCalled = true }

      verifyCSRFToken(req, res, next)

      expect(nextCalled).toBe(true)
    })
  })

  describe('clearCSRFToken', () => {
    it('should clear stored token', () => {
      const sessionId = 'test-session'
      const req = { ip: '192.168.1.1', sessionId }
      const res = { cookie: () => {}, locals: {} }
      const next = () => {}

      // Generate token
      setCSRFToken(req, res, next)
      const token = getCSRFToken(sessionId)
      expect(token).toBeDefined()

      // Clear token
      clearCSRFToken(sessionId)
      const tokenAfter = getCSRFToken(sessionId)
      expect(tokenAfter).toBeUndefined()
    })
  })

  describe('getCSRFToken', () => {
    it('should return stored token', () => {
      const sessionId = 'test-session'
      const req = { ip: '192.168.1.1', sessionId }
      const res = { cookie: () => {}, locals: {} }
      const next = () => {}

      setCSRFToken(req, res, next)
      const storedToken = getCSRFToken(sessionId)

      expect(storedToken).toBe(res.locals.csrfToken)
    })

    it('should return undefined for non-existent session', () => {
      const token = getCSRFToken('non-existent-session')
      expect(token).toBeUndefined()
    })
  })
})

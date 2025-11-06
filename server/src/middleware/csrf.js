/**
 * CSRF Protection Middleware
 * Implements anti-CSRF token validation for cookie-based authentication
 */

import crypto from 'crypto'

const CSRF_ENABLED = process.env.CSRF_ENABLED === 'true'
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

// In-memory store for CSRF tokens (use Redis in production for multi-instance)
const csrfTokens = new Map()

/**
 * Generate a CSRF token
 * @returns {string} CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Middleware to generate and set CSRF token
 * Should be called on GET requests to pages with forms
 */
export function setCSRFToken(req, res, next) {
  if (!CSRF_ENABLED) {
    return next()
  }

  // Generate token
  const token = generateCSRFToken()
  
  // Store token in memory (in production, use Redis with session ID as key)
  const sessionId = req.sessionId || req.ip
  csrfTokens.set(sessionId, token)
  
  // Set token in cookie
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Client needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  })
  
  // Also make it available in response locals
  res.locals.csrfToken = token
  
  next()
}

/**
 * Middleware to verify CSRF token
 * Should be called on mutating requests (POST, PUT, DELETE, PATCH)
 */
export function verifyCSRFToken(req, res, next) {
  if (!CSRF_ENABLED) {
    return next()
  }

  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // Get token from header or body
  const tokenFromRequest = req.header(CSRF_HEADER_NAME) || req.body?._csrf

  if (!tokenFromRequest) {
    return res.status(403).json({
      error: 'CSRF_TOKEN_MISSING',
      message: 'CSRF token is required for this request'
    })
  }

  // Get stored token
  const sessionId = req.sessionId || req.ip
  const storedToken = csrfTokens.get(sessionId)

  if (!storedToken || storedToken !== tokenFromRequest) {
    return res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token'
    })
  }

  next()
}

/**
 * Clear CSRF token for a session
 * @param {string} sessionId - Session identifier
 */
export function clearCSRFToken(sessionId) {
  csrfTokens.delete(sessionId)
}

/**
 * Get CSRF token for a session (for testing)
 * @param {string} sessionId - Session identifier
 * @returns {string|undefined} CSRF token
 */
export function getCSRFToken(sessionId) {
  return csrfTokens.get(sessionId)
}

export default {
  setCSRFToken,
  verifyCSRFToken,
  clearCSRFToken,
  getCSRFToken
}

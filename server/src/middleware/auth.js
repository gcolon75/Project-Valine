/**
 * Authentication middleware
 */

import { verifyJWT } from '../utils/crypto.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Middleware to authenticate requests using JWT
 * Attaches user object to req.user if authenticated
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.header('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyJWT(token)
    
    if (!decoded) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      })
    }

    // Check if session exists and is valid (if using session tracking)
    if (process.env.USE_SESSION_TRACKING === 'true' && decoded.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: decoded.sessionId }
      })

      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({
          error: 'SESSION_EXPIRED',
          message: 'Session has expired'
        })
      }

      // Update last activity
      await prisma.session.update({
        where: { id: decoded.sessionId },
        data: { lastActivity: new Date() }
      })
    }

    // Attach user info to request
    req.user = decoded
    req.userId = decoded.userId || decoded.id
    
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({
      error: 'AUTH_ERROR',
      message: 'Authentication failed'
    })
  }
}

/**
 * Middleware to require email verification
 * Must be used after authenticate middleware
 */
export async function requireEmailVerification(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { emailVerified: true }
    })

    if (!user || !user.emailVerified) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to access this resource',
        requiresVerification: true
      })
    }

    next()
  } catch (error) {
    console.error('Email verification check error:', error)
    return res.status(500).json({
      error: 'VERIFICATION_CHECK_ERROR',
      message: 'Failed to verify email status'
    })
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Attaches user to req.user if authenticated, otherwise continues
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.header('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.substring(7)
    const decoded = verifyJWT(token)
    
    if (decoded) {
      req.user = decoded
      req.userId = decoded.userId || decoded.id
    }
    
    next()
  } catch (error) {
    // Don't fail on optional auth errors
    next()
  }
}

export default {
  authenticate,
  requireEmailVerification,
  optionalAuthenticate
}

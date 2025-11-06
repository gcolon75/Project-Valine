/**
 * Enhanced authentication routes with security features
 * Email verification, password reset, 2FA, etc.
 */

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { 
  hashPassword, 
  comparePassword, 
  generateJWT, 
  generateVerificationToken 
} from '../utils/crypto.js'
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  send2FAEnabledEmail
} from '../utils/email.js'
import {
  generateSecret,
  generateQRCode,
  verifyToken as verify2FAToken,
  encryptSecret,
  is2FAEnabled
} from '../utils/twoFactor.js'
import { generateRecoveryCodes } from '../utils/crypto.js'
import { authRateLimit, resetAuthRateLimit } from '../middleware/authRateLimit.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit, AuditActions } from '../utils/auditLog.js'

const router = Router()
const prisma = new PrismaClient()

/**
 * POST /auth/register
 * Register a new user with email verification
 */
router.post('/register', authRateLimit({ maxAttempts: 3, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body

    // Validate required fields
    if (!email || !username || !password || !displayName) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Email, username, password, and display name are required'
      })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return res.status(409).json({
        error: 'USER_EXISTS',
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        displayName,
        emailVerified: false
      }
    })

    // Generate verification token
    const { token, expiresAt } = generateVerificationToken(24) // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })

    // Send verification email (async, don't wait)
    sendVerificationEmail(email, token).catch(err => {
      console.error('Failed to send verification email:', err)
    })

    // Generate JWT for immediate login (limited access until verified)
    const jwtToken = generateJWT({ userId: user.id, email: user.email })

    // Reset rate limit on successful registration
    resetAuthRateLimit(req, res, () => {})

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: 'REGISTRATION_FAILED',
      message: 'Failed to register user'
    })
  }
})

/**
 * POST /auth/login
 * Login with email/username and password, with optional 2FA
 */
router.post('/login', authRateLimit(), async (req, res) => {
  try {
    const { email, username, password, twoFactorCode } = req.body

    if (!password || (!email && !username)) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Email/username and password are required'
      })
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: email ? { email } : { username }
    })

    if (!user) {
      await logAudit({
        userId: 'anonymous',
        action: AuditActions.LOGIN_FAILED,
        resource: 'user',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'user_not_found', identifier: email || username }
      })
      
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password'
      })
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      await logAudit({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        resource: 'user',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'invalid_password' }
      })

      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password'
      })
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled && is2FAEnabled()) {
      if (!twoFactorCode) {
        return res.status(403).json({
          error: 'TWO_FACTOR_REQUIRED',
          message: '2FA code is required',
          requires2FA: true
        })
      }

      const isValid2FA = verify2FAToken(twoFactorCode, user.twoFactorSecret, true)

      if (!isValid2FA) {
        // Check if it's a recovery code
        const recoveryCodes = await prisma.twoFactorRecoveryCode.findMany({
          where: {
            userId: user.id,
            used: false
          }
        })

        let validRecoveryCode = false
        for (const rc of recoveryCodes) {
          const isValid = await comparePassword(twoFactorCode, rc.code)
          if (isValid) {
            // Mark recovery code as used
            await prisma.twoFactorRecoveryCode.update({
              where: { id: rc.id },
              data: { used: true, usedAt: new Date() }
            })

            await logAudit({
              userId: user.id,
              action: AuditActions.TWO_FA_RECOVERY_CODE_USED,
              resource: 'user',
              ipAddress: req.ip,
              userAgent: req.get('user-agent')
            })

            validRecoveryCode = true
            break
          }
        }

        if (!validRecoveryCode) {
          await logAudit({
            userId: user.id,
            action: AuditActions.LOGIN_FAILED,
            resource: 'user',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: { reason: 'invalid_2fa_code' }
          })

          return res.status(401).json({
            error: 'INVALID_2FA_CODE',
            message: 'Invalid 2FA code'
          })
        }
      }
    }

    // Create session if tracking enabled
    let sessionId = null
    if (process.env.USE_SESSION_TRACKING === 'true') {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: generateVerificationToken().token,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          expiresAt
        }
      })
      sessionId = session.id
    }

    // Generate JWT
    const jwtToken = generateJWT({ 
      userId: user.id, 
      email: user.email,
      sessionId 
    })

    // Log successful login
    await logAudit({
      userId: user.id,
      action: AuditActions.LOGIN,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { sessionId }
    })

    // Reset rate limit on successful login
    resetAuthRateLimit(req, res, () => {})

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: 'LOGIN_FAILED',
      message: 'Failed to login'
    })
  }
})

/**
 * POST /auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        error: 'MISSING_TOKEN',
        message: 'Verification token is required'
      })
    }

    // Find token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!verificationToken) {
      return res.status(404).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired verification token'
      })
    }

    // Check expiration
    if (verificationToken.expiresAt < new Date()) {
      return res.status(410).json({
        error: 'TOKEN_EXPIRED',
        message: 'Verification token has expired'
      })
    }

    // Update user
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true }
    })

    // Delete used token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id }
    })

    // Log audit event
    await logAudit({
      userId: verificationToken.userId,
      action: AuditActions.EMAIL_VERIFICATION,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: 'Email verified successfully'
    })
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(500).json({
      error: 'VERIFICATION_FAILED',
      message: 'Failed to verify email'
    })
  }
})

/**
 * POST /auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', authenticate, authRateLimit({ maxAttempts: 3, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    })

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'ALREADY_VERIFIED',
        message: 'Email is already verified'
      })
    }

    // Delete old tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id }
    })

    // Generate new token
    const { token, expiresAt } = generateVerificationToken(24)

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })

    // Send email
    await sendVerificationEmail(user.email, token)

    res.json({
      success: true,
      message: 'Verification email sent'
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({
      error: 'RESEND_FAILED',
      message: 'Failed to resend verification email'
    })
  }
})

/**
 * POST /auth/request-password-reset
 * Request password reset token
 */
router.post('/request-password-reset', authRateLimit({ maxAttempts: 3, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        error: 'MISSING_EMAIL',
        message: 'Email is required'
      })
    }

    // Find user (but don't reveal if user exists)
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent user enumeration
    if (!user) {
      // Log the attempt
      await logAudit({
        userId: 'anonymous',
        action: AuditActions.PASSWORD_RESET_REQUEST,
        resource: 'user',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { email, found: false }
      })

      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link will be sent'
      })
    }

    // Delete old tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Generate reset token (1 hour expiration)
    const { token, expiresAt } = generateVerificationToken(1)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })

    // Send reset email
    await sendPasswordResetEmail(user.email, token)

    // Log audit event
    await logAudit({
      userId: user.id,
      action: AuditActions.PASSWORD_RESET_REQUEST,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link will be sent'
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    res.status(500).json({
      error: 'RESET_REQUEST_FAILED',
      message: 'Failed to process password reset request'
    })
  }
})

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authRateLimit(), async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Token and new password are required'
      })
    }

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.used) {
      return res.status(404).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or already used reset token'
      })
    }

    // Check expiration
    if (resetToken.expiresAt < new Date()) {
      return res.status(410).json({
        error: 'TOKEN_EXPIRED',
        message: 'Reset token has expired'
      })
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    })

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    })

    // Invalidate all sessions for security
    if (process.env.USE_SESSION_TRACKING === 'true') {
      await prisma.session.deleteMany({
        where: { userId: resetToken.userId }
      })
    }

    // Log audit event
    await logAudit({
      userId: resetToken.userId,
      action: AuditActions.PASSWORD_RESET_COMPLETE,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({
      error: 'RESET_FAILED',
      message: 'Failed to reset password'
    })
  }
})

/**
 * POST /auth/logout
 * Logout and invalidate session
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Delete session if tracking enabled
    if (process.env.USE_SESSION_TRACKING === 'true' && req.user?.sessionId) {
      await prisma.session.delete({
        where: { id: req.user.sessionId }
      }).catch(() => {}) // Ignore if session not found
    }

    // Log audit event
    await logAudit({
      userId: req.userId,
      action: AuditActions.LOGOUT,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      error: 'LOGOUT_FAILED',
      message: 'Failed to logout'
    })
  }
})

export default router

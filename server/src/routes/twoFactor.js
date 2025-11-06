/**
 * Two-Factor Authentication (2FA) management routes
 */

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
  generateSecret,
  generateQRCode,
  verifyToken,
  encryptSecret,
  is2FAEnabled
} from '../utils/twoFactor.js'
import { generateRecoveryCodes, hashValue } from '../utils/crypto.js'
import { send2FAEnabledEmail } from '../utils/email.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit, AuditActions } from '../utils/auditLog.js'

const router = Router()
const prisma = new PrismaClient()

/**
 * POST /2fa/enroll
 * Start 2FA enrollment process
 */
router.post('/enroll', authenticate, async (req, res) => {
  try {
    // Check if feature is enabled
    if (!is2FAEnabled()) {
      return res.status(403).json({
        error: 'FEATURE_DISABLED',
        message: '2FA feature is currently disabled'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, twoFactorEnabled: true }
    })

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        error: 'ALREADY_ENABLED',
        message: '2FA is already enabled for this account'
      })
    }

    // Generate secret
    const secret = generateSecret()
    
    // Generate QR code
    const qrCode = await generateQRCode(user.email, secret)

    // Store encrypted secret temporarily (will be activated on verification)
    const encryptedSecret = encryptSecret(secret)
    
    // Store in session or temporary storage (for simplicity, using user record with a flag)
    // In production, consider using Redis or similar
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: encryptedSecret
        // Don't enable yet - will enable after verification
      }
    })

    res.json({
      success: true,
      message: '2FA enrollment initiated',
      qrCode,
      secret, // Only send this once, user should save it
      manualEntryKey: secret
    })
  } catch (error) {
    console.error('2FA enrollment error:', error)
    res.status(500).json({
      error: 'ENROLLMENT_FAILED',
      message: 'Failed to start 2FA enrollment'
    })
  }
})

/**
 * POST /2fa/verify-enrollment
 * Complete 2FA enrollment by verifying a code
 */
router.post('/verify-enrollment', authenticate, async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        error: 'MISSING_CODE',
        message: '2FA code is required'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true, 
        email: true, 
        twoFactorEnabled: true, 
        twoFactorSecret: true 
      }
    })

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        error: 'ENROLLMENT_NOT_STARTED',
        message: 'Please start 2FA enrollment first'
      })
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        error: 'ALREADY_ENABLED',
        message: '2FA is already enabled'
      })
    }

    // Verify code
    const isValid = verifyToken(code, user.twoFactorSecret, true)

    if (!isValid) {
      return res.status(401).json({
        error: 'INVALID_CODE',
        message: 'Invalid 2FA code'
      })
    }

    // Generate recovery codes
    const recoveryCodes = await generateRecoveryCodes(8)

    // Save recovery codes
    await Promise.all(
      recoveryCodes.map(({ hash }) =>
        prisma.twoFactorRecoveryCode.create({
          data: {
            userId: user.id,
            code: hash
          }
        })
      )
    )

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    })

    // Send confirmation email
    send2FAEnabledEmail(user.email).catch(err => {
      console.error('Failed to send 2FA enabled email:', err)
    })

    // Log audit event
    await logAudit({
      userId: user.id,
      action: AuditActions.TWO_FA_ENABLED,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: '2FA enabled successfully',
      recoveryCodes: recoveryCodes.map(rc => rc.code) // Return plain codes for user to save
    })
  } catch (error) {
    console.error('2FA verification error:', error)
    res.status(500).json({
      error: 'VERIFICATION_FAILED',
      message: 'Failed to verify 2FA code'
    })
  }
})

/**
 * POST /2fa/disable
 * Disable 2FA for the account
 */
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password, code } = req.body

    if (!password) {
      return res.status(400).json({
        error: 'MISSING_PASSWORD',
        message: 'Password is required to disable 2FA'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    })

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        error: 'NOT_ENABLED',
        message: '2FA is not enabled for this account'
      })
    }

    // Verify password
    const { comparePassword } = await import('../utils/crypto.js')
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_PASSWORD',
        message: 'Invalid password'
      })
    }

    // If code provided, verify it
    if (code) {
      const isValidCode = verifyToken(code, user.twoFactorSecret, true)
      if (!isValidCode) {
        return res.status(401).json({
          error: 'INVALID_CODE',
          message: 'Invalid 2FA code'
        })
      }
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    // Delete recovery codes
    await prisma.twoFactorRecoveryCode.deleteMany({
      where: { userId: user.id }
    })

    // Log audit event
    await logAudit({
      userId: user.id,
      action: AuditActions.TWO_FA_DISABLED,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: '2FA disabled successfully'
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    res.status(500).json({
      error: 'DISABLE_FAILED',
      message: 'Failed to disable 2FA'
    })
  }
})

/**
 * POST /2fa/regenerate-recovery-codes
 * Regenerate recovery codes
 */
router.post('/regenerate-recovery-codes', authenticate, async (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({
        error: 'MISSING_PASSWORD',
        message: 'Password is required'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    })

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        error: 'NOT_ENABLED',
        message: '2FA is not enabled for this account'
      })
    }

    // Verify password
    const { comparePassword } = await import('../utils/crypto.js')
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_PASSWORD',
        message: 'Invalid password'
      })
    }

    // Delete old recovery codes
    await prisma.twoFactorRecoveryCode.deleteMany({
      where: { userId: user.id }
    })

    // Generate new recovery codes
    const recoveryCodes = await generateRecoveryCodes(8)

    // Save new recovery codes
    await Promise.all(
      recoveryCodes.map(({ hash }) =>
        prisma.twoFactorRecoveryCode.create({
          data: {
            userId: user.id,
            code: hash
          }
        })
      )
    )

    res.json({
      success: true,
      message: 'Recovery codes regenerated',
      recoveryCodes: recoveryCodes.map(rc => rc.code)
    })
  } catch (error) {
    console.error('Recovery codes regeneration error:', error)
    res.status(500).json({
      error: 'REGENERATION_FAILED',
      message: 'Failed to regenerate recovery codes'
    })
  }
})

/**
 * GET /2fa/status
 * Get 2FA status for the current user
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        twoFactorEnabled: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
    }

    // Count unused recovery codes
    const unusedRecoveryCodes = await prisma.twoFactorRecoveryCode.count({
      where: {
        userId: req.userId,
        used: false
      }
    })

    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      featureEnabled: is2FAEnabled(),
      recoveryCodesRemaining: unusedRecoveryCodes
    })
  } catch (error) {
    console.error('2FA status error:', error)
    res.status(500).json({
      error: 'STATUS_FAILED',
      message: 'Failed to get 2FA status'
    })
  }
})

export default router

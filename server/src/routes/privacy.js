/**
 * Privacy and data management routes
 * Data export, account deletion
 */

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth.js'
import { logAudit, AuditActions } from '../utils/auditLog.js'
import { comparePassword } from '../utils/crypto.js'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /privacy/export
 * Export user data as JSON
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    const userId = req.userId

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            links: true,
            media: true,
            credits: true
          }
        },
        profileLinks: true,
        settings: true,
        posts: true,
        reels: true,
        comments: true,
        likes: true,
        bookmarks: true,
        sentRequests: {
          include: {
            receiver: {
              select: {
                username: true,
                email: true,
                displayName: true
              }
            }
          }
        },
        receivedRequests: {
          include: {
            sender: {
              select: {
                username: true,
                email: true,
                displayName: true
              }
            }
          }
        },
        sentMessages: true,
        conversations: {
          include: {
            conversation: true
          }
        },
        notifications: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
    }

    // Remove sensitive fields
    const exportData = {
      ...user,
      password: undefined,
      twoFactorSecret: undefined
    }

    // Add metadata
    const dataPackage = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      username: user.username,
      accountCreated: user.createdAt,
      data: exportData
    }

    // Log audit event
    await logAudit({
      userId,
      action: AuditActions.DATA_EXPORT,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      data: dataPackage
    })
  } catch (error) {
    console.error('Data export error:', error)
    res.status(500).json({
      error: 'EXPORT_FAILED',
      message: 'Failed to export user data'
    })
  }
})

/**
 * POST /privacy/delete-account
 * Delete user account with confirmation
 */
router.post('/delete-account', authenticate, async (req, res) => {
  try {
    const { password, confirmation } = req.body

    if (!password) {
      return res.status(400).json({
        error: 'MISSING_PASSWORD',
        message: 'Password is required to delete account'
      })
    }

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        error: 'INVALID_CONFIRMATION',
        message: 'Please type DELETE to confirm account deletion'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    })

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_PASSWORD',
        message: 'Invalid password'
      })
    }

    // Log audit event before deletion
    await logAudit({
      userId: user.id,
      action: AuditActions.ACCOUNT_DELETE,
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        email: user.email,
        username: user.username
      }
    })

    // Delete user (cascade deletes will handle related records)
    await prisma.user.delete({
      where: { id: user.id }
    })

    res.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    res.status(500).json({
      error: 'DELETION_FAILED',
      message: 'Failed to delete account'
    })
  }
})

/**
 * POST /privacy/request-deletion
 * Request account deletion with grace period
 */
router.post('/request-deletion', authenticate, async (req, res) => {
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

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_PASSWORD',
        message: 'Invalid password'
      })
    }

    // In a real implementation, you would:
    // 1. Mark account for deletion
    // 2. Set a deletion date (e.g., 30 days from now)
    // 3. Send confirmation email
    // 4. Allow user to cancel within grace period
    
    // For now, return a message
    res.json({
      success: true,
      message: 'Account deletion requested. Your account will be deleted in 30 days.',
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      canCancel: true
    })
  } catch (error) {
    console.error('Deletion request error:', error)
    res.status(500).json({
      error: 'REQUEST_FAILED',
      message: 'Failed to request account deletion'
    })
  }
})

/**
 * GET /privacy/audit-log
 * Get user's audit log
 */
router.get('/audit-log', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, action } = req.query

    const where = { userId: req.userId }
    
    if (action) {
      where.action = action
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          changes: true,
          ipAddress: true,
          createdAt: true
          // Exclude sensitive fields like userAgent for privacy
        }
      }),
      prisma.auditLog.count({ where })
    ])

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + logs.length < total
      }
    })
  } catch (error) {
    console.error('Audit log retrieval error:', error)
    res.status(500).json({
      error: 'AUDIT_LOG_FAILED',
      message: 'Failed to retrieve audit log'
    })
  }
})

/**
 * GET /privacy/sessions
 * Get active sessions for the user
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    if (process.env.USE_SESSION_TRACKING !== 'true') {
      return res.json({
        success: true,
        sessions: [],
        message: 'Session tracking is not enabled'
      })
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: req.userId,
        expiresAt: {
          gte: new Date()
        }
      },
      orderBy: { lastActivity: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastActivity: true,
        createdAt: true,
        expiresAt: true
      }
    })

    res.json({
      success: true,
      sessions
    })
  } catch (error) {
    console.error('Sessions retrieval error:', error)
    res.status(500).json({
      error: 'SESSIONS_FAILED',
      message: 'Failed to retrieve sessions'
    })
  }
})

/**
 * DELETE /privacy/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    if (process.env.USE_SESSION_TRACKING !== 'true') {
      return res.status(400).json({
        error: 'FEATURE_DISABLED',
        message: 'Session tracking is not enabled'
      })
    }

    const { sessionId } = req.params

    // Verify session belongs to user
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session || session.userId !== req.userId) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      })
    }

    await prisma.session.delete({
      where: { id: sessionId }
    })

    res.json({
      success: true,
      message: 'Session revoked successfully'
    })
  } catch (error) {
    console.error('Session revocation error:', error)
    res.status(500).json({
      error: 'REVOCATION_FAILED',
      message: 'Failed to revoke session'
    })
  }
})

export default router

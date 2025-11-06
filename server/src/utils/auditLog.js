/**
 * Audit logging utilities for tracking security-sensitive actions
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Log an audit event
 * @param {object} params - Audit event parameters
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action identifier (e.g., 'profile.update', 'password.change')
 * @param {string} params.resource - Resource type (e.g., 'profile', 'user', 'settings')
 * @param {string} params.resourceId - ID of the affected resource
 * @param {object} params.changes - Before/after values
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.userAgent - User agent string
 * @param {object} params.metadata - Additional context
 * @returns {Promise<object>} Created audit log entry
 */
export async function logAudit({
  userId,
  action,
  resource,
  resourceId = null,
  changes = null,
  ipAddress = null,
  userAgent = null,
  metadata = null
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        changes,
        ipAddress,
        userAgent,
        metadata
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't fail the request if audit logging fails
    return null
  }
}

/**
 * Middleware to automatically log audit events
 * @param {string} action - Action identifier
 * @param {string} resource - Resource type
 * @returns {Function} Express middleware
 */
export function auditMiddleware(action, resource) {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send

    // Override send to log after successful response
    res.send = function (data) {
      // Only log on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log audit event asynchronously (don't wait)
        logAudit({
          userId: req.userId || req.user?.id,
          action,
          resource,
          resourceId: req.params.id || req.params.userId || req.params.profileId,
          changes: {
            method: req.method,
            body: sanitizeData(req.body),
            params: req.params
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            path: req.path,
            statusCode: res.statusCode
          }
        }).catch(err => {
          console.error('Audit log error:', err)
        })
      }

      // Call original send
      return originalSend.call(this, data)
    }

    next()
  }
}

/**
 * Get audit logs for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {number} options.offset - Number of logs to skip
 * @param {Date} options.since - Only return logs after this date
 * @param {Date} options.until - Only return logs before this date
 * @param {string} options.action - Filter by action
 * @returns {Promise<Array>} Array of audit logs
 */
export async function getUserAuditLogs(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    since = null,
    until = null,
    action = null
  } = options

  const where = { userId }

  if (action) {
    where.action = action
  }

  if (since || until) {
    where.createdAt = {}
    if (since) {
      where.createdAt.gte = since
    }
    if (until) {
      where.createdAt.lte = until
    }
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })
}

/**
 * Clean up old audit logs based on retention policy
 * @param {number} retentionDays - Number of days to retain logs (default: 90)
 * @returns {Promise<number>} Number of deleted logs
 */
export async function cleanupOldAuditLogs(retentionDays = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  })

  return result.count
}

/**
 * Sanitize data before logging (remove sensitive fields)
 * @param {object} data - Data to sanitize
 * @returns {object} Sanitized data
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard']
  const sanitized = { ...data }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Common audit action constants
 */
export const AuditActions = {
  // Authentication
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  PASSWORD_CHANGE: 'auth.password_change',
  PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  PASSWORD_RESET_COMPLETE: 'auth.password_reset_complete',
  EMAIL_VERIFICATION: 'auth.email_verification',
  
  // 2FA
  TWO_FA_ENABLED: 'auth.2fa_enabled',
  TWO_FA_DISABLED: 'auth.2fa_disabled',
  TWO_FA_RECOVERY_CODE_USED: 'auth.2fa_recovery_code_used',
  
  // Profile
  PROFILE_UPDATE: 'profile.update',
  PROFILE_DELETE: 'profile.delete',
  
  // Settings
  SETTINGS_UPDATE: 'settings.update',
  EMAIL_CHANGE: 'user.email_change',
  
  // Privacy
  DATA_EXPORT: 'privacy.data_export',
  ACCOUNT_DELETE: 'privacy.account_delete'
}

export default {
  logAudit,
  auditMiddleware,
  getUserAuditLogs,
  cleanupOldAuditLogs,
  AuditActions
}

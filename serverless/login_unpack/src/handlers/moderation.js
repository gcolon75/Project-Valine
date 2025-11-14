/**
 * Moderation decision handlers
 * Admin endpoints for taking action on moderation reports
 */

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getAuthenticatedUserId } from '../utils/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { redactPII } from '../utils/moderation.js';
import { sendActionAlert } from '../utils/discord.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * Validate decision payload
 */
function validateDecisionPayload(body) {
  const errors = {};
  
  if (!body.reportId || typeof body.reportId !== 'string') {
    errors.reportId = 'Report ID is required';
  }
  
  if (!body.action || typeof body.action !== 'string') {
    errors.action = 'Action is required';
  } else {
    const validActions = ['allow', 'remove', 'ban', 'warn'];
    if (!validActions.includes(body.action)) {
      errors.action = `Action must be one of: ${validActions.join(', ')}`;
    }
  }
  
  if (body.reason && typeof body.reason !== 'string') {
    errors.reason = 'Reason must be a string';
  }
  
  if (body.reason && body.reason.length > 5000) {
    errors.reason = 'Reason must be 5000 characters or less';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Determine new status based on action
 */
function getNewStatus(action) {
  const statusMap = {
    allow: 'dismissed',
    warn: 'reviewed',
    remove: 'actioned',
    ban: 'actioned',
  };
  
  return statusMap[action] || 'reviewed';
}

/**
 * POST /moderation/decision
 * Take action on a moderation report (admin only)
 */
export const makeDecision = async (event) => {
  try {
    // Check admin access
    const adminCheck = await requireAdmin(event);
    if (adminCheck) {
      return adminCheck;
    }
    
    const userId = getAuthenticatedUserId(event);
    
    // Parse body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
      return error('Invalid JSON body', 400, headers);
    }
    
    // Validate payload
    const validation = validateDecisionPayload(body);
    if (!validation.valid) {
      return json({ errors: validation.errors }, 400, headers);
    }
    
    const prisma = getPrisma();
    
    // Check if report exists
    const report = await prisma.moderationReport.findUnique({
      where: { id: body.reportId },
    });
    
    if (!report) {
      return error('Report not found', 404, headers);
    }
    
    // Create moderation action
    const action = await prisma.moderationAction.create({
      data: {
        reportId: body.reportId,
        action: body.action,
        reason: body.reason || null,
        actorId: userId,
      },
    });
    
    // Update report status
    const newStatus = getNewStatus(body.action);
    const updatedReport = await prisma.moderationReport.update({
      where: { id: body.reportId },
      data: { status: newStatus },
    });
    
    // Log action (with PII redaction)
    console.log('[Moderation] Decision made:', {
      actionId: action.id,
      reportId: report.id,
      action: action.action,
      actorId: redactPII(userId),
      targetType: report.targetType,
      targetId: redactPII(report.targetId),
      newStatus,
    });
    
    // Send Discord alert if enabled
    try {
      await sendActionAlert(action, updatedReport);
    } catch (err) {
      console.error('[Moderation] Failed to send Discord alert:', err);
      // Don't fail the request if Discord fails
    }
    
    // TODO: Implement server-side effects for "remove" action
    // This would involve actually redacting/removing the content
    // For now, we just record the action
    
    return json(
      {
        actionId: action.id,
        reportId: updatedReport.id,
        status: updatedReport.status,
        action: action.action,
      },
      200,
      headers
    );
  } catch (err) {
    console.error('[Moderation] Decision error:', err);
    return error('Internal server error', 500, headers);
  }
};

/**
 * GET /moderation/health
 * Get moderation configuration and health status
 */
export const getHealth = async (event) => {
  try {
    // This endpoint can be public or require auth depending on needs
    // For now, making it public for easy health checks
    
    const allowedCategories = (process.env.REPORT_CATEGORY_ALLOWLIST || '').split(',');
    const allowedProtocols = (process.env.URL_ALLOWED_PROTOCOLS || '').split(':').filter(Boolean);
    const allowedDomains = (process.env.URL_ALLOWED_DOMAINS || '').split(',').filter(Boolean);
    const blockedDomains = (process.env.URL_BLOCKED_DOMAINS || '').split(',').filter(Boolean);
    
    return json(
      {
        enabled: process.env.MODERATION_ENABLED === 'true',
        reportsEnabled: process.env.REPORTS_ENABLED !== 'false',
        strictMode: process.env.MODERATION_STRICT_MODE === 'true',
        alertsEnabled: process.env.MODERATION_ALERTS_ENABLED === 'true',
        profanityAction: process.env.PROFANITY_ACTION || 'block',
        rateLimits: {
          reportsPerHour: parseInt(process.env.REPORTS_MAX_PER_HOUR || '5', 10),
          reportsPerDay: parseInt(process.env.REPORTS_MAX_PER_DAY || '20', 10),
          ipReportsPerHour: parseInt(process.env.REPORTS_IP_MAX_PER_HOUR || '10', 10),
        },
        rules: {
          allowedCategories: allowedCategories.filter(Boolean),
          allowedProtocols,
          allowedDomainCount: allowedDomains.length,
          blockedDomainCount: blockedDomains.length,
        },
      },
      200,
      headers
    );
  } catch (err) {
    console.error('[Moderation] Health error:', err);
    return error('Internal server error', 500, headers);
  }
};

export default {
  makeDecision,
  getHealth,
};

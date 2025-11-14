/**
 * Moderation report handlers
 * Endpoints for creating and managing content moderation reports
 */

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getAuthenticatedUserId } from '../utils/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getSeverityFromCategory, redactPII } from '../utils/moderation.js';
import { sendNewReportAlert } from '../utils/discord.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * Get allowed report categories from environment
 */
function getAllowedCategories() {
  const categoriesStr = process.env.REPORT_CATEGORY_ALLOWLIST || 'spam,abuse,unsafe_link,profanity,privacy,other';
  return categoriesStr.split(',').map(c => c.trim()).filter(Boolean);
}

/**
 * Validate report creation payload
 */
function validateReportPayload(body) {
  const errors = {};
  
  if (!body.targetType || typeof body.targetType !== 'string') {
    errors.targetType = 'Target type is required';
  } else {
    const validTypes = ['user', 'profile', 'post', 'comment', 'link'];
    if (!validTypes.includes(body.targetType)) {
      errors.targetType = `Target type must be one of: ${validTypes.join(', ')}`;
    }
  }
  
  if (!body.targetId || typeof body.targetId !== 'string') {
    errors.targetId = 'Target ID is required';
  }
  
  if (!body.category || typeof body.category !== 'string') {
    errors.category = 'Category is required';
  } else {
    const allowedCategories = getAllowedCategories();
    if (!allowedCategories.includes(body.category)) {
      errors.category = `Category must be one of: ${allowedCategories.join(', ')}`;
    }
  }
  
  if (body.description && typeof body.description !== 'string') {
    errors.description = 'Description must be a string';
  }
  
  if (body.description && body.description.length > 5000) {
    errors.description = 'Description must be 5000 characters or less';
  }
  
  if (body.evidenceUrls && !Array.isArray(body.evidenceUrls)) {
    errors.evidenceUrls = 'Evidence URLs must be an array';
  }
  
  if (body.evidenceUrls && body.evidenceUrls.length > 10) {
    errors.evidenceUrls = 'Maximum 10 evidence URLs allowed';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * POST /reports
 * Create a new moderation report
 */
export const createReport = async (event) => {
  try {
    // Check if reports are enabled
    if (process.env.REPORTS_ENABLED === 'false') {
      return error('Reports endpoint is disabled', 503, headers);
    }
    
    // Check authentication
    const userId = getAuthenticatedUserId(event);
    if (!userId) {
      return error('Unauthorized - Authentication required', 401, headers);
    }
    
    // Rate limiting
    const rateLimitResult = await rateLimit(event, '/reports');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }
    
    // Parse body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
      return error('Invalid JSON body', 400, headers);
    }
    
    // Validate payload
    const validation = validateReportPayload(body);
    if (!validation.valid) {
      return json({ errors: validation.errors }, 400, headers);
    }
    
    // Create report
    const prisma = getPrisma();
    const severity = getSeverityFromCategory(body.category);
    
    const report = await prisma.moderationReport.create({
      data: {
        reporterId: userId,
        targetType: body.targetType,
        targetId: body.targetId,
        category: body.category,
        description: body.description || null,
        evidenceUrls: body.evidenceUrls || [],
        status: 'open',
        severity,
      },
    });
    
    // Log report creation (with PII redaction)
    console.log('[Moderation] Report created:', {
      id: report.id,
      reporterId: redactPII(userId),
      targetType: report.targetType,
      targetId: redactPII(report.targetId),
      category: report.category,
      severity,
    });
    
    // Send Discord alert if enabled
    try {
      await sendNewReportAlert(report);
    } catch (err) {
      console.error('[Moderation] Failed to send Discord alert:', err);
      // Don't fail the request if Discord fails
    }
    
    return json(
      {
        id: report.id,
        status: report.status,
      },
      201,
      {
        ...headers,
        ...event.rateLimitHeaders,
      }
    );
  } catch (err) {
    console.error('[Reports] Create error:', err);
    return error('Internal server error', 500, headers);
  }
};

/**
 * GET /reports
 * List moderation reports (admin only)
 */
export const listReports = async (event) => {
  try {
    // Check admin access
    const adminCheck = await requireAdmin(event);
    if (adminCheck) {
      return adminCheck;
    }
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status;
    const category = queryParams.category;
    const targetType = queryParams.targetType;
    const limit = Math.min(parseInt(queryParams.limit || '50', 10), 100);
    const cursor = queryParams.cursor;
    
    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (targetType) where.targetType = targetType;
    if (cursor) where.id = { lt: cursor };
    
    const prisma = getPrisma();
    
    const reports = await prisma.moderationReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to determine if there are more
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Include latest 5 actions
        },
      },
    });
    
    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, limit) : reports;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    
    return json(
      {
        items,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      200,
      headers
    );
  } catch (err) {
    console.error('[Reports] List error:', err);
    return error('Internal server error', 500, headers);
  }
};

/**
 * GET /reports/:id
 * Get a specific moderation report (admin only)
 */
export const getReport = async (event) => {
  try {
    // Check admin access
    const adminCheck = await requireAdmin(event);
    if (adminCheck) {
      return adminCheck;
    }
    
    const { id } = event.pathParameters || {};
    if (!id) {
      return error('Report ID is required', 400, headers);
    }
    
    const prisma = getPrisma();
    
    const report = await prisma.moderationReport.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!report) {
      return error('Report not found', 404, headers);
    }
    
    return json(report, 200, headers);
  } catch (err) {
    console.error('[Reports] Get error:', err);
    return error('Internal server error', 500, headers);
  }
};

export default {
  createReport,
  listReports,
  getReport,
};

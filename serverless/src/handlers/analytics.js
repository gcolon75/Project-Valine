/**
 * Analytics Privacy Stub Handler
 * Handles opt-in event capture with privacy-first approach
 */

import { getPrisma } from '../db/client.js';
import { getCorsHeaders } from '../utils/headers.js';
import { analyticsConfig, isEventAllowed, hasDisallowedProperties, sanitizeProperties } from '../config/analytics.js';

// In-memory rate limiting cache (in production, use Redis)
const rateLimitCache = new Map();

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimitCache() {
  const now = Date.now();
  const windowMs = analyticsConfig.rateLimit.windowMinutes * 60 * 1000;
  
  for (const [key, data] of rateLimitCache.entries()) {
    if (now - data.windowStart > windowMs) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Check rate limit for an identifier
 */
function checkRateLimit(identifier) {
  cleanupRateLimitCache();
  
  const now = Date.now();
  const windowMs = analyticsConfig.rateLimit.windowMinutes * 60 * 1000;
  const data = rateLimitCache.get(identifier);
  
  if (!data || now - data.windowStart > windowMs) {
    rateLimitCache.set(identifier, {
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  if (data.count >= analyticsConfig.rateLimit.maxEventsPerWindow) {
    return false;
  }
  
  data.count++;
  return true;
}

/**
 * POST /analytics/ingest
 * Ingests analytics events with validation and privacy controls
 * 
 * Status Code Contract:
 *   200: All events valid and persisted successfully
 *   207: Partial success - some events rejected or properties sanitized
 *   202: Accepted but persistence disabled (ANALYTICS_PERSIST=false)
 *   204: Analytics globally disabled (ANALYTICS_ENABLED=false)
 *   400: Invalid batch size or malformed input
 *   429: Rate limit exceeded
 *   500: Internal server error
 */
export async function ingestEvents(event) {
  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(event),
  };
  
  // If analytics disabled, return 204 and ignore
  if (!analyticsConfig.enabled) {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { events } = body;
    
    // Validate request
    if (!Array.isArray(events)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Events must be an array' })
      };
    }
    
    if (events.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Events array cannot be empty' })
      };
    }
    
    if (events.length > analyticsConfig.maxBatchSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Batch size exceeds maximum of ${analyticsConfig.maxBatchSize}` 
        })
      };
    }
    
    // Validate and sanitize each event
    const validEvents = [];
    const errors = [];
    
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      
      // Validate required fields
      if (!evt.event) {
        errors.push({ index: i, error: 'Missing event name' });
        continue;
      }
      
      // Validate event is allowed
      if (!isEventAllowed(evt.event)) {
        errors.push({ index: i, error: `Event '${evt.event}' not allowed` });
        continue;
      }
      
      // Check for disallowed properties
      if (evt.properties && hasDisallowedProperties(evt.properties)) {
        errors.push({ index: i, error: 'Properties contain disallowed keys' });
        continue;
      }
      
      // Sanitize properties (extra safety)
      const sanitizedProperties = evt.properties ? sanitizeProperties(evt.properties) : null;
      
      validEvents.push({
        event: evt.event,
        anonId: evt.anonId || null,
        userId: evt.userId || null,
        sessionId: evt.sessionId || null,
        properties: sanitizedProperties,
        createdAt: evt.ts ? new Date(evt.ts) : new Date()
      });
    }
    
    // Check rate limit using anonId or userId
    const identifier = events[0]?.anonId || events[0]?.userId || 'unknown';
    if (!checkRateLimit(identifier)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: analyticsConfig.rateLimit.windowMinutes * 60
        })
      };
    }
    
    // If persist is disabled, accept but don't store
    if (!analyticsConfig.persistEnabled) {
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ 
          received: events.length,
          accepted: validEvents.length,
          rejected: errors.length,
          persisted: 0,
          message: 'Accepted but persistence disabled'
        })
      };
    }
    
    // Store valid events
    let stored = 0;
    if (validEvents.length > 0) {
      const prisma = getPrisma();
      await prisma.analyticsEvent.createMany({
        data: validEvents
      });
      stored = validEvents.length;
    }
    
    return {
      statusCode: errors.length > 0 ? 207 : 200, // Multi-status if there were errors
      headers,
      body: JSON.stringify({
        received: events.length,
        accepted: stored,
        rejected: errors.length,
        persisted: stored,
        sanitized: errors.filter(e => e.error.includes('sanitized')).length,
        errors: errors.length > 0 ? errors : undefined
      })
    };
    
  } catch (error) {
    console.error('Analytics ingest error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

/**
 * GET /analytics/config
 * Returns analytics configuration for frontend
 */
export async function getConfig(event) {
  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(event),
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
  };
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      enabled: analyticsConfig.enabled,
      requireConsent: analyticsConfig.requireConsent,
      allowedEvents: analyticsConfig.allowedEvents,
      samplingRate: analyticsConfig.samplingRate,
      consentCookie: analyticsConfig.consentCookie
    })
  };
}

/**
 * DELETE /analytics/events/cleanup
 * Removes events older than retention period
 * This should be called by a scheduled job/cron
 */
export async function cleanupOldEvents(event) {
  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(event),
  };
  
  try {
    const prisma = getPrisma();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - analyticsConfig.retentionDays);
    
    const result = await prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        deleted: result.count,
        cutoffDate: cutoffDate.toISOString()
      })
    };
    
  } catch (error) {
    console.error('Analytics cleanup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

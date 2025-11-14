/**
 * Rate limiting middleware with Redis support and in-memory fallback
 * Implements distributed rate limiting for Lambda functions
 */

import Redis from 'ioredis';
import { getRateLimitConfig, shouldRateLimit } from '../config/rateLimits.js';

// Redis client singleton
let redisClient = null;
let redisError = null;

// In-memory store for local development (fallback)
const inMemoryStore = new Map();

/**
 * Initialize Redis client if REDIS_URL is configured
 */
function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('[RateLimit] REDIS_URL not configured. Using in-memory fallback (single instance only, not distributed).');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[RateLimit] Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('error', (err) => {
      console.error('[RateLimit] Redis error:', err);
      redisError = err;
    });

    redisClient.on('connect', () => {
      console.log('[RateLimit] Redis connected successfully');
      redisError = null;
    });

    return redisClient;
  } catch (err) {
    console.error('[RateLimit] Failed to initialize Redis client:', err);
    redisError = err;
    return null;
  }
}

/**
 * Get client IP from API Gateway event
 * @param {object} event - Lambda event object
 * @returns {string} Client IP address
 */
function getClientIp(event) {
  // API Gateway provides client IP in requestContext
  if (event.requestContext?.http?.sourceIp) {
    return event.requestContext.http.sourceIp;
  }

  // Fallback to X-Forwarded-For header
  const forwardedFor = event.headers?.[' x-forwarded-for'] || event.headers?.['X-Forwarded-For'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Default fallback
  return 'unknown';
}

/**
 * Get user ID from event if authenticated
 * @param {object} event - Lambda event object
 * @returns {string|null} User ID or null
 */
function getUserId(event) {
  // This is set by authMiddleware if user is authenticated
  return event.userId || null;
}

/**
 * Generate rate limit key
 * @param {string} route - Route path
 * @param {string} ip - Client IP
 * @param {string|null} userId - User ID if authenticated
 * @returns {string} Redis key
 */
function getRateLimitKey(route, ip, userId) {
  // Use both IP and userId for better identification
  // For authenticated requests, use userId primarily
  const identifier = userId ? `user:${userId}` : `ip:${ip}`;
  return `rl:${route}:${identifier}`;
}

/**
 * Check rate limit using Redis
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
 */
async function checkRateLimitRedis(key, maxRequests, windowMs) {
  const redis = getRedisClient();
  
  if (!redis || redisError) {
    // Fallback to in-memory if Redis is unavailable
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }

  try {
    const windowSeconds = Math.ceil(windowMs / 1000);
    const now = Date.now();
    
    // Use Redis transaction for atomic increment and expire
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.pttl(key);
    
    const results = await pipeline.exec();
    
    if (!results || results.some(([err]) => err)) {
      console.error('[RateLimit] Redis pipeline error, falling back to in-memory');
      return checkRateLimitInMemory(key, maxRequests, windowMs);
    }
    
    const count = results[0][1];
    const ttl = results[1][1];
    
    // Set expiry on first request
    if (count === 1 || ttl === -1) {
      await redis.pexpire(key, windowMs);
    }
    
    const resetTime = ttl > 0 ? now + ttl : now + windowMs;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    
    return { allowed, remaining, resetTime };
  } catch (err) {
    console.error('[RateLimit] Redis check error, falling back to in-memory:', err);
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
 */
async function checkRateLimitInMemory(key, maxRequests, windowMs) {
  const now = Date.now();
  let record = inMemoryStore.get(key);
  
  if (!record || now > record.resetTime) {
    // Create new window
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    inMemoryStore.set(key, record);
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance on each request
      cleanupInMemoryStore();
    }
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: record.resetTime,
    };
  }
  
  record.count++;
  const allowed = record.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);
  
  return { allowed, remaining, resetTime: record.resetTime };
}

/**
 * Clean up expired entries from in-memory store
 */
function cleanupInMemoryStore() {
  const now = Date.now();
  for (const [key, record] of inMemoryStore.entries()) {
    if (now > record.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware for Lambda handlers
 * @param {object} event - Lambda event object
 * @param {string} routeOverride - Optional route override for custom grouping
 * @returns {Promise<{allowed: boolean, response?: object}>}
 */
export async function rateLimit(event, routeOverride = null) {
  // Check if rate limiting is enabled
  const rateLimitEnabled = process.env.RATE_LIMITING_ENABLED !== 'false';
  
  if (!rateLimitEnabled) {
    return { allowed: true };
  }

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';
  
  // Skip rate limiting for certain routes
  if (!shouldRateLimit(path)) {
    return { allowed: true };
  }

  const route = routeOverride || path;
  const ip = getClientIp(event);
  const userId = getUserId(event);
  
  // Get rate limit configuration for this route
  const config = getRateLimitConfig(route, method);
  const { maxRequests, windowMs, message } = config;
  
  // Generate rate limit key
  const key = getRateLimitKey(route, ip, userId);
  
  // Check rate limit
  const { allowed, remaining, resetTime } = await checkRateLimitRedis(
    key,
    maxRequests,
    windowMs
  );
  
  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    
    return {
      allowed: false,
      response: {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        },
        body: JSON.stringify({
          error: message,
          retryAfter,
        }),
      },
    };
  }
  
  // Add rate limit headers to successful responses
  event.rateLimitHeaders = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };
  
  return { allowed: true };
}

/**
 * Wrapper function to easily apply rate limiting to Lambda handlers
 * @param {Function} handler - Original Lambda handler
 * @param {string} routeOverride - Optional route override
 * @returns {Function} Wrapped handler with rate limiting
 */
export function withRateLimit(handler, routeOverride = null) {
  return async (event) => {
    const result = await rateLimit(event, routeOverride);
    
    if (!result.allowed) {
      return result.response;
    }
    
    // Call original handler
    const response = await handler(event);
    
    // Add rate limit headers to response
    if (event.rateLimitHeaders && response.headers) {
      response.headers = {
        ...response.headers,
        ...event.rateLimitHeaders,
      };
    }
    
    return response;
  };
}

/**
 * Close Redis connection (for testing and cleanup)
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  inMemoryStore.clear();
}

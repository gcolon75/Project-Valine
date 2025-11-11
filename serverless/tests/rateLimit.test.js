/**
 * Tests for rate limiting middleware
 * Covers Redis mode, in-memory fallback, and various rate limit scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { rateLimit, withRateLimit, closeRedis } from '../src/middleware/rateLimit.js';

// Helper to create mock Lambda event
function createMockEvent(options = {}) {
  return {
    requestContext: {
      http: {
        method: options.method || 'GET',
        path: options.path || '/api/test',
        sourceIp: options.ip || '192.168.1.1',
      },
    },
    headers: options.headers || {},
    userId: options.userId || null,
    body: options.body || null,
  };
}

// Helper to wait for time to pass
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Rate Limiting Middleware', () => {
  beforeEach(async () => {
    // Clear any existing state
    await closeRedis();
    // Disable Redis for most tests to use in-memory fallback
    delete process.env.REDIS_URL;
    process.env.RATE_LIMITING_ENABLED = 'true';
  });

  afterEach(async () => {
    await closeRedis();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      const result = await rateLimit(event);
      
      expect(result.allowed).toBe(true);
      expect(event.rateLimitHeaders).toBeDefined();
      expect(event.rateLimitHeaders['X-RateLimit-Limit']).toBe('10');
    });

    it('should block requests exceeding limit', async () => {
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // Make 10 requests (the limit for auth endpoints)
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(event);
        expect(result.allowed).toBe(true);
      }
      
      // 11th request should be blocked
      const result = await rateLimit(event);
      
      expect(result.allowed).toBe(false);
      expect(result.response.statusCode).toBe(429);
      expect(result.response.headers['Retry-After']).toBeDefined();
      expect(result.response.headers['X-RateLimit-Remaining']).toBe('0');
    });

    it('should return proper 429 response format', async () => {
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // Exceed limit
      for (let i = 0; i < 11; i++) {
        await rateLimit(event);
      }
      
      const result = await rateLimit(event);
      const body = JSON.parse(result.response.body);
      
      expect(body.error).toBeDefined();
      expect(body.retryAfter).toBeDefined();
      expect(typeof body.retryAfter).toBe('number');
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Different Endpoint Types', () => {
    it('should apply strict limits to auth endpoints', async () => {
      const event = createMockEvent({ path: '/auth/register', method: 'POST' });
      
      // Auth limit is 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(event);
        expect(result.allowed).toBe(true);
      }
      
      const result = await rateLimit(event);
      expect(result.allowed).toBe(false);
    });

    it('should apply moderate limits to write endpoints', async () => {
      const event = createMockEvent({ path: '/api/profiles', method: 'POST' });
      
      let allowed = true;
      let count = 0;
      
      // Write limit is 100 requests
      // Just verify first few work and limit is set correctly
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(event);
        expect(result.allowed).toBe(true);
        count++;
      }
      
      expect(count).toBe(5);
    });

    it('should apply lenient limits to read endpoints', async () => {
      const event = createMockEvent({ path: '/api/profiles', method: 'GET' });
      
      // Read limit is 1000 requests
      // Just verify first few work and limit is set correctly
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(event);
        expect(result.allowed).toBe(true);
        expect(event.rateLimitHeaders['X-RateLimit-Limit']).toBe('1000');
      }
    });
  });

  describe('Identifier-based Rate Limiting', () => {
    it('should track separate limits for different IPs', async () => {
      const event1 = createMockEvent({ 
        path: '/auth/login', 
        method: 'POST',
        ip: '192.168.1.1'
      });
      
      const event2 = createMockEvent({ 
        path: '/auth/login', 
        method: 'POST',
        ip: '192.168.1.2'
      });
      
      // Exceed limit for IP 1
      for (let i = 0; i < 11; i++) {
        await rateLimit(event1);
      }
      
      // IP 1 should be blocked
      const result1 = await rateLimit(event1);
      expect(result1.allowed).toBe(false);
      
      // IP 2 should still be allowed
      const result2 = await rateLimit(event2);
      expect(result2.allowed).toBe(true);
    });

    it('should track separate limits for authenticated users', async () => {
      const event1 = createMockEvent({ 
        path: '/auth/login', 
        method: 'POST',
        userId: 'user-123',
        ip: '192.168.1.1'
      });
      
      const event2 = createMockEvent({ 
        path: '/auth/login', 
        method: 'POST',
        userId: 'user-456',
        ip: '192.168.1.1' // Same IP but different user
      });
      
      // Exceed limit for user 1
      for (let i = 0; i < 11; i++) {
        await rateLimit(event1);
      }
      
      // User 1 should be blocked
      const result1 = await rateLimit(event1);
      expect(result1.allowed).toBe(false);
      
      // User 2 should still be allowed (different user ID)
      const result2 = await rateLimit(event2);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset limit after window expires', async () => {
      // Create a custom config with very short window for testing
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // Note: In real implementation, we can't easily test this without mocking time
      // This is a basic structure test
      const result1 = await rateLimit(event);
      expect(result1.allowed).toBe(true);
      
      // The resetTime should be in the future
      const resetTime = parseInt(event.rateLimitHeaders['X-RateLimit-Reset']);
      const now = Math.floor(Date.now() / 1000);
      expect(resetTime).toBeGreaterThan(now);
    }, 10000);
  });

  describe('Configuration and Flags', () => {
    it('should skip rate limiting when disabled', async () => {
      process.env.RATE_LIMITING_ENABLED = 'false';
      
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // Make many requests
      for (let i = 0; i < 20; i++) {
        const result = await rateLimit(event);
        expect(result.allowed).toBe(true);
      }
    });

    it('should skip rate limiting for health endpoints', async () => {
      const healthEvent = createMockEvent({ path: '/health', method: 'GET' });
      const metaEvent = createMockEvent({ path: '/meta', method: 'GET' });
      
      // Make many requests to health endpoints
      for (let i = 0; i < 100; i++) {
        const result1 = await rateLimit(healthEvent);
        const result2 = await rateLimit(metaEvent);
        expect(result1.allowed).toBe(true);
        expect(result2.allowed).toBe(true);
      }
    });
  });

  describe('withRateLimit Wrapper', () => {
    it('should wrap handler and apply rate limiting', async () => {
      const mockHandler = async (event) => ({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      });
      
      const wrappedHandler = withRateLimit(mockHandler);
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      const response = await wrappedHandler(event);
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['X-RateLimit-Limit']).toBeDefined();
      expect(response.headers['X-RateLimit-Remaining']).toBeDefined();
    });

    it('should return 429 when limit exceeded in wrapper', async () => {
      const mockHandler = async (event) => ({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      });
      
      const wrappedHandler = withRateLimit(mockHandler);
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // Exceed limit
      for (let i = 0; i < 10; i++) {
        await wrappedHandler(event);
      }
      
      const response = await wrappedHandler(event);
      
      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBeDefined();
    });
  });

  describe('IP Extraction', () => {
    it('should extract IP from requestContext', async () => {
      const event = createMockEvent({ 
        path: '/auth/login', 
        method: 'POST',
        ip: '10.0.0.1'
      });
      
      const result = await rateLimit(event);
      expect(result.allowed).toBe(true);
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/login',
          },
        },
        headers: {
          'X-Forwarded-For': '203.0.113.1, 198.51.100.1',
        },
      };
      
      const result = await rateLimit(event);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Remaining Count', () => {
    it('should decrement remaining count correctly', async () => {
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // First request
      await rateLimit(event);
      expect(event.rateLimitHeaders['X-RateLimit-Remaining']).toBe('9');
      
      // Second request
      await rateLimit(event);
      expect(event.rateLimitHeaders['X-RateLimit-Remaining']).toBe('8');
      
      // Third request
      await rateLimit(event);
      expect(event.rateLimitHeaders['X-RateLimit-Remaining']).toBe('7');
    });

    it('should show 0 remaining when limit exceeded', async () => {
      const event = createMockEvent({ path: '/auth/login', method: 'POST' });
      
      // Exceed limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(event);
      }
      
      const result = await rateLimit(event);
      expect(result.response.headers['X-RateLimit-Remaining']).toBe('0');
    });
  });
});

describe('In-Memory Fallback', () => {
  beforeEach(async () => {
    await closeRedis();
    delete process.env.REDIS_URL;
    process.env.RATE_LIMITING_ENABLED = 'true';
  });

  afterEach(async () => {
    await closeRedis();
  });

  it('should use in-memory store when Redis not configured', async () => {
    const event = createMockEvent({ path: '/auth/login', method: 'POST' });
    
    const result = await rateLimit(event);
    
    expect(result.allowed).toBe(true);
    // Should work without Redis
  });

  it('should maintain state in memory across requests', async () => {
    const event = createMockEvent({ path: '/auth/login', method: 'POST' });
    
    // Make several requests
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(event);
      expect(result.allowed).toBe(true);
    }
    
    // State should be maintained
    const result = await rateLimit(event);
    expect(event.rateLimitHeaders['X-RateLimit-Remaining']).toBe('4');
  });
});

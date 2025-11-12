/**
 * Integration tests for analytics endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ingestEvents, getConfig, cleanupOldEvents } from '../../src/handlers/analytics.js';
import { analyticsConfig } from '../../src/config/analytics.js';

// Mock Prisma
const mockPrismaClient = {
  analyticsEvent: {
    createMany: vi.fn(),
    deleteMany: vi.fn()
  }
};

vi.mock('../../src/db/client.js', () => ({
  getPrisma: () => mockPrismaClient
}));

// Mock environment
process.env.ANALYTICS_ENABLED = 'true';
process.env.ANALYTICS_PERSIST_ENABLED = 'true';
process.env.FRONTEND_URL = 'http://localhost:5173';

describe('Analytics Endpoints', () => {
  beforeEach(() => {
    mockPrismaClient.analyticsEvent.createMany.mockReset();
    mockPrismaClient.analyticsEvent.deleteMany.mockReset();
  });

  describe('POST /analytics/ingest', () => {
    it('should accept valid events', async () => {
      const event = {
        body: JSON.stringify({
          events: [
            {
              event: 'page_view',
              anonId: 'test-anon-id',
              sessionId: 'test-session',
              properties: { path: '/dashboard' }
            }
          ]
        })
      };

      mockPrismaClient.analyticsEvent.createMany.mockResolvedValue({ count: 1 });

      const response = await ingestEvents(event);

      expect(response.statusCode).toBe(200);
      expect(mockPrismaClient.analyticsEvent.createMany).toHaveBeenCalledTimes(1);
      
      const body = JSON.parse(response.body);
      expect(body.accepted).toBe(1);
      expect(body.rejected).toBe(0);
    });

    it('should reject events not in allowed list', async () => {
      const event = {
        body: JSON.stringify({
          events: [
            {
              event: 'custom_event',
              anonId: 'test-anon-id',
              properties: {}
            }
          ]
        })
      };

      const response = await ingestEvents(event);

      expect(response.statusCode).toBe(207); // Multi-status
      expect(mockPrismaClient.analyticsEvent.createMany).not.toHaveBeenCalled();
      
      const body = JSON.parse(response.body);
      expect(body.accepted).toBe(0);
      expect(body.rejected).toBe(1);
      expect(body.errors[0].error).toContain('not allowed');
    });

    it('should reject events with disallowed properties', async () => {
      const event = {
        body: JSON.stringify({
          events: [
            {
              event: 'page_view',
              anonId: 'test-anon-id',
              properties: { 
                path: '/dashboard',
                email: 'test@example.com' // Disallowed
              }
            }
          ]
        })
      };

      const response = await ingestEvents(event);

      expect(response.statusCode).toBe(207);
      
      const body = JSON.parse(response.body);
      expect(body.rejected).toBe(1);
      expect(body.errors[0].error).toContain('disallowed keys');
    });

    it('should enforce batch size limit', async () => {
      const events = [];
      for (let i = 0; i < 51; i++) {
        events.push({
          event: 'page_view',
          anonId: 'test-anon-id',
          properties: { path: `/page${i}` }
        });
      }

      const event = {
        body: JSON.stringify({ events })
      };

      const response = await ingestEvents(event);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Batch size exceeds');
    });

    it('should return 204 when analytics disabled', async () => {
      // Temporarily disable analytics
      const originalEnabled = analyticsConfig.enabled;
      analyticsConfig.enabled = false;

      const event = {
        body: JSON.stringify({
          events: [
            { event: 'page_view', anonId: 'test', properties: {} }
          ]
        })
      };

      const response = await ingestEvents(event);

      expect(response.statusCode).toBe(204);
      expect(mockPrismaClient.analyticsEvent.createMany).not.toHaveBeenCalled();

      // Restore
      analyticsConfig.enabled = originalEnabled;
    });

    it('should return 202 when persist disabled', async () => {
      // Temporarily disable persist
      const originalPersist = analyticsConfig.persistEnabled;
      analyticsConfig.persistEnabled = false;

      const event = {
        body: JSON.stringify({
          events: [
            { event: 'page_view', anonId: 'test', properties: { path: '/' } }
          ]
        })
      };

      const response = await ingestEvents(event);

      expect(response.statusCode).toBe(202);
      expect(mockPrismaClient.analyticsEvent.createMany).not.toHaveBeenCalled();
      
      const body = JSON.parse(response.body);
      expect(body.persisted).toBe(false);

      // Restore
      analyticsConfig.persistEnabled = originalPersist;
    });

    it('should sanitize properties even if not initially detected', async () => {
      const event = {
        body: JSON.stringify({
          events: [
            {
              event: 'page_view',
              anonId: 'test-anon-id',
              properties: { 
                path: '/dashboard',
                user_email: 'test@example.com' // Should be sanitized
              }
            }
          ]
        })
      };

      const response = await ingestEvents(event);

      // Should be rejected due to disallowed properties check
      expect(response.statusCode).toBe(207);
      const body = JSON.parse(response.body);
      expect(body.rejected).toBe(1);
    });
  });

  describe('GET /analytics/config', () => {
    it('should return analytics configuration', async () => {
      const event = {};
      const response = await getConfig(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Cache-Control']).toContain('max-age=300');
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('enabled');
      expect(body).toHaveProperty('requireConsent');
      expect(body).toHaveProperty('allowedEvents');
      expect(body).toHaveProperty('samplingRate');
      expect(body).toHaveProperty('consentCookie');
    });
  });

  describe('DELETE /analytics/events/cleanup', () => {
    it('should delete old events', async () => {
      mockPrismaClient.analyticsEvent.deleteMany.mockResolvedValue({ count: 42 });

      const event = {};
      const response = await cleanupOldEvents(event);

      expect(response.statusCode).toBe(200);
      expect(mockPrismaClient.analyticsEvent.deleteMany).toHaveBeenCalledTimes(1);
      
      const body = JSON.parse(response.body);
      expect(body.deleted).toBe(42);
      expect(body).toHaveProperty('cutoffDate');
    });

    it('should use correct retention period', async () => {
      mockPrismaClient.analyticsEvent.deleteMany.mockResolvedValue({ count: 10 });

      const event = {};
      await cleanupOldEvents(event);

      const call = mockPrismaClient.analyticsEvent.deleteMany.mock.calls[0][0];
      expect(call.where.createdAt).toHaveProperty('lt');
      
      // Verify cutoff date is approximately 30 days ago
      const cutoffDate = call.where.createdAt.lt;
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - analyticsConfig.retentionDays);
      
      const timeDiff = Math.abs(cutoffDate - expectedCutoff);
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          event: 'page_view',
          anonId: 'same-anon-id',
          properties: { path: `/page${i}` }
        });
      }

      mockPrismaClient.analyticsEvent.createMany.mockResolvedValue({ count: 10 });

      // First batch should succeed
      const event1 = {
        body: JSON.stringify({ events })
      };
      const response1 = await ingestEvents(event1);
      expect(response1.statusCode).toBe(200);

      // Send many more batches to exceed rate limit
      for (let i = 0; i < 20; i++) {
        const event = {
          body: JSON.stringify({
            events: [
              { event: 'page_view', anonId: 'same-anon-id', properties: { path: `/page${i}` } }
            ]
          })
        };
        await ingestEvents(event);
      }

      // Next batch should be rate limited
      const eventN = {
        body: JSON.stringify({
          events: [
            { event: 'page_view', anonId: 'same-anon-id', properties: { path: '/final' } }
          ]
        })
      };
      const responseN = await ingestEvents(eventN);
      expect(responseN.statusCode).toBe(429);
      
      const body = JSON.parse(responseN.body);
      expect(body.error).toContain('Rate limit');
    });
  });
});

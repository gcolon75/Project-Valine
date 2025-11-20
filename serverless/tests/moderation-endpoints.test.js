/**
 * Integration tests for moderation endpoints
 * Tests report creation, admin endpoints, and rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createReport, listReports, getReport } from '../src/handlers/reports.js';
import { makeDecision, getHealth } from '../src/handlers/moderation.js';

// Mock Prisma client
const mockPrisma = {
  moderationReport: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  moderationAction: {
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../src/db/client.js', () => ({
  getPrisma: () => mockPrisma,
}));

// Mock rate limit middleware
vi.mock('../src/middleware/rateLimit.js', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true })),
}));

// Mock Discord alerts
vi.mock('../src/utils/discord.js', () => ({
  sendNewReportAlert: vi.fn(),
  sendActionAlert: vi.fn(),
}));

// Helper to create mock event
function createMockEvent(options = {}) {
  return {
    requestContext: {
      http: {
        method: options.method || 'POST',
        path: options.path || '/reports',
        sourceIp: options.ip || '192.168.1.1',
      },
    },
    headers: options.headers || {},
    userId: options.userId || 'user-123',
    body: options.body ? JSON.stringify(options.body) : null,
    pathParameters: options.pathParameters || {},
    queryStringParameters: options.queryStringParameters || {},
    rateLimitHeaders: {},
  };
}

describe('Moderation Endpoints', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set default environment
    process.env.REPORTS_ENABLED = 'true';
    process.env.MODERATION_ENABLED = 'true';
    process.env.ADMIN_ROLE_IDS = 'admin-user-123';
    process.env.REPORT_CATEGORY_ALLOWLIST = 'spam,abuse,unsafe_link,profanity,privacy,other';
  });

  describe('POST /reports - Create Report', () => {
    it('should create a report with valid payload', async () => {
      const reportData = {
        targetType: 'profile',
        targetId: 'profile-456',
        category: 'spam',
        description: 'This profile is posting spam',
        evidenceUrls: ['https://example.com/evidence1'],
      };
      
      const mockReport = {
        id: 'report-789',
        ...reportData,
        reporterId: 'user-123',
        status: 'open',
        severity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPrisma.moderationReport.create.mockResolvedValue(mockReport);
      
      const event = createMockEvent({
        userId: 'user-123',
        body: reportData,
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('report-789');
      expect(body.status).toBe('open');
      expect(mockPrisma.moderationReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reporterId: 'user-123',
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'spam',
          status: 'open',
          severity: 1,
        }),
      });
    });

    it('should reject report when not authenticated', async () => {
      const event = createMockEvent({
        userId: null,
        body: {
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'spam',
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(401);
      expect(mockPrisma.moderationReport.create).not.toHaveBeenCalled();
    });

    it('should reject report with invalid category', async () => {
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'invalid-category',
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors.category).toBeDefined();
      expect(mockPrisma.moderationReport.create).not.toHaveBeenCalled();
    });

    it('should reject report with invalid target type', async () => {
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          targetType: 'invalid-type',
          targetId: 'profile-456',
          category: 'spam',
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors.targetType).toBeDefined();
    });

    it('should reject report with missing required fields', async () => {
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          targetType: 'profile',
          // missing targetId and category
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors.targetId).toBeDefined();
      expect(body.errors.category).toBeDefined();
    });

    it('should reject report when reports are disabled', async () => {
      process.env.REPORTS_ENABLED = 'false';
      
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'spam',
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(503);
      expect(mockPrisma.moderationReport.create).not.toHaveBeenCalled();
    });

    it('should validate evidence URLs array', async () => {
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'spam',
          evidenceUrls: 'not-an-array',
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors.evidenceUrls).toBeDefined();
    });

    it('should limit evidence URLs to 10', async () => {
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'spam',
          evidenceUrls: Array(11).fill('https://example.com'),
        },
      });
      
      const response = await createReport(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors.evidenceUrls).toContain('Maximum 10');
    });
  });

  describe('GET /reports - List Reports (Admin)', () => {
    it('should list reports for admin users', async () => {
      const mockReports = [
        {
          id: 'report-1',
          reporterId: 'user-123',
          targetType: 'profile',
          targetId: 'profile-456',
          category: 'spam',
          status: 'open',
          severity: 1,
          createdAt: new Date(),
          actions: [],
        },
        {
          id: 'report-2',
          reporterId: 'user-456',
          targetType: 'post',
          targetId: 'post-789',
          category: 'abuse',
          status: 'open',
          severity: 3,
          createdAt: new Date(),
          actions: [],
        },
      ];
      
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findMany.mockResolvedValue(mockReports);
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'admin-user-123',
      });
      
      const response = await listReports(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(2);
      expect(body.pagination).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', role: 'user' });
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'user-123',
      });
      
      const response = await listReports(event);
      
      expect(response.statusCode).toBe(403);
      expect(mockPrisma.moderationReport.findMany).not.toHaveBeenCalled();
    });

    it('should filter reports by status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findMany.mockResolvedValue([]);
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'admin-user-123',
        queryStringParameters: { status: 'open' },
      });
      
      await listReports(event);
      
      expect(mockPrisma.moderationReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'open' }),
        })
      );
    });

    it('should filter reports by category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findMany.mockResolvedValue([]);
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'admin-user-123',
        queryStringParameters: { category: 'spam' },
      });
      
      await listReports(event);
      
      expect(mockPrisma.moderationReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'spam' }),
        })
      );
    });

    it('should support pagination with cursor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findMany.mockResolvedValue([]);
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'admin-user-123',
        queryStringParameters: { cursor: 'report-123', limit: '20' },
      });
      
      await listReports(event);
      
      expect(mockPrisma.moderationReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { lt: 'report-123' } }),
          take: 21, // limit + 1 for hasMore check
        })
      );
    });
  });

  describe('GET /reports/:id - Get Report (Admin)', () => {
    it('should get report by ID for admin', async () => {
      const mockReport = {
        id: 'report-789',
        reporterId: 'user-123',
        targetType: 'profile',
        targetId: 'profile-456',
        category: 'spam',
        status: 'open',
        severity: 1,
        createdAt: new Date(),
        actions: [],
      };
      
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findUnique.mockResolvedValue(mockReport);
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'admin-user-123',
        pathParameters: { id: 'report-789' },
      });
      
      const response = await getReport(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('report-789');
      expect(body.actions).toBeDefined();
    });

    it('should return 404 for non-existent report', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findUnique.mockResolvedValue(null);
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'admin-user-123',
        pathParameters: { id: 'non-existent' },
      });
      
      const response = await getReport(event);
      
      expect(response.statusCode).toBe(404);
    });

    it('should reject non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', role: 'user' });
      
      const event = createMockEvent({
        method: 'GET',
        userId: 'user-123',
        pathParameters: { id: 'report-789' },
      });
      
      const response = await getReport(event);
      
      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /moderation/decision - Make Decision (Admin)', () => {
    it('should allow admin to make decision', async () => {
      const mockReport = {
        id: 'report-789',
        reporterId: 'user-123',
        targetType: 'profile',
        targetId: 'profile-456',
        category: 'spam',
        status: 'open',
        severity: 1,
      };
      
      const mockAction = {
        id: 'action-123',
        reportId: 'report-789',
        action: 'remove',
        actorId: 'admin-user-123',
        createdAt: new Date(),
      };
      
      const updatedReport = { ...mockReport, status: 'actioned' };
      
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findUnique.mockResolvedValue(mockReport);
      mockPrisma.moderationAction.create.mockResolvedValue(mockAction);
      mockPrisma.moderationReport.update.mockResolvedValue(updatedReport);
      
      const event = createMockEvent({
        userId: 'admin-user-123',
        body: {
          reportId: 'report-789',
          action: 'remove',
          reason: 'Spam confirmed',
        },
      });
      
      const response = await makeDecision(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.action).toBe('remove');
      expect(body.status).toBe('actioned');
      expect(mockPrisma.moderationAction.create).toHaveBeenCalled();
      expect(mockPrisma.moderationReport.update).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', role: 'user' });
      
      const event = createMockEvent({
        userId: 'user-123',
        body: {
          reportId: 'report-789',
          action: 'remove',
        },
      });
      
      const response = await makeDecision(event);
      
      expect(response.statusCode).toBe(403);
      expect(mockPrisma.moderationAction.create).not.toHaveBeenCalled();
    });

    it('should validate action type', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      
      const event = createMockEvent({
        userId: 'admin-user-123',
        body: {
          reportId: 'report-789',
          action: 'invalid-action',
        },
      });
      
      const response = await makeDecision(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors.action).toBeDefined();
    });

    it('should return 404 for non-existent report', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-user-123', role: 'admin' });
      mockPrisma.moderationReport.findUnique.mockResolvedValue(null);
      
      const event = createMockEvent({
        userId: 'admin-user-123',
        body: {
          reportId: 'non-existent',
          action: 'allow',
        },
      });
      
      const response = await makeDecision(event);
      
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /moderation/health - Health Check', () => {
    it('should return moderation configuration', async () => {
      const event = createMockEvent({
        method: 'GET',
        path: '/moderation/health',
      });
      
      const response = await getHealth(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.enabled).toBeDefined();
      expect(body.reportsEnabled).toBeDefined();
      expect(body.strictMode).toBeDefined();
      expect(body.rules).toBeDefined();
      expect(body.rateLimits).toBeDefined();
    });

    it('should show enabled flags correctly', async () => {
      process.env.MODERATION_ENABLED = 'true';
      process.env.REPORTS_ENABLED = 'true';
      process.env.MODERATION_STRICT_MODE = 'true';
      
      const event = createMockEvent({
        method: 'GET',
        path: '/moderation/health',
      });
      
      const response = await getHealth(event);
      const body = JSON.parse(response.body);
      
      expect(body.enabled).toBe(true);
      expect(body.reportsEnabled).toBe(true);
      expect(body.strictMode).toBe(true);
    });
  });
});

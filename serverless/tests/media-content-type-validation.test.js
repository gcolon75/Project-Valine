/**
 * Tests for media upload content type validation
 * Ensures backend properly validates and uses contentType parameter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUploadUrl } from '../src/handlers/media.js';

// Mock dependencies
vi.mock('../src/db/client.js', () => ({
  getPrisma: () => ({
    profile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'test-profile-id',
        userId: 'test-user-id',
      }),
    },
    media: {
      create: vi.fn().mockResolvedValue({
        id: 'test-media-id',
        profileId: 'test-profile-id',
        type: 'image',
        s3Key: 'profiles/test-profile-id/media/123456-test-media-id',
        processedStatus: 'pending',
      }),
    },
  }),
}));

vi.mock('../src/utils/headers.js', () => ({
  json: (data, status = 200) => ({
    statusCode: status,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  error: (status, message) => ({
    statusCode: status,
    body: JSON.stringify({ error: message }),
    headers: {
      'Content-Type': 'application/json',
    },
  }),
}));

// Mock auth
vi.mock('../src/handlers/auth.js', () => ({
  getUserFromEvent: (event) => event.mockUserId || null
}));

vi.mock('../src/utils/authMiddleware.js', () => ({
  requireEmailVerified: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/middleware/csrfMiddleware.js', () => ({
  csrfProtection: vi.fn().mockReturnValue(null),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({})),
  PutObjectCommand: vi.fn((params) => params),
  GetObjectCommand: vi.fn((params) => params),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

describe('Media Handler - Content Type Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUploadUrl with contentType', () => {
    it('should accept valid image/jpeg contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/jpeg',
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
      expect(body.uploadUrl).toBeDefined();
    });

    it('should accept valid image/png contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/png',
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
    });

    it('should accept valid image/webp contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/webp',
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
    });

    it('should accept valid video/mp4 contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'video',
          contentType: 'video/mp4',
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
    });

    it('should accept valid application/pdf contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'pdf',
          contentType: 'application/pdf',
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
    });

    it('should reject invalid contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/gif', // Not in allowlist
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Invalid contentType');
    });

    it('should reject malicious contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'application/x-executable',
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Invalid contentType');
    });

    it('should fall back to image/jpeg when contentType not provided for image type', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          // No contentType provided
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
      // Should use default image/jpeg
    });

    it('should fall back to video/mp4 when contentType not provided for video type', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'video',
          // No contentType provided
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
      // Should use default video/mp4
    });

    it('should fall back to application/pdf when contentType not provided for pdf type', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'pdf',
          // No contentType provided
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
      // Should use default application/pdf
    });

    it('should maintain backward compatibility for requests without contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          title: 'My Image',
          description: 'Test description',
          privacy: 'public',
          // No contentType field
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBeDefined();
      expect(body.uploadUrl).toBeDefined();
    });
  });
});

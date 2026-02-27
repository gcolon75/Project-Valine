/**
 * Tests for media upload content type and file size validation
 * Ensures backend properly validates mimeType, contentType, and fileSize before presigning
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
  S3Client: vi.fn(function() {}),
  PutObjectCommand: vi.fn(function() {}),
  GetObjectCommand: vi.fn(function() {}),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

describe('Media Handler - Content Type and File Size Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUploadUrl with contentType', () => {
    it('should accept valid image/jpeg contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/jpeg',
          fileSize: 1024 * 1024, // 1 MB
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
          fileSize: 1024 * 1024, // 1 MB
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
          fileSize: 1024 * 1024, // 1 MB
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
          fileSize: 50 * 1024 * 1024, // 50 MB
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
          fileSize: 1024 * 1024, // 1 MB
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
          fileSize: 1024 * 1024,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Invalid MIME type');
    });

    it('should reject malicious contentType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'application/x-executable',
          fileSize: 1024 * 1024,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Invalid MIME type');
    });

    it('should fall back to image/jpeg when contentType not provided for image type', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          fileSize: 1024 * 1024,
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
          fileSize: 50 * 1024 * 1024,
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
          fileSize: 1024 * 1024,
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
          fileSize: 1024 * 1024,
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

  describe('getUploadUrl with mimeType (P0 upload validation)', () => {
    it('should accept valid mimeType field (prefer over contentType)', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          mimeType: 'image/webp',
          fileSize: 1024 * 1024,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
    });

    it('should prefer mimeType over contentType when both are provided', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          mimeType: 'image/png',
          contentType: 'image/jpeg', // mimeType should take precedence
          fileSize: 1024 * 1024,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.mediaId).toBe('test-media-id');
    });

    it('should reject invalid mimeType', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          mimeType: 'image/bmp', // Not in allowlist
          fileSize: 1024 * 1024,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Invalid MIME type');
    });
  });

  describe('getUploadUrl file size validation', () => {
    it('should reject request with missing fileSize', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/jpeg',
          // No fileSize
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('fileSize');
    });

    it('should reject request with zero fileSize', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/jpeg',
          fileSize: 0,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
    });

    it('should reject image over 10 MB', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/jpeg',
          fileSize: 11 * 1024 * 1024, // 11 MB — over 10 MB limit
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(413);
      expect(body.error).toContain('File too large');
    });

    it('should reject video over 100 MB', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'video',
          contentType: 'video/mp4',
          fileSize: 150 * 1024 * 1024, // 150 MB — over 100 MB limit
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(413);
      expect(body.error).toContain('File too large');
    });

    it('should accept video at exactly the max size limit', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'video',
          contentType: 'video/mp4',
          fileSize: 100 * 1024 * 1024, // exactly 100 MB
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
    });

    it('should return maxFileSize in response', async () => {
      const event = {
        mockUserId: 'test-user-id',
        pathParameters: { id: 'test-profile-id' },
        body: JSON.stringify({
          type: 'image',
          contentType: 'image/jpeg',
          fileSize: 1024 * 1024,
        }),
      };

      const response = await getUploadUrl(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.maxFileSize).toBe(10 * 1024 * 1024); // 10 MB for images
    });
  });
});

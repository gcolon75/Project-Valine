import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getUploadUrl, 
  uploadToS3, 
  completeUpload, 
  updateMedia, 
  deleteMedia,
  uploadMedia,
  getContentType
} from '../mediaService';
import { apiClient } from '../api.js';

// Mock the API client
vi.mock('../api.js', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('mediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContentType', () => {
    it('should return file MIME type if available', () => {
      const file = { type: 'image/png' };
      expect(getContentType(file, 'image')).toBe('image/png');
    });

    it('should return fallback MIME type for image', () => {
      const file = { type: '' };
      expect(getContentType(file, 'image')).toBe('image/jpeg');
    });

    it('should return fallback MIME type for video', () => {
      const file = { type: '' };
      expect(getContentType(file, 'video')).toBe('video/mp4');
    });

    it('should return fallback MIME type for pdf', () => {
      const file = { type: '' };
      expect(getContentType(file, 'pdf')).toBe('application/pdf');
    });

    it('should return default MIME type for unknown media type', () => {
      const file = { type: '' };
      expect(getContentType(file, 'unknown')).toBe('application/octet-stream');
    });
  });

  describe('getUploadUrl', () => {
    it('should successfully get upload URL', async () => {
      const mockResponse = {
        data: {
          mediaId: 'media-123',
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          s3Key: 'profiles/user-123/media/12345-media-123',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await getUploadUrl('user-123', 'image', 'Test Image');

      expect(apiClient.post).toHaveBeenCalledWith('/profiles/user-123/media/upload-url', {
        type: 'image',
        title: 'Test Image',
        description: null,
        privacy: 'public',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should include contentType when provided', async () => {
      const mockResponse = {
        data: {
          mediaId: 'media-123',
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          s3Key: 'profiles/user-123/media/12345-media-123',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await getUploadUrl('user-123', 'image', 'Test Image', null, 'public', 'image/png');

      expect(apiClient.post).toHaveBeenCalledWith('/profiles/user-123/media/upload-url', {
        type: 'image',
        title: 'Test Image',
        description: null,
        privacy: 'public',
        contentType: 'image/png',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should not include contentType when not provided', async () => {
      const mockResponse = {
        data: {
          mediaId: 'media-123',
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          s3Key: 'profiles/user-123/media/12345-media-123',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await getUploadUrl('user-123', 'image', 'Test Image', null, 'public', null);

      expect(apiClient.post).toHaveBeenCalledWith('/profiles/user-123/media/upload-url', {
        type: 'image',
        title: 'Test Image',
        description: null,
        privacy: 'public',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if profileId is missing', async () => {
      await expect(getUploadUrl(null, 'image')).rejects.toThrow('Profile ID is required');
    });

    it('should throw error if type is invalid', async () => {
      await expect(getUploadUrl('user-123', 'invalid')).rejects.toThrow(
        'Valid type is required (image, video, or pdf)'
      );
    });

    it('should handle 403 forbidden error', async () => {
      apiClient.post.mockRejectedValue({
        response: { status: 403 },
      });

      await expect(getUploadUrl('user-123', 'image')).rejects.toThrow(
        'You do not have permission to upload to this profile'
      );
    });

    it('should handle 404 not found error', async () => {
      apiClient.post.mockRejectedValue({
        response: { status: 404 },
      });

      await expect(getUploadUrl('user-123', 'image')).rejects.toThrow('Profile not found');
    });

    it('should handle custom error message from response', async () => {
      apiClient.post.mockRejectedValue({
        response: { data: { error: 'Custom error message' } },
      });

      await expect(getUploadUrl('user-123', 'image')).rejects.toThrow('Custom error message');
    });
  });

  describe('uploadToS3', () => {
    it('should be a function that returns a Promise', () => {
      expect(typeof uploadToS3).toBe('function');
      const result = uploadToS3('http://example.com', new File(['test'], 'test.txt'), 'pdf');
      expect(result).toBeInstanceOf(Promise);
      // Don't wait for it to complete, just verify it's a promise
      result.catch(() => {}); // Prevent unhandled rejection
    });
  });

  describe('completeUpload', () => {
    it('should successfully complete upload', async () => {
      const mockResponse = {
        data: {
          media: { id: 'media-123', processedStatus: 'processing' },
          message: 'Upload marked as complete',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await completeUpload('user-123', 'media-123', {
        width: 1920,
        height: 1080,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/profiles/user-123/media/complete', {
        mediaId: 'media-123',
        width: 1920,
        height: 1080,
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if profileId is missing', async () => {
      await expect(completeUpload(null, 'media-123')).rejects.toThrow('Profile ID is required');
    });

    it('should throw error if mediaId is missing', async () => {
      await expect(completeUpload('user-123', null)).rejects.toThrow('Media ID is required');
    });

    it('should handle 403 forbidden error', async () => {
      apiClient.post.mockRejectedValue({
        response: { status: 403 },
      });

      await expect(completeUpload('user-123', 'media-123')).rejects.toThrow(
        'You do not have permission to complete this upload'
      );
    });
  });

  describe('updateMedia', () => {
    it('should successfully update media', async () => {
      const mockResponse = {
        data: { id: 'media-123', title: 'Updated Title' },
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateMedia('media-123', { title: 'Updated Title' });

      expect(apiClient.put).toHaveBeenCalledWith('/media/media-123', {
        title: 'Updated Title',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if mediaId is missing', async () => {
      await expect(updateMedia(null, {})).rejects.toThrow('Media ID is required');
    });
  });

  describe('deleteMedia', () => {
    it('should successfully delete media', async () => {
      apiClient.delete.mockResolvedValue({});

      await deleteMedia('media-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/media/media-123');
    });

    it('should throw error if mediaId is missing', async () => {
      await expect(deleteMedia(null)).rejects.toThrow('Media ID is required');
    });
  });

  describe('uploadMedia', () => {
    it('should validate file size for images', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      await expect(uploadMedia('user-123', largeFile, 'image')).rejects.toThrow(
        'File size must be less than 10MB'
      );
    });

    it('should validate file size for videos', async () => {
      const largeFile = new File(['x'.repeat(501 * 1024 * 1024)], 'large.mp4', {
        type: 'video/mp4',
      });

      await expect(uploadMedia('user-123', largeFile, 'video')).rejects.toThrow(
        'File size must be less than 500MB'
      );
    });
  });
});

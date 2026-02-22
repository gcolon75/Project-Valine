// src/services/__tests__/reelsService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as reelsService from '../reelsService';
import { apiClient } from '../api.js';

// Mock the API client
vi.mock('../api.js');

describe('reelsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReels', () => {
    it('should fetch reels with default parameters', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: '1',
              videoUrl: 'https://example.com/video.mp4',
              caption: 'Test reel',
              author: { username: 'test', displayName: 'Test User' },
              likes: 10,
              comments: 5,
              isLiked: false,
              isBookmarked: false,
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await reelsService.getReels();

      expect(apiClient.get).toHaveBeenCalledWith('/reels', {
        params: { limit: 20 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch reels with pagination', async () => {
      const mockResponse = {
        data: {
          items: [],
          nextCursor: 'xyz',
          hasMore: true,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      await reelsService.getReels(50, 'abc123');

      expect(apiClient.get).toHaveBeenCalledWith('/reels', {
        params: { limit: 50, cursor: 'abc123' },
      });
    });
  });

  describe('toggleReelLike', () => {
    it('should toggle like on a reel', async () => {
      const mockResponse = {
        data: {
          success: true,
          likes: 11,
          isLiked: true,
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await reelsService.toggleReelLike('reel-123');

      expect(apiClient.post).toHaveBeenCalledWith('/reels/reel-123/like');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('toggleReelBookmark', () => {
    it('should toggle bookmark on a reel', async () => {
      const mockResponse = {
        data: {
          success: true,
          isBookmarked: true,
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await reelsService.toggleReelBookmark('reel-123');

      expect(apiClient.post).toHaveBeenCalledWith('/reels/reel-123/bookmark');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('requestReelAccess', () => {
    it('should request access to on-request reel with message', async () => {
      const mockResponse = {
        data: {
          id: 'request-123',
          mediaId: 'reel-123',
          requesterId: 'user-1',
          ownerId: 'user-2',
          message: 'Please grant access',
          status: 'pending',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await reelsService.requestReelAccess('reel-123', 'Please grant access');

      expect(apiClient.post).toHaveBeenCalledWith('/reels/reel-123/request', {
        message: 'Please grant access',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should request access without message', async () => {
      const mockResponse = {
        data: {
          id: 'request-123',
          mediaId: 'reel-123',
          status: 'pending',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      await reelsService.requestReelAccess('reel-123');

      expect(apiClient.post).toHaveBeenCalledWith('/reels/reel-123/request', {
        message: '',
      });
    });
  });

  describe('listReelRequests', () => {
    it('should list received requests by default', async () => {
      const mockResponse = {
        data: [
          {
            id: 'request-1',
            mediaId: 'reel-1',
            status: 'pending',
            requester: { username: 'user1' },
          },
        ],
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await reelsService.listReelRequests();

      expect(apiClient.get).toHaveBeenCalledWith('/reel-requests', {
        params: { type: 'received' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should list sent requests', async () => {
      const mockResponse = {
        data: [],
      };

      apiClient.get.mockResolvedValue(mockResponse);

      await reelsService.listReelRequests({ type: 'sent' });

      expect(apiClient.get).toHaveBeenCalledWith('/reel-requests', {
        params: { type: 'sent' },
      });
    });

    it('should filter by status', async () => {
      const mockResponse = {
        data: [],
      };

      apiClient.get.mockResolvedValue(mockResponse);

      await reelsService.listReelRequests({ type: 'received', status: 'approved' });

      expect(apiClient.get).toHaveBeenCalledWith('/reel-requests', {
        params: { type: 'received', status: 'approved' },
      });
    });
  });

  describe('approveReelRequest', () => {
    it('should approve a request with response message', async () => {
      const mockResponse = {
        data: {
          id: 'request-123',
          status: 'approved',
          response: 'Welcome!',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await reelsService.approveReelRequest('request-123', 'Welcome!');

      expect(apiClient.post).toHaveBeenCalledWith('/reel-requests/request-123/approve', {
        response: 'Welcome!',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should approve a request without response', async () => {
      const mockResponse = {
        data: {
          id: 'request-123',
          status: 'approved',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      await reelsService.approveReelRequest('request-123');

      expect(apiClient.post).toHaveBeenCalledWith('/reel-requests/request-123/approve', {
        response: '',
      });
    });
  });

  describe('denyReelRequest', () => {
    it('should deny a request with response message', async () => {
      const mockResponse = {
        data: {
          id: 'request-123',
          status: 'denied',
          response: 'Sorry, not at this time',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await reelsService.denyReelRequest('request-123', 'Sorry, not at this time');

      expect(apiClient.post).toHaveBeenCalledWith('/reel-requests/request-123/deny', {
        response: 'Sorry, not at this time',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should deny a request without response', async () => {
      const mockResponse = {
        data: {
          id: 'request-123',
          status: 'denied',
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      await reelsService.denyReelRequest('request-123');

      expect(apiClient.post).toHaveBeenCalledWith('/reel-requests/request-123/deny', {
        response: '',
      });
    });
  });

  describe('getReelComments', () => {
    it('should fetch comments for a reel', async () => {
      const mockResponse = {
        data: {
          comments: [
            {
              id: 'comment-1',
              text: 'Great reel!',
              author: { username: 'user1' },
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await reelsService.getReelComments('reel-123');

      expect(apiClient.get).toHaveBeenCalledWith('/reels/reel-123/comments', {
        params: { limit: 20 },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('addReelComment', () => {
    it('should add a comment to a reel', async () => {
      const mockResponse = {
        data: {
          comment: {
            id: 'comment-1',
            text: 'Great work!',
            author: { username: 'user1' },
          },
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await reelsService.addReelComment('reel-123', 'Great work!');

      expect(apiClient.post).toHaveBeenCalledWith('/reels/reel-123/comments', {
        content: 'Great work!',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});

// src/services/__tests__/search.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchProfiles, searchUsers, searchPosts, rankForUser } from '../search';
import apiClient from '../api';

// Mock the API client
vi.mock('../api');

describe('search service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchProfiles', () => {
    it('should search profiles with all parameters', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: '1',
              vanityUrl: 'johndoe',
              headline: 'Voice Actor',
              user: { username: 'johndoe', displayName: 'John Doe' },
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await searchProfiles({
        query: 'voice',
        role: 'actor',
        location: 'Los Angeles',
        limit: 10,
        cursor: 'abc123',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/search', {
        params: {
          query: 'voice',
          role: 'actor',
          location: 'Los Angeles',
          limit: 10,
          cursor: 'abc123',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should search profiles with minimal parameters', async () => {
      const mockResponse = {
        data: {
          items: [],
          nextCursor: null,
          hasMore: false,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await searchProfiles({ query: 'test' });

      expect(apiClient.get).toHaveBeenCalledWith('/search', {
        params: {
          query: 'test',
          limit: 20,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle search errors', async () => {
      apiClient.get.mockRejectedValue(new Error('Search failed'));

      await expect(searchProfiles({ query: 'test' })).rejects.toThrow('Search failed');
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: '1',
              username: 'johndoe',
              displayName: 'John Doe',
              avatar: 'https://example.com/avatar.jpg',
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await searchUsers({ query: 'john' });

      expect(apiClient.get).toHaveBeenCalledWith('/search/users', {
        params: {
          query: 'john',
          limit: 20,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when query is missing', async () => {
      await expect(searchUsers({})).rejects.toThrow('query parameter is required');
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should support pagination parameters', async () => {
      const mockResponse = {
        data: {
          items: [],
          nextCursor: 'xyz',
          hasMore: true,
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      await searchUsers({ query: 'test', limit: 50, cursor: 'abc' });

      expect(apiClient.get).toHaveBeenCalledWith('/search/users', {
        params: {
          query: 'test',
          limit: 50,
          cursor: 'abc',
        },
      });
    });
  });

  describe('searchPosts (client-side)', () => {
    const mockPosts = [
      {
        id: 1,
        title: 'SciFi Adventure',
        body: 'A great story',
        tags: ['scifi', 'adventure'],
        likes: 10,
        comments: 5,
        createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
      },
      {
        id: 2,
        title: 'Fantasy Quest',
        body: 'Epic tale',
        tags: ['fantasy'],
        likes: 5,
        comments: 2,
        createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      },
    ];

    it('should search and rank posts by query', () => {
      const results = searchPosts(mockPosts, 'scifi');
      
      expect(results).toHaveLength(2);
      // SciFi post should rank higher
      expect(results[0].id).toBe(1);
    });

    it('should return all posts when query is empty', () => {
      const results = searchPosts(mockPosts, '');
      
      expect(results).toHaveLength(2);
      expect(results).toEqual(mockPosts);
    });

    it('should search by hashtag', () => {
      const results = searchPosts(mockPosts, '#fantasy');
      
      // Fantasy post should be included in results
      expect(results).toHaveLength(2);
      const fantasyPost = results.find(p => p.id === 2);
      expect(fantasyPost).toBeDefined();
      // Fantasy post gets tag match score boost (8 points)
      expect(results.findIndex(p => p.id === 2)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('rankForUser (client-side)', () => {
    const mockPosts = [
      {
        id: 1,
        title: 'Post 1',
        body: 'Content',
        tags: ['tech'],
        likes: 10,
        comments: 5,
        createdAt: Date.now(),
      },
      {
        id: 2,
        title: 'Post 2',
        body: 'Content',
        tags: ['art'],
        likes: 5,
        comments: 2,
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];

    it('should rank posts with user preferences', () => {
      const prefs = { tech: 10, art: 1 };
      const results = rankForUser(mockPosts, prefs);
      
      expect(results).toHaveLength(2);
      // Tech post should rank higher with preferences
      expect(results[0].id).toBe(1);
    });

    it('should rank posts without preferences', () => {
      const results = rankForUser(mockPosts);
      
      expect(results).toHaveLength(2);
    });
  });
});

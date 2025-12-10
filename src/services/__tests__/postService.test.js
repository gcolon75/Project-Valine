import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeedPosts, listPosts } from '../postService';
import { apiClient } from '../api.js';

vi.mock('../api.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('postService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeedPosts', () => {
    it('fetches feed posts from /feed and normalizes response', async () => {
      const mockPosts = [{ id: 'p1' }];
      apiClient.get.mockResolvedValue({ data: { posts: mockPosts, nextCursor: null } });

      const result = await getFeedPosts(10, 'cursor123');

      expect(apiClient.get).toHaveBeenCalledWith('/feed', { params: { limit: 10, cursor: 'cursor123' } });
      expect(result).toEqual(mockPosts);
    });

    it('returns raw array responses for backward compatibility', async () => {
      const mockPosts = [{ id: 'p2' }];
      apiClient.get.mockResolvedValue({ data: mockPosts });

      const result = await getFeedPosts();

      expect(apiClient.get).toHaveBeenCalledWith('/feed', { params: { limit: 20, cursor: null } });
      expect(result).toEqual(mockPosts);
    });
  });

  describe('listPosts', () => {
    it('fetches generic feed without authorId', async () => {
      const mockPosts = [
        { id: 'p1', authorId: 'user1', content: 'Post 1' },
        { id: 'p2', authorId: 'user2', content: 'Post 2' }
      ];
      apiClient.get.mockResolvedValue({ data: { posts: mockPosts } });

      const result = await listPosts({ limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/posts', { params: { limit: 20 } });
      expect(result).toEqual(mockPosts);
    });

    it('filters posts by authorId when provided', async () => {
      const mockPosts = [
        { id: 'p1', authorId: 'user1', content: 'User1 Post 1' },
        { id: 'p2', authorId: 'user1', content: 'User1 Post 2' }
      ];
      apiClient.get.mockResolvedValue({ data: { posts: mockPosts } });

      const result = await listPosts({ authorId: 'user1', limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/posts', { 
        params: { limit: 20, authorId: 'user1' } 
      });
      expect(result).toEqual(mockPosts);
    });

    it('preserves pagination with cursor', async () => {
      const mockPosts = [{ id: 'p3', authorId: 'user1', content: 'Page 2' }];
      apiClient.get.mockResolvedValue({ data: { posts: mockPosts } });

      const result = await listPosts({ 
        authorId: 'user1', 
        limit: 10, 
        cursor: 'cursor-abc' 
      });

      expect(apiClient.get).toHaveBeenCalledWith('/posts', { 
        params: { limit: 10, authorId: 'user1', cursor: 'cursor-abc' } 
      });
      expect(result).toEqual(mockPosts);
    });

    it('normalizes raw array responses for backward compatibility', async () => {
      const mockPosts = [{ id: 'p4', authorId: 'user2' }];
      apiClient.get.mockResolvedValue({ data: mockPosts });

      const result = await listPosts({ authorId: 'user2' });

      expect(result).toEqual(mockPosts);
    });
  });
});

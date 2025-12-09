import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeedPosts } from '../postService';
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

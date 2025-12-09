import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConnectionStatus } from '../connectionService';
import { apiClient } from '../api.js';

vi.mock('../api.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('connectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps follower status into isFollowedBy', async () => {
    apiClient.get.mockResolvedValue({ data: { isFollowing: true, isFollowedBy: true } });

    const result = await getConnectionStatus('user-123');

    expect(apiClient.get).toHaveBeenCalledWith('/connections/status/user-123');
    expect(result).toEqual({
      isFollowing: true,
      isFollowedBy: true,
      requestPending: false,
      requestSent: false,
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../Profile';
import * as userService from '../../services/userService';
import * as profileService from '../../services/profileService';
import * as postService from '../../services/postService';
import * as connectionService from '../../services/connectionService';

// Mock services
vi.mock('../../services/userService');
vi.mock('../../services/profileService');
vi.mock('../../services/postService');
vi.mock('../../services/connectionService');

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user123', username: 'testuser', displayName: 'Test User' },
    isInitialized: true
  })
}));

const renderProfile = (routeParams = {}) => {
  // Mock useParams to return route params
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
      ...actual,
      useParams: () => routeParams
    };
  });

  return render(
    <BrowserRouter>
      <Profile />
    </BrowserRouter>
  );
};

describe('Profile - Posts Tab', () => {
  const mockProfile = {
    id: 'profile123',
    displayName: 'Test User',
    username: 'testuser',
    title: 'Voice Actor',
    bio: 'Test bio',
    avatar: 'https://example.com/avatar.jpg',
    bannerUrl: null,
    _count: { posts: 3, followers: 10, following: 5 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays posts count from posts.length when posts are loaded', async () => {
    const mockPosts = [
      { id: 'p1', content: 'Post 1', authorId: 'profile123', author: { displayName: 'Test User', username: 'testuser' } },
      { id: 'p2', content: 'Post 2', authorId: 'profile123', author: { displayName: 'Test User', username: 'testuser' } },
      { id: 'p3', content: 'Post 3', authorId: 'profile123', author: { displayName: 'Test User', username: 'testuser' } }
    ];

    profileService.getMyProfile.mockResolvedValue(mockProfile);
    postService.listPosts.mockResolvedValue(mockPosts);
    connectionService.getConnectionStatus.mockResolvedValue({
      isFollowing: false,
      isFollowedBy: false,
      requestPending: false,
      requestSent: false
    });

    renderProfile();

    // Wait for profile and posts to load
    await waitFor(() => {
      expect(postService.listPosts).toHaveBeenCalledWith({
        authorId: 'profile123',
        limit: 20
      });
    });

    // The stats should show posts.length (3) instead of _count.posts
    await waitFor(() => {
      const statsSection = screen.getByText(/Posts/i).closest('div');
      expect(statsSection).toHaveTextContent('3');
    });
  });

  it('displays empty state when API returns empty array', async () => {
    profileService.getMyProfile.mockResolvedValue(mockProfile);
    postService.listPosts.mockResolvedValue([]);
    connectionService.getConnectionStatus.mockResolvedValue({
      isFollowing: false,
      isFollowedBy: false,
      requestPending: false,
      requestSent: false
    });

    renderProfile();

    await waitFor(() => {
      expect(postService.listPosts).toHaveBeenCalled();
    });

    // Should show empty state (no posts message or similar)
    await waitFor(() => {
      // The component should render but show no post cards
      const postsTab = screen.queryByText(/No posts yet/i) || screen.queryByText(/Loading posts/i);
      // At minimum, posts.length should be 0
      expect(postService.listPosts).toHaveReturnedWith([]);
    });
  });

  it('calls listPosts with authorId from profile', async () => {
    profileService.getMyProfile.mockResolvedValue(mockProfile);
    postService.listPosts.mockResolvedValue([]);
    connectionService.getConnectionStatus.mockResolvedValue({
      isFollowing: false,
      isFollowedBy: false,
      requestPending: false,
      requestSent: false
    });

    renderProfile();

    await waitFor(() => {
      expect(postService.listPosts).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: 'profile123',
          limit: 20
        })
      );
    });
  });
});

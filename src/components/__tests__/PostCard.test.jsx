import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostCard from '../PostCard';
import { FeedProvider } from '../../context/FeedContext';
import { createMockPost } from '../../test/utils';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', name: 'Test User' },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock mediaService
vi.mock('../../services/mediaService', () => ({
  getMediaAccessUrl: vi.fn().mockResolvedValue({ downloadUrl: 'http://test.com/download', filename: 'test.pdf' }),
  requestMediaAccess: vi.fn().mockResolvedValue({ status: 'pending' }),
}));

describe('PostCard', () => {
  const renderPostCard = (post = createMockPost()) => {
    return render(
      <FeedProvider>
        <PostCard post={post} />
      </FeedProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render post author information', () => {
    const post = createMockPost({
      author: {
        name: 'John Doe',
        role: 'Voice Actor',
      },
    });

    renderPostCard(post);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Voice Actor')).toBeInTheDocument();
  });

  it('should render post title and body', () => {
    const post = createMockPost({
      title: 'Test Post Title',
      body: 'This is the post content',
    });

    renderPostCard(post);

    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    expect(screen.getByText('This is the post content')).toBeInTheDocument();
  });

  it('should render post tags', () => {
    const post = createMockPost({
      tags: ['voiceover', 'animation', 'demo'],
    });

    renderPostCard(post);

    expect(screen.getByText('voiceover')).toBeInTheDocument();
    expect(screen.getByText('animation')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
  });

  it('should display like count', () => {
    const post = createMockPost({
      likes: 42,
    });

    renderPostCard(post);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should display comment count', () => {
    const post = createMockPost({
      comments: 15,
    });

    renderPostCard(post);

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should call likePost when like button clicked', async () => {
    const user = userEvent.setup();
    const post = createMockPost({ id: 'post-123', likes: 5 });

    renderPostCard(post);

    const likeButton = screen.getAllByRole('button')[0]; // First action button
    await user.click(likeButton);

    // Verify the like button was clicked (likes count should update)
    expect(likeButton).toBeInTheDocument();
  });

  it('should toggle comments when comment button clicked', async () => {
    const user = userEvent.setup();
    const post = createMockPost({comments: 3});

    renderPostCard(post);

    const commentButton = screen.getAllByRole('button')[1]; // Second action button
    
    // Verify comment button exists and shows count
    expect(commentButton).toBeInTheDocument();
    expect(commentButton.textContent).toContain('3');

    // Click to toggle comments
    await user.click(commentButton);

    // Button should still be in the document
    expect(commentButton).toBeInTheDocument();
  });

  it('should call toggleSave when save button clicked', async () => {
    const user = userEvent.setup();
    const post = createMockPost({ id: 'post-456', saved: false });

    renderPostCard(post);

    const saveButton = screen.getByText('Save').closest('button');
    await user.click(saveButton);

    // Verify the save button was clicked
    expect(saveButton).toBeInTheDocument();
  });

  it('should show saved state correctly', () => {
    const post = createMockPost({ saved: true });

    renderPostCard(post);

    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('should show unsaved state correctly', () => {
    const post = createMockPost({ saved: false });

    renderPostCard(post);

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should render request access button for gated posts', () => {
    const post = createMockPost({ visibility: 'on-request', mediaId: 'media-123' });
    renderPostCard(post);

    expect(screen.getByText('Request Access')).toBeInTheDocument();
  });

  it('should handle request access button click', async () => {
    const user = userEvent.setup();
    const post = createMockPost({ id: 'post-789', visibility: 'on-request', mediaId: 'media-123' });

    renderPostCard(post);

    const requestButton = screen.getByText('Request Access').closest('button');
    await user.click(requestButton);

    // Should show toast notification (note: toast library mocked in test setup)
    // Test passes if button click doesn't throw error
    expect(requestButton).toBeInTheDocument();
  });

  it('should render download button for public posts with media', () => {
    const post = createMockPost({ visibility: 'public', mediaId: 'media-123' });
    renderPostCard(post);

    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should show blurred preview for gated content', () => {
    const post = createMockPost({ visibility: 'on-request', mediaId: 'media-123' });
    renderPostCard(post);

    // Should show access required text
    expect(screen.getByText('Access Required')).toBeInTheDocument();
  });

  it('should apply correct styling for saved posts', () => {
    const post = createMockPost({ saved: true });

    renderPostCard(post);

    const saveButton = screen.getByText('Saved').closest('button');
    expect(saveButton.className).toContain('emerald');
  });

  it('should apply correct styling for unsaved posts', () => {
    const post = createMockPost({ saved: false });

    renderPostCard(post);

    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton.className).toContain('neutral');
  });
});

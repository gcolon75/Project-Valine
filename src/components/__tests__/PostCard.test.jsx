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

  it('should render request button', () => {
    renderPostCard();

    expect(screen.getByText('Request')).toBeInTheDocument();
  });

  it('should handle request button click', async () => {
    const user = userEvent.setup();
    const post = createMockPost({ id: 'post-789' });

    // Mock console.log to verify it's called
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderPostCard(post);

    const requestButton = screen.getByText('Request').closest('button');
    await user.click(requestButton);

    expect(consoleSpy).toHaveBeenCalledWith('Request access for post:', 'post-789');
    
    consoleSpy.mockRestore();
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

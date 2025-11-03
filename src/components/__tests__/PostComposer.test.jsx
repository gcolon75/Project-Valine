// src/components/__tests__/PostComposer.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostComposer from '../PostComposer';
import { renderWithProviders } from '../../test/utils';

// Mock FeedContext
const mockCreatePost = vi.fn();
vi.mock('../../context/FeedContext', () => ({
  useFeed: () => ({
    createPost: mockCreatePost,
  }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PostComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render post composer form', () => {
    renderWithProviders(<PostComposer />);
    
    expect(screen.getByPlaceholderText(/share a script/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add a short description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument();
  });

  it('should update title when typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostComposer />);
    
    const titleInput = screen.getByPlaceholderText(/share a script/i);
    await user.type(titleInput, 'My New Post');
    
    expect(titleInput).toHaveValue('My New Post');
  });

  it('should update body when typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostComposer />);
    
    const bodyInput = screen.getByPlaceholderText(/add a short description/i);
    await user.type(bodyInput, 'This is my post content');
    
    expect(bodyInput).toHaveValue('This is my post content');
  });

  it('should add tags when pressing Enter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostComposer />);
    
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'voiceacting{Enter}');
    
    expect(screen.getByText('#voiceacting')).toBeInTheDocument();
  });

  it('should add # to tags without hash', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostComposer />);
    
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'demo{Enter}');
    
    expect(screen.getByText('#demo')).toBeInTheDocument();
  });

  it('should not add duplicate tags', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostComposer />);
    
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'demo{Enter}');
    await user.type(tagInput, 'demo{Enter}');
    
    const tags = screen.getAllByText('#demo');
    expect(tags).toHaveLength(1);
  });

  it('should remove tag when clicking X', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostComposer />);
    
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'demo{Enter}');
    
    // The button has the text "#demo" in it
    const removeButton = screen.getByRole('button', { name: /#demo/i });
    await user.click(removeButton);
    
    expect(screen.queryByText('#demo')).not.toBeInTheDocument();
  });

  it('should show error if title is empty', async () => {
    const user = userEvent.setup();
    const toast = await import('react-hot-toast');
    renderWithProviders(<PostComposer />);
    
    const postButton = screen.getByRole('button', { name: /post/i });
    await user.click(postButton);
    
    expect(toast.default.error).toHaveBeenCalledWith('Please add a title to your post');
    expect(mockCreatePost).not.toHaveBeenCalled();
  });

  it('should create post with valid data', async () => {
    const user = userEvent.setup();
    const toast = await import('react-hot-toast');
    mockCreatePost.mockResolvedValue({ id: '123' });
    
    renderWithProviders(<PostComposer />);
    
    await user.type(screen.getByPlaceholderText(/share a script/i), 'Test Post');
    await user.type(screen.getByPlaceholderText(/add a short description/i), 'Post content');
    await user.type(screen.getByPlaceholderText(/add tag/i), 'demo{Enter}');
    
    const postButton = screen.getByRole('button', { name: /post/i });
    await user.click(postButton);
    
    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        title: 'Test Post',
        body: 'Post content',
        tags: ['#demo'],
      });
      expect(toast.default.success).toHaveBeenCalledWith('Post created successfully!');
    });
  });

  it('should clear form after successful post', async () => {
    const user = userEvent.setup();
    mockCreatePost.mockResolvedValue({ id: '123' });
    
    renderWithProviders(<PostComposer />);
    
    const titleInput = screen.getByPlaceholderText(/share a script/i);
    const bodyInput = screen.getByPlaceholderText(/add a short description/i);
    
    await user.type(titleInput, 'Test Post');
    await user.type(bodyInput, 'Post content');
    await user.type(screen.getByPlaceholderText(/add tag/i), 'demo{Enter}');
    
    await user.click(screen.getByRole('button', { name: /post/i }));
    
    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      expect(bodyInput).toHaveValue('');
      expect(screen.queryByText('#demo')).not.toBeInTheDocument();
    });
  });

  it('should trim whitespace from title and body', async () => {
    const user = userEvent.setup();
    mockCreatePost.mockResolvedValue({ id: '123' });
    
    renderWithProviders(<PostComposer />);
    
    await user.type(screen.getByPlaceholderText(/share a script/i), '  Test Post  ');
    await user.type(screen.getByPlaceholderText(/add a short description/i), '  Content  ');
    
    await user.click(screen.getByRole('button', { name: /post/i }));
    
    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        title: 'Test Post',
        body: 'Content',
        tags: [],
      });
    });
  });

  it('should handle post creation error', async () => {
    const user = userEvent.setup();
    const toast = await import('react-hot-toast');
    // Mock createPost to throw error
    mockCreatePost.mockImplementation(() => {
      throw new Error('API Error');
    });
    
    renderWithProviders(<PostComposer />);
    
    await user.type(screen.getByPlaceholderText(/share a script/i), 'Test Post');
    await user.click(screen.getByRole('button', { name: /post/i }));
    
    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Failed to create post. Please try again.');
    }, { timeout: 3000 });
  });
});

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

/**
 * Custom render function that wraps components with necessary providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Render result with additional utilities
 */
export function renderWithProviders(ui, options = {}) {
  const {
    initialAuth = null,
    route = '/',
    ...renderOptions
  } = options;

  // Set initial route
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider initialAuth={initialAuth}>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Create mock user object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    bio: 'Test bio',
    avatar: 'https://example.com/avatar.jpg',
    profileComplete: true,
    ...overrides,
  };
}

/**
 * Create mock post object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock post object
 */
export function createMockPost(overrides = {}) {
  return {
    id: 'test-post-id',
    content: 'Test post content',
    media: [],
    authorId: 'test-user-id',
    author: createMockUser(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock reel object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock reel object
 */
export function createMockReel(overrides = {}) {
  return {
    id: 'test-reel-id',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    caption: 'Test reel caption',
    likes: 10,
    comments: 5,
    shares: 2,
    isLiked: false,
    isBookmarked: false,
    author: createMockUser(),
    ...overrides,
  };
}

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

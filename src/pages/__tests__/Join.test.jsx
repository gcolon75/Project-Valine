/**
 * Tests for Join page with allowlist enforcement and inline validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Join from '../../pages/Join';
import { AuthProvider } from '../../context/AuthContext';

// Mock the allowlist config
vi.mock('../../utils/allowlistConfig', () => ({
  isEmailAllowed: vi.fn((email) => {
    const allowed = ['ghawk075@gmail.com', 'valinejustin@gmail.com'];
    return allowed.includes(email.toLowerCase());
  }),
  isAllowlistActive: vi.fn(() => true),
  getAllowedEmails: vi.fn(() => ['ghawk075@gmail.com', 'valinejustin@gmail.com']),
  getAllowlistCount: vi.fn(() => 2),
  getRestrictedMessage: vi.fn(() => 'Registration is restricted. Only pre-approved accounts may sign in.')
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock analytics
vi.mock('../../analytics/client', () => ({
  trackLogin: vi.fn(),
  trackSignup: vi.fn(),
  trackLogout: vi.fn()
}));

describe('Join Page - Allowlist Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show restricted notice when allowlist is active', () => {
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    isAllowlistActive.mockReturnValue(true);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Join />
        </AuthProvider>
      </BrowserRouter>
    );

    // Should show restriction notice
    expect(screen.getByText(/Registration is Restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/pre-approved accounts/i)).toBeInTheDocument();
    
    // Should show link to home
    expect(screen.getByText(/Return to Home/i)).toBeInTheDocument();
  });

  it('should show registration form when allowlist is not active', () => {
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    isAllowlistActive.mockReturnValue(false);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Join />
        </AuthProvider>
      </BrowserRouter>
    );

    // Should show registration form
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
  });

  it('should have link to login page in restriction notice', () => {
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    isAllowlistActive.mockReturnValue(true);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Join />
        </AuthProvider>
      </BrowserRouter>
    );

    const loginLink = screen.getByText(/Sign in/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});

describe('Join Page - Inline validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    isAllowlistActive.mockReturnValue(false);
  });

  const renderOpen = () =>
    render(
      <BrowserRouter>
        <AuthProvider>
          <Join />
        </AuthProvider>
      </BrowserRouter>
    );

  it('should not show username error before field is touched', () => {
    renderOpen();
    expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument();
  });

  it('should show username error after blurring empty field', () => {
    renderOpen();
    const input = screen.getByPlaceholderText(/yourusername/i);
    fireEvent.blur(input);
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
  });

  it('should show username format error for invalid characters', async () => {
    const user = userEvent.setup();
    renderOpen();
    const input = screen.getByPlaceholderText(/yourusername/i);
    await user.type(input, 'bad user!');
    fireEvent.blur(input);
    expect(screen.getByText(/letters, numbers, and underscores/i)).toBeInTheDocument();
  });

  it('should show email error after blurring with invalid email', async () => {
    const user = userEvent.setup();
    renderOpen();
    const input = screen.getByPlaceholderText(/email/i);
    await user.type(input, 'notanemail');
    fireEvent.blur(input);
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  it('should show password error after blurring with short password', async () => {
    const user = userEvent.setup();
    renderOpen();
    const input = screen.getByPlaceholderText(/password/i);
    await user.type(input, 'short');
    fireEvent.blur(input);
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('should show password error for missing uppercase', async () => {
    const user = userEvent.setup();
    renderOpen();
    const input = screen.getByPlaceholderText(/password/i);
    await user.type(input, 'alllowercase1!');
    fireEvent.blur(input);
    expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
  });

  it('should clear username error once valid value is entered', async () => {
    const user = userEvent.setup();
    renderOpen();
    const input = screen.getByPlaceholderText(/yourusername/i);
    // Trigger error first
    fireEvent.blur(input);
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    // Now type a valid username
    await user.type(input, 'validuser');
    expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument();
  });
});

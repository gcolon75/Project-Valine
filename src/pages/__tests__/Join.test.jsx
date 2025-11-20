/**
 * Tests for Join page with allowlist enforcement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

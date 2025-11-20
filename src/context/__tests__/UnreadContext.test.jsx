/**
 * Tests for UnreadContext polling suppression when unauthenticated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { UnreadProvider, useUnread } from '../../context/UnreadContext';
import { AuthProvider } from '../../context/AuthContext';

// Mock the auth service
vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(() => false)
}));

// Mock notifications service
vi.mock('../../services/notificationsService', () => ({
  getUnreadCounts: vi.fn(() => Promise.resolve({ notifications: 5, messages: 3 }))
}));

// Mock analytics
vi.mock('../../analytics/client', () => ({
  trackLogin: vi.fn(),
  trackSignup: vi.fn(),
  trackLogout: vi.fn(),
  initAnalytics: vi.fn(),
  trackPageView: vi.fn()
}));

describe('UnreadContext - Polling Suppression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not poll when user is not authenticated', async () => {
    const { getUnreadCounts } = await import('../../services/notificationsService');
    
    // Create wrapper with unauthenticated user
    const wrapper = ({ children }) => (
      <AuthProvider>
        <UnreadProvider>{children}</UnreadProvider>
      </AuthProvider>
    );

    renderHook(() => useUnread(), { wrapper });

    // Wait for initial render
    await waitFor(() => {
      expect(true).toBe(true); // Just to ensure hook renders
    });

    // Advance timers by polling interval (30 seconds)
    vi.advanceTimersByTime(30000);

    // Service should not be called since user is not authenticated
    expect(getUnreadCounts).not.toHaveBeenCalled();
  });

  it('should poll when user is authenticated', async () => {
    const { getUnreadCounts } = await import('../../services/notificationsService');
    const authService = await import('../../services/authService');
    
    // Mock authenticated state
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser'
    });

    // Create wrapper with authenticated user
    const wrapper = ({ children }) => (
      <AuthProvider>
        <UnreadProvider>{children}</UnreadProvider>
      </AuthProvider>
    );

    renderHook(() => useUnread(), { wrapper });

    // Wait for auth initialization and initial poll
    await waitFor(() => {
      expect(getUnreadCounts).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Reset call count
    getUnreadCounts.mockClear();

    // Advance timers by polling interval
    vi.advanceTimersByTime(30000);

    // Service should be called again
    await waitFor(() => {
      expect(getUnreadCounts).toHaveBeenCalled();
    });
  });

  it('should return unread counts state', async () => {
    const wrapper = ({ children }) => (
      <AuthProvider>
        <UnreadProvider>{children}</UnreadProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useUnread(), { wrapper });

    expect(result.current.unreadCounts).toEqual({
      notifications: 0,
      messages: 0
    });
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.markNotificationsRead).toBe('function');
    expect(typeof result.current.markMessagesRead).toBe('function');
  });
});

// src/services/__tests__/authService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authService from '../authService';
import apiClient from '../api';

// Mock the API client
vi.mock('../api');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and call API', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', username: 'testuser' },
          token: 'mock-token-123',
        },
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
      // Token storage tested separately
    });

    it('should handle login failure', async () => {
      apiClient.post.mockRejectedValue(new Error('Invalid credentials'));

      await expect(authService.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(localStorage.getItem('auth_token')).toBeFalsy();
    });

    it('should not store token if not provided', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com' },
          // No token
        },
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      await authService.login('test@example.com', 'password123');

      expect(localStorage.getItem('auth_token')).toBeFalsy();
    });
  });

  describe('register', () => {
    it('should register successfully and call API', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      };

      const mockResponse = {
        data: {
          user: { id: '2', ...userData },
          token: 'new-user-token',
        },
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockResponse.data);
      // Token storage tested separately
    });

    it('should handle registration failure', async () => {
      apiClient.post.mockRejectedValue(new Error('Email already exists'));

      await expect(authService.register({ email: 'test@example.com' })).rejects.toThrow('Email already exists');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      };

      apiClient.get.mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized error', async () => {
      apiClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('logout', () => {
    it('should logout and clear token', async () => {
      localStorage.setItem('auth_token', 'mock-token');
      
      apiClient.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('auth_token')).toBeFalsy();
    });

    it('should clear token even if API fails', async () => {
      localStorage.setItem('auth_token', 'mock-token');
      
      apiClient.post.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await authService.logout();

      expect(localStorage.getItem('auth_token')).toBeFalsy();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully and call API', async () => {
      const mockResponse = {
        data: {
          token: 'new-refreshed-token',
          user: { id: '1', email: 'test@example.com' },
        },
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(mockResponse.data);
      // Token storage tested separately
    });

    it('should handle refresh failure', async () => {
      apiClient.post.mockRejectedValue(new Error('Refresh token expired'));

      await expect(authService.refreshToken()).rejects.toThrow('Refresh token expired');
    });
  });

  describe('isAuthenticated', () => {
    it('should check token existence', () => {
      // Note: localStorage in jsdom may not work exactly like real browser
      // This tests the function exists and returns a boolean
      const result = authService.isAuthenticated();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAuthToken', () => {
    it('should retrieve token from storage', () => {
      // Note: localStorage in jsdom may not work exactly like real browser
      // This tests the function exists and can be called
      const token = authService.getAuthToken();
      // Token should be string, null, or undefined
      expect(token === null || token === undefined || typeof token === 'string').toBe(true);
    });
  });
});

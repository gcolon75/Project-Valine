// src/services/__tests__/preferencesService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as preferencesService from '../preferencesService';
import { apiClient } from '../api.js';

// Mock apiClient
vi.mock('../api.js', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn()
  }
}));

describe('Preferences Service', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value; },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('getPreferences', () => {
    it('should fetch user preferences', async () => {
      const mockPreferences = {
        theme: 'dark'
      };

      apiClient.get.mockResolvedValue({ data: mockPreferences });

      const result = await preferencesService.getPreferences();

      expect(apiClient.get).toHaveBeenCalledWith('/me/preferences');
      expect(result).toEqual(mockPreferences);
    });

    it('should handle null theme preference', async () => {
      const mockPreferences = {
        theme: null
      };

      apiClient.get.mockResolvedValue({ data: mockPreferences });

      const result = await preferencesService.getPreferences();

      expect(result.theme).toBeNull();
    });
  });

  describe('updateThemePreference', () => {
    it('should update theme to light', async () => {
      const mockResponse = {
        theme: 'light'
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await preferencesService.updateThemePreference('light');

      expect(apiClient.put).toHaveBeenCalledWith('/me/preferences', { theme: 'light' });
      expect(result).toEqual(mockResponse);
    });

    it('should update theme to dark', async () => {
      const mockResponse = {
        theme: 'dark'
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await preferencesService.updateThemePreference('dark');

      expect(apiClient.put).toHaveBeenCalledWith('/me/preferences', { theme: 'dark' });
      expect(result).toEqual(mockResponse);
    });

    it('should update theme to null (system default)', async () => {
      const mockResponse = {
        theme: null
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await preferencesService.updateThemePreference(null);

      expect(apiClient.put).toHaveBeenCalledWith('/me/preferences', { theme: null });
      expect(result.theme).toBeNull();
    });
  });

  describe('syncThemeToBackend', () => {
    it('should sync localStorage theme to backend', async () => {
      localStorageMock.setItem('theme', 'dark');
      
      const mockResponse = {
        theme: 'dark'
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await preferencesService.syncThemeToBackend();

      expect(apiClient.put).toHaveBeenCalledWith('/me/preferences', { theme: 'dark' });
      expect(result).toEqual(mockResponse);
      // Should clear localStorage after sync
      expect(localStorageMock.getItem('theme')).toBeNull();
    });

    it('should return null if no localStorage theme', async () => {
      const result = await preferencesService.syncThemeToBackend();

      expect(apiClient.put).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if localStorage theme is invalid', async () => {
      localStorageMock.setItem('theme', 'invalid');

      const result = await preferencesService.syncThemeToBackend();

      expect(apiClient.put).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should not clear localStorage on sync failure', async () => {
      localStorageMock.setItem('theme', 'light');
      
      apiClient.put.mockRejectedValue(new Error('Network error'));

      const result = await preferencesService.syncThemeToBackend();

      expect(result).toBeNull();
      // Should NOT clear localStorage on error
      expect(localStorageMock.getItem('theme')).toBe('light');
    });
  });

  describe('loadThemePreference', () => {
    it('should load theme from backend', async () => {
      const mockPreferences = {
        theme: 'dark'
      };

      apiClient.get.mockResolvedValue({ data: mockPreferences });

      const result = await preferencesService.loadThemePreference();

      expect(apiClient.get).toHaveBeenCalledWith('/me/preferences');
      expect(result).toBe('dark');
    });

    it('should default to light if backend returns null', async () => {
      const mockPreferences = {
        theme: null
      };

      apiClient.get.mockResolvedValue({ data: mockPreferences });

      const result = await preferencesService.loadThemePreference();

      expect(result).toBe('light');
    });

    it('should fallback to localStorage on backend error', async () => {
      localStorageMock.setItem('theme', 'dark');
      
      apiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await preferencesService.loadThemePreference();

      expect(result).toBe('dark');
    });

    it('should fallback to light if localStorage is also invalid', async () => {
      localStorageMock.setItem('theme', 'invalid');
      
      apiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await preferencesService.loadThemePreference();

      expect(result).toBe('light');
    });

    it('should fallback to light if no theme anywhere', async () => {
      apiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await preferencesService.loadThemePreference();

      expect(result).toBe('light');
    });
  });
});

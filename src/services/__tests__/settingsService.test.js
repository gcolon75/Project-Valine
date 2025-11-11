// src/services/__tests__/settingsService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSettings, updateSettings, exportAccountData, deleteAccount } from '../settingsService';
import apiClient from '../api';

// Mock the API client
vi.mock('../api');

// Mock DOM methods for file download
const mockCreateElement = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

describe('settingsService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup DOM mocks
    global.document = {
      createElement: mockCreateElement.mockReturnValue({
        click: mockClick,
        href: '',
        download: ''
      }),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild
      }
    };
    
    global.window = {
      URL: {
        createObjectURL: mockCreateObjectURL.mockReturnValue('blob:mock-url'),
        revokeObjectURL: mockRevokeObjectURL
      }
    };
    
    global.Blob = class Blob {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
      }
    };
    
    // Setup localStorage mock
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch user settings successfully', async () => {
      const mockSettings = {
        notifications: { email: true, push: false },
        privacy: { showActivity: true }
      };
      
      apiClient.get.mockResolvedValue({ data: mockSettings });
      
      const result = await getSettings();
      
      expect(apiClient.get).toHaveBeenCalledWith('/settings');
      expect(result).toEqual(mockSettings);
    });

    it('should handle errors when fetching settings', async () => {
      const mockError = new Error('Network error');
      apiClient.get.mockRejectedValue(mockError);
      
      await expect(getSettings()).rejects.toThrow('Network error');
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const settingsUpdate = {
        notifications: { email: false, push: true }
      };
      const mockResponse = { ...settingsUpdate, id: '123' };
      
      apiClient.put.mockResolvedValue({ data: mockResponse });
      
      const result = await updateSettings(settingsUpdate);
      
      expect(apiClient.put).toHaveBeenCalledWith('/settings', settingsUpdate);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when updating settings', async () => {
      const mockError = new Error('Update failed');
      apiClient.put.mockRejectedValue(mockError);
      
      await expect(updateSettings({})).rejects.toThrow('Update failed');
    });
  });

  describe('exportAccountData', () => {
    it('should export account data and trigger download', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com' },
        posts: [],
        exportedAt: '2024-01-01T00:00:00.000Z'
      };
      
      apiClient.post.mockResolvedValue({ data: mockData });
      
      const result = await exportAccountData();
      
      expect(apiClient.post).toHaveBeenCalledWith('/account/export');
      expect(result).toEqual(mockData);
      
      // Verify download process
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle errors during export', async () => {
      const mockError = new Error('Export failed');
      apiClient.post.mockRejectedValue(mockError);
      
      await expect(exportAccountData()).rejects.toThrow('Export failed');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully with password', async () => {
      const password = 'testpassword123';
      const mockResponse = {
        message: 'Account deleted successfully',
        deletedAt: '2024-01-01T00:00:00.000Z'
      };
      
      apiClient.delete.mockResolvedValue({ data: mockResponse });
      
      const result = await deleteAccount(password);
      
      expect(apiClient.delete).toHaveBeenCalledWith('/account', {
        data: { confirmPassword: password }
      });
      expect(result).toEqual(mockResponse);
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should throw error if password is not provided', async () => {
      await expect(deleteAccount()).rejects.toThrow('Password is required to delete account');
      await expect(deleteAccount('')).rejects.toThrow('Password is required to delete account');
      
      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('should handle API errors during deletion', async () => {
      const mockError = new Error('Deletion failed');
      apiClient.delete.mockRejectedValue(mockError);
      
      await expect(deleteAccount('password123')).rejects.toThrow('Deletion failed');
    });

    it('should not clear auth token if deletion fails', async () => {
      const mockError = new Error('API error');
      apiClient.delete.mockRejectedValue(mockError);
      
      await expect(deleteAccount('password123')).rejects.toThrow('API error');
      
      // Token should NOT be removed on failure
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });
});

// src/services/__tests__/notificationsService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationsService from '../notificationsService';
import { apiClient } from '../api.js';

vi.mock('../api.js');

describe('notificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications with default parameters', async () => {
      const mockNotifications = [
        { id: '1', type: 'like', message: 'User liked your post', read: false },
        { id: '2', type: 'comment', message: 'User commented on your post', read: true }
      ];
      
      apiClient.get.mockResolvedValue({ data: mockNotifications });
      
      const result = await notificationsService.getNotifications();
      
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 50 }
      });
      expect(result).toEqual(mockNotifications);
    });

    it('should fetch notifications with custom limit', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await notificationsService.getNotifications({ limit: 20 });
      
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 20 }
      });
    });

    it('should include cursor parameter when provided', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await notificationsService.getNotifications({ cursor: 'abc123' });
      
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 50, cursor: 'abc123' }
      });
    });

    it('should filter by notification type', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await notificationsService.getNotifications({ type: 'like' });
      
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 50, type: 'like' }
      });
    });

    it('should filter for unread only', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await notificationsService.getNotifications({ unreadOnly: true });
      
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 50, unreadOnly: true }
      });
    });
  });

  describe('markNotificationRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = { id: 'notif-1', read: true };
      apiClient.patch.mockResolvedValue({ data: mockNotification });
      
      const result = await notificationsService.markNotificationRead('notif-1');
      
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(result).toEqual(mockNotification);
    });

    it('should handle mark as read failure', async () => {
      apiClient.patch.mockRejectedValue(new Error('API Error'));
      
      await expect(
        notificationsService.markNotificationRead('notif-1')
      ).rejects.toThrow('API Error');
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockResponse = { success: true, count: 5 };
      apiClient.patch.mockResolvedValue({ data: mockResponse });
      
      const result = await notificationsService.markAllNotificationsRead();
      
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all');
      expect(result).toEqual(mockResponse);
    });

    it('should handle bulk mark as read failure', async () => {
      apiClient.patch.mockRejectedValue(new Error('Network Error'));
      
      await expect(
        notificationsService.markAllNotificationsRead()
      ).rejects.toThrow('Network Error');
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const mockResponse = { success: true };
      apiClient.delete.mockResolvedValue({ data: mockResponse });
      
      const result = await notificationsService.deleteNotification('notif-1');
      
      expect(apiClient.delete).toHaveBeenCalledWith('/notifications/notif-1');
      expect(result).toEqual(mockResponse);
    });

    it('should handle delete failure', async () => {
      apiClient.delete.mockRejectedValue(new Error('Not found'));
      
      await expect(
        notificationsService.deleteNotification('notif-1')
      ).rejects.toThrow('Not found');
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread notification count', async () => {
      const mockCount = { count: 12 };
      apiClient.get.mockResolvedValue({ data: mockCount });
      
      const result = await notificationsService.getUnreadCount();
      
      expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual(mockCount);
    });
  });
});

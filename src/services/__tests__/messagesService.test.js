// src/services/__tests__/messagesService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as messagesService from '../messagesService';
import apiClient from '../api';

vi.mock('../api');

describe('messagesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should fetch conversations with default parameters', async () => {
      const mockConversations = [
        { id: 'conv-1', lastMessage: 'Hello', unreadCount: 2 },
        { id: 'conv-2', lastMessage: 'How are you?', unreadCount: 0 }
      ];
      
      apiClient.get.mockResolvedValue({ data: mockConversations });
      
      const result = await messagesService.getConversations();
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations', {
        params: { limit: 50 }
      });
      expect(result).toEqual(mockConversations);
    });

    it('should fetch conversations with custom limit', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await messagesService.getConversations(20);
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations', {
        params: { limit: 20 }
      });
    });

    it('should include cursor for pagination', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await messagesService.getConversations(50, 'page2');
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations', {
        params: { limit: 50, cursor: 'page2' }
      });
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a conversation', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', senderId: 'user-1' },
        { id: 'msg-2', content: 'Hi there', senderId: 'user-2' }
      ];
      
      apiClient.get.mockResolvedValue({ data: mockMessages });
      
      const result = await messagesService.getMessages('conv-1');
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations/conv-1/messages', {
        params: { limit: 50 }
      });
      expect(result).toEqual(mockMessages);
    });

    it('should fetch messages with custom limit', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await messagesService.getMessages('conv-1', 25);
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations/conv-1/messages', {
        params: { limit: 25 }
      });
    });

    it('should fetch messages with pagination', async () => {
      apiClient.get.mockResolvedValue({ data: [] });
      
      await messagesService.getMessages('conv-1', 50, 'older');
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations/conv-1/messages', {
        params: { limit: 50, cursor: 'older' }
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a message to a conversation', async () => {
      const mockMessage = { id: 'msg-new', content: 'Test message', senderId: 'me' };
      apiClient.post.mockResolvedValue({ data: mockMessage });
      
      const result = await messagesService.sendMessage('conv-1', 'Test message');
      
      expect(apiClient.post).toHaveBeenCalledWith('/conversations/conv-1/messages', {
        content: 'Test message',
        attachments: []
      });
      expect(result).toEqual(mockMessage);
    });

    it('should send a message with attachments', async () => {
      const mockMessage = { id: 'msg-new', content: 'Test', attachments: ['file1'] };
      apiClient.post.mockResolvedValue({ data: mockMessage });
      
      await messagesService.sendMessage('conv-1', 'Test', ['file1']);
      
      expect(apiClient.post).toHaveBeenCalledWith('/conversations/conv-1/messages', {
        content: 'Test',
        attachments: ['file1']
      });
    });

    it('should handle send failure', async () => {
      apiClient.post.mockRejectedValue(new Error('Network Error'));
      
      await expect(
        messagesService.sendMessage('conv-1', 'Test')
      ).rejects.toThrow('Network Error');
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockConversation = { id: 'conv-new', userId: 'user-2' };
      apiClient.post.mockResolvedValue({ data: mockConversation });
      
      const result = await messagesService.createConversation('user-2');
      
      expect(apiClient.post).toHaveBeenCalledWith('/conversations', {
        userId: 'user-2',
        initialMessage: null
      });
      expect(result).toEqual(mockConversation);
    });

    it('should create conversation with initial message', async () => {
      const mockConversation = { id: 'conv-new', userId: 'user-2' };
      apiClient.post.mockResolvedValue({ data: mockConversation });
      
      await messagesService.createConversation('user-2', 'Hello!');
      
      expect(apiClient.post).toHaveBeenCalledWith('/conversations', {
        userId: 'user-2',
        initialMessage: 'Hello!'
      });
    });
  });

  describe('markConversationRead', () => {
    it('should mark a conversation as read', async () => {
      const mockResponse = { success: true };
      apiClient.patch.mockResolvedValue({ data: mockResponse });
      
      const result = await messagesService.markConversationRead('conv-1');
      
      expect(apiClient.patch).toHaveBeenCalledWith('/conversations/conv-1/read');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchConversations', () => {
    it('should search conversations by query', async () => {
      const mockResults = [{ id: 'conv-1', name: 'John Doe' }];
      apiClient.get.mockResolvedValue({ data: mockResults });
      
      const result = await messagesService.searchConversations('John');
      
      expect(apiClient.get).toHaveBeenCalledWith('/conversations/search', {
        params: { q: 'John' }
      });
      expect(result).toEqual(mockResults);
    });

    it('should handle search with results', async () => {
      const mockResults = [{ id: 'conv-2', name: 'Jane Smith' }];
      apiClient.get.mockResolvedValue({ data: mockResults });
      
      const result = await messagesService.searchConversations('Jane');
      
      expect(result).toEqual(mockResults);
    });
  });
});

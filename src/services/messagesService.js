// src/services/messagesService.js
import { apiClient } from './api.js';

/**
 * Get user's conversations/chats
 * @param {number} limit - Number of conversations
 * @param {string} cursor - Pagination cursor
 * @returns {Promise} Conversations data
 */
export const getConversations = async (limit = 50, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  
  const { data } = await apiClient.get('/conversations', { params });
  return data;
};

/**
 * Get messages in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Number of messages
 * @param {string} cursor - Pagination cursor
 * @returns {Promise} Messages data
 */
export const getMessages = async (conversationId, limit = 50, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  
  const { data } = await apiClient.get(`/conversations/${conversationId}/messages`, { params });
  return data;
};

/**
 * Send a message in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} content - Message content
 * @param {Array} attachments - Optional attachments
 * @returns {Promise} New message data
 */
export const sendMessage = async (conversationId, content, attachments = []) => {
  const { data } = await apiClient.post(`/conversations/${conversationId}/messages`, {
    content,
    attachments
  });
  return data;
};

/**
 * Create a new conversation
 * @param {string} userId - User ID to start conversation with
 * @param {string} initialMessage - Optional initial message
 * @returns {Promise} New conversation data
 */
export const createConversation = async (userId, initialMessage = null) => {
  const { data } = await apiClient.post('/conversations', {
    userId,
    initialMessage
  });
  return data;
};

/**
 * Mark conversation as read
 * @param {string} conversationId - Conversation ID
 * @returns {Promise} Success response
 */
export const markConversationRead = async (conversationId) => {
  const { data } = await apiClient.patch(`/conversations/${conversationId}/read`);
  return data;
};

/**
 * Get unread message count
 * @returns {Promise} Count object
 */
export const getUnreadMessageCount = async () => {
  const { data } = await apiClient.get('/conversations/unread-count');
  return data;
};

/**
 * Search conversations
 * @param {string} query - Search query
 * @returns {Promise} Search results
 */
export const searchConversations = async (query) => {
  const { data } = await apiClient.get('/conversations/search', {
    params: { q: query }
  });
  return data;
};

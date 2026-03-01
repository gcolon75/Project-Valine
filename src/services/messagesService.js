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

// ========== NEW DM THREAD FUNCTIONS ==========

/**
 * Get all DM threads for the current user
 * @param {number} limit - Number of threads
 * @param {string} cursor - Pagination cursor
 * @returns {Promise<Object>} { items, nextCursor, hasMore }
 */
export const getThreads = async (limit = 50, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  
  const { data } = await apiClient.get('/me/messages/threads', { params });
  return data;
};

/**
 * Create or get existing DM thread with another user
 * @param {string} recipientUserId - User ID to message
 * @returns {Promise<Object>} Thread data
 */
export const createThread = async (recipientUserId) => {
  const { data } = await apiClient.post('/me/messages/threads', { recipientUserId });
  return data;
};

/**
 * Create a new group chat
 * @param {string} name - Group name
 * @param {string[]} participantIds - Array of user IDs to add
 * @returns {Promise<Object>} Thread data
 */
export const createGroupThread = async (name, participantIds) => {
  const { data } = await apiClient.post('/me/messages/threads/group', { name, participantIds });
  return data;
};

/**
 * Get messages in a DM thread
 * @param {string} threadId - Thread ID
 * @param {number} limit - Number of messages
 * @param {string} cursor - Pagination cursor
 * @returns {Promise<Object>} { thread, messages, nextCursor, hasMore }
 */
export const getThread = async (threadId, limit = 50, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  
  const { data } = await apiClient.get(`/me/messages/threads/${threadId}`, { params });
  return data;
};

/**
 * Send a message in a DM thread
 * @param {string} threadId - Thread ID
 * @param {string} body - Message body
 * @param {string} forwardedPostId - Optional post ID to forward
 * @returns {Promise<Object>} { message }
 */
export const sendThreadMessage = async (threadId, body, forwardedPostId = null) => {
  const { data } = await apiClient.post(`/me/messages/threads/${threadId}/messages`, {
    body,
    ...(forwardedPostId && { forwardedPostId })
  });
  return data;
};

/**
 * Leave or delete a thread
 * - For 1:1 chats: deletes the conversation
 * - For group chats: leaves the group
 * @param {string} threadId - Thread ID
 * @returns {Promise<Object>} { deleted, message }
 */
export const leaveThread = async (threadId) => {
  const { data } = await apiClient.delete(`/me/messages/threads/${threadId}`);
  return data;
};

import { json } from '../utils/headers.js';

export const handler = async () => {
  const endpoints = [
    // Health & Meta
    { method: 'GET', path: '/health', description: 'Health check endpoint' },
    { method: 'GET', path: '/meta', description: 'API metadata and available endpoints' },
    
    // Authentication
    { method: 'POST', path: '/auth/register', description: 'Register a new user', auth: false },
    { method: 'POST', path: '/auth/login', description: 'Login and get JWT token', auth: false },
    { method: 'GET', path: '/auth/me', description: 'Get current user profile', auth: true },
    
    // Users
    { method: 'POST', path: '/users', description: 'Create a new user (legacy)', auth: false },
    { method: 'GET', path: '/users/{username}', description: 'Get user by username', auth: false },
    { method: 'PUT', path: '/users/{id}', description: 'Update user profile', auth: true },
    
    // Reels
    { method: 'GET', path: '/reels', description: 'List reels with pagination', auth: false },
    { method: 'POST', path: '/reels', description: 'Create a new reel', auth: true },
    { method: 'POST', path: '/reels/{id}/like', description: 'Toggle like on a reel', auth: true },
    { method: 'POST', path: '/reels/{id}/bookmark', description: 'Toggle bookmark on a reel', auth: true },
    { method: 'GET', path: '/reels/{id}/comments', description: 'Get comments for a reel', auth: false },
    { method: 'POST', path: '/reels/{id}/comments', description: 'Add comment to a reel', auth: true },
    
    // Posts (legacy)
    { method: 'GET', path: '/posts', description: 'List posts with pagination', auth: false },
    { method: 'POST', path: '/posts', description: 'Create a new post', auth: true },
    { method: 'GET', path: '/posts/{id}', description: 'Get single post', auth: false },
    
    // Conversations & Messages
    { method: 'GET', path: '/conversations', description: 'List user conversations', auth: true },
    { method: 'POST', path: '/conversations', description: 'Create a new conversation', auth: true },
    { method: 'GET', path: '/conversations/{id}/messages', description: 'Get messages in a conversation', auth: true },
    { method: 'POST', path: '/conversations/{id}/messages', description: 'Send a message', auth: true },
    
    // Notifications
    { method: 'GET', path: '/notifications', description: 'List user notifications', auth: true },
    { method: 'PATCH', path: '/notifications/{id}/read', description: 'Mark notification as read', auth: true },
    { method: 'PATCH', path: '/notifications/mark-all', description: 'Mark all notifications as read', auth: true },
    
    // Connection Requests
    { method: 'POST', path: '/connections/request', description: 'Send connection request', auth: true },
    { method: 'GET', path: '/connections/requests', description: 'List connection requests', auth: true },
    { method: 'POST', path: '/connections/requests/{id}/approve', description: 'Approve connection request', auth: true },
    { method: 'POST', path: '/connections/requests/{id}/reject', description: 'Reject connection request', auth: true }
  ];

  return json({
    service: 'Project Valine API',
    version: '1.0.0',
    stage: process.env.STAGE || 'dev',
    timestamp: Date.now(),
    endpoints,
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      notes: 'Obtain token via POST /auth/login or /auth/register'
    },
    pagination: {
      queryParams: {
        limit: 'Number of items to return (default: 20, max: 100)',
        cursor: 'Cursor for next page (use nextCursor from previous response)'
      },
      response: {
        items: 'Array of items',
        nextCursor: 'Cursor for next page (null if no more items)',
        hasMore: 'Boolean indicating if more items exist'
      }
    }
  });
};

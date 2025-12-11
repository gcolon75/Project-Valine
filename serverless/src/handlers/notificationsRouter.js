// serverless/src/handlers/notificationsRouter.js
// Central router for notification HTTP endpoints

import * as notifications from './notifications.js';

/**
 * Normalize path to remove stage prefix if present (e.g. "/prod/notifications/..." -> "/notifications/...")
 */
function normalizePath(rawPath) {
  let path = rawPath || '';
  const stage = process.env.STAGE;
  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1); // remove "/{stage}"
  }
  return path;
}

/**
 * Main router handler for notification endpoints
 */
export const handler = async (event, context) => {
  const httpMethod =
    event.requestContext?.http?.method ||
    event.httpMethod ||
    'GET';

  const rawPath =
    event.requestContext?.http?.path ||
    event.rawPath ||
    event.path ||
    '';

  const method = httpMethod.toUpperCase();
  const path = normalizePath(rawPath);

  try {
    // ===== NOTIFICATION ENDPOINTS =====

    // GET /notifications
    if (method === 'GET' && path === '/notifications') {
      return notifications.listNotifications(event, context);
    }

    // PATCH /notifications/{id}/read
    if (method === 'PATCH' && /^\/notifications\/[^/]+\/read$/.test(path)) {
      return notifications.markAsRead(event, context);
    }

    // PATCH /notifications/mark-all
    if (method === 'PATCH' && path === '/notifications/mark-all') {
      return notifications.markAllAsRead(event, context);
    }

    // GET /unread-counts
    if (method === 'GET' && path === '/unread-counts') {
      return notifications.getUnreadCounts(event, context);
    }

    // Fallback
    console.warn('notificationsRouter: no route match', { method, path });
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (err) {
    console.error('notificationsRouter error', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// serverless/src/handlers/socialMessaging.js
// Central router for social graph + messaging HTTP endpoints

import * as social from './social.js';
import * as messages from './messages.js';

/**
 * Normalize path to remove stage prefix if present (e.g. "/prod/me/..." -> "/me/...")
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
 * Main router handler for social graph and messaging endpoints
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
    // ===== SOCIAL =====

    // /profiles/{profileId}/follow
    if (/^\/profiles\/[^/]+\/follow$/.test(path)) {
      if (method === 'POST') {
        return social.followProfile(event, context);
      }
      if (method === 'DELETE') {
        return social.unfollowProfile(event, context);
      }
    }

    // /profiles/{profileId}/block
    if (/^\/profiles\/[^/]+\/block$/.test(path)) {
      if (method === 'POST') {
        return social.blockProfile(event, context);
      }
      if (method === 'DELETE') {
        return social.unblockProfile(event, context);
      }
    }

    // /profiles/{profileId}/followers
    if (method === 'GET' && /^\/profiles\/[^/]+\/followers$/.test(path)) {
      return social.getProfileFollowers(event, context);
    }

    // /profiles/{profileId}/following
    if (method === 'GET' && /^\/profiles\/[^/]+\/following$/.test(path)) {
      return social.getProfileFollowing(event, context);
    }

    // /profiles/{profileId}/status
    if (method === 'GET' && /^\/profiles\/[^/]+\/status$/.test(path)) {
      return social.getProfileStatus(event, context);
    }

    // /me/followers
    if (method === 'GET' && path === '/me/followers') {
      return social.getMyFollowers(event, context);
    }

    // /me/following
    if (method === 'GET' && path === '/me/following') {
      return social.getMyFollowing(event, context);
    }

    // /me/blocks
    if (method === 'GET' && path === '/me/blocks') {
      return social.getMyBlocks(event, context);
    }

    // ===== MESSAGING (DM Threads) =====

    // /me/messages/threads (list/create)
    if (path === '/me/messages/threads') {
      if (method === 'GET') {
        return messages.getThreads(event, context);
      }
      if (method === 'POST') {
        return messages.createThread(event, context);
      }
    }

    // /me/messages/threads/{threadId}
    if (method === 'GET' && /^\/me\/messages\/threads\/[^/]+$/.test(path)) {
      return messages.getThread(event, context);
    }

    // /me/messages/threads/{threadId}/messages
    if (method === 'POST' && /^\/me\/messages\/threads\/[^/]+\/messages$/.test(path)) {
      return messages.sendMessage(event, context);
    }

    // Fallback
    console.warn('socialMessaging: no route match', { method, path });
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (err) {
    console.error('socialMessaging router error', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

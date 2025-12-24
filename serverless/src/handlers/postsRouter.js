// serverless/src/handlers/postsRouter.js
// Central router for post HTTP endpoints

import * as posts from './posts.js';

/**
 * Normalize path to remove stage prefix if present (e.g. "/prod/posts/..." -> "/posts/...")
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
 * Main router handler for post endpoints
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
    // ===== POST ENDPOINTS =====

    // POST /posts/audio-upload-url (check specific path before generic patterns)
    if (method === 'POST' && path === '/posts/audio-upload-url') {
      return posts.getAudioUploadUrl(event, context);
    }

    // GET /users/{id}/requests
    if (method === 'GET' && /^\/users\/[^/]+\/requests$/.test(path)) {
      return posts.getUserRequests(event, context);
    }

    // GET /posts
    if (method === 'GET' && path === '/posts') {
      return posts.listPosts(event, context);
    }

    // POST /posts
    if (method === 'POST' && path === '/posts') {
      return posts.createPost(event, context);
    }

    // POST /posts/{id}/request
    if (method === 'POST' && /^\/posts\/[^/]+\/request$/.test(path)) {
      return posts.requestPostAccess(event, context);
    }

    // POST /posts/{id}/grant
    if (method === 'POST' && /^\/posts\/[^/]+\/grant$/.test(path)) {
      return posts.grantAccess(event, context);
    }

    // POST /posts/{id}/pay
    if (method === 'POST' && /^\/posts\/[^/]+\/pay$/.test(path)) {
      return posts.payForAccess(event, context);
    }

    // GET /posts/{id}
    if (method === 'GET' && /^\/posts\/[^/]+$/.test(path)) {
      return posts.getPost(event, context);
    }

    // DELETE /posts/{id}
    if (method === 'DELETE' && /^\/posts\/[^/]+$/.test(path)) {
      return posts.deletePost(event, context);
    }

    // Fallback
    console.warn('postsRouter: no route match', { method, path });
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (err) {
    console.error('postsRouter error', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

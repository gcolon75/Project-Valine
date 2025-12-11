// serverless/src/handlers/authRouter.js
// Central router for authentication HTTP endpoints

import * as auth from './auth.js';

/**
 * Normalize path to remove stage prefix if present (e.g. "/prod/auth/..." -> "/auth/...")
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
 * Main router handler for authentication endpoints
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
    // ===== AUTH ENDPOINTS =====

    // POST /auth/register
    if (method === 'POST' && path === '/auth/register') {
      return auth.register(event, context);
    }

    // POST /auth/login
    if (method === 'POST' && path === '/auth/login') {
      return auth.login(event, context);
    }

    // GET /auth/me
    if (method === 'GET' && path === '/auth/me') {
      return auth.me(event, context);
    }

    // POST /auth/verify-email
    if (method === 'POST' && path === '/auth/verify-email') {
      return auth.verifyEmail(event, context);
    }

    // POST /auth/resend-verification
    if (method === 'POST' && path === '/auth/resend-verification') {
      return auth.resendVerification(event, context);
    }

    // POST /auth/refresh
    if (method === 'POST' && path === '/auth/refresh') {
      return auth.refresh(event, context);
    }

    // POST /auth/logout
    if (method === 'POST' && path === '/auth/logout') {
      return auth.logout(event, context);
    }

    // POST /auth/2fa/setup
    if (method === 'POST' && path === '/auth/2fa/setup') {
      return auth.setup2FA(event, context);
    }

    // POST /auth/2fa/enable
    if (method === 'POST' && path === '/auth/2fa/enable') {
      return auth.enable2FA(event, context);
    }

    // POST /auth/2fa/verify
    if (method === 'POST' && path === '/auth/2fa/verify') {
      return auth.verify2FA(event, context);
    }

    // POST /auth/2fa/disable
    if (method === 'POST' && path === '/auth/2fa/disable') {
      return auth.disable2FA(event, context);
    }

    // POST /auth/seed-restricted
    if (method === 'POST' && path === '/auth/seed-restricted') {
      return auth.seedRestricted(event, context);
    }

    // GET /auth/status
    if (method === 'GET' && path === '/auth/status') {
      return auth.authStatus(event, context);
    }

    // GET /auth/diag
    if (method === 'GET' && path === '/auth/diag') {
      return auth.authDiag(event, context);
    }

    // Fallback
    console.warn('authRouter: no route match', { method, path });
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (err) {
    console.error('authRouter error', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

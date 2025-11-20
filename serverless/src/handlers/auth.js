/**
 * Authentication & session handlers for Project Valine (Lambda HTTP API v2).
 * Single final export block (no per-function export keywords) to avoid duplicate export errors.
 *
 * Packaging Notes:
 *  - Use `npm ci --omit=dev` before deploying to keep node_modules small.
 *  - With serverless-esbuild bundling, only external deps (e.g. @prisma/client) remain in node_modules.
 */

import { getPrisma } from '../db/client.js';
import { json, error, getCorsHeaders } from '../utils/headers.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import {
  generateCsrfToken,
  generateCsrfCookie,
  clearCsrfCookie
} from '../middleware/csrfMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateAccessTokenCookie,
  generateRefreshTokenCookie,
  generateClearCookieHeaders,
  extractToken,
  verifyToken,
  getUserIdFromEvent,
  getUserIdFromDecoded
} from '../utils/tokenManager.js';
import { generateCorrelationId, logStructured } from '../utils/correlationId.js';

/* ---------------------- Allowlist Cache (cold-start optimization) ---------------------- */

let cachedAllowlist = null;

function getActiveAllowlist() {
  if (cachedAllowlist !== null) {
    return cachedAllowlist;
  }
  const allowListRaw = process.env.ALLOWED_USER_EMAILS || '';
  cachedAllowlist = allowListRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return cachedAllowlist;
}

/* ---------------------- Helpers ---------------------- */

function buildHeaders(extra = {}) {
  return {
    ...getCorsHeaders(),
    ...extra
  };
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function redactEmail(e) {
  if (!e || typeof e !== 'string') return '';
  const [user, domain] = e.split('@');
  if (!domain) return e;
  return `${user.slice(0, 2)}***@${domain}`;
}

/**
 * Unified JSON response with optional cookies array (HTTP API v2).
 */
function response(statusCode, bodyObj, cookieHeaders = []) {
  return {
    statusCode,
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    cookies: cookieHeaders,
    body: JSON.stringify(bodyObj)
  };
}

/* ---------------------- LOGIN ---------------------- */

async function login(event) {
  const start = nowSeconds();
  const correlationId = generateCorrelationId();
  
  try {
    const rlResult = await rateLimit(event, 'login', 10, 60);
    if (!rlResult.allowed) {
      logStructured(correlationId, 'rate_limit_exceeded', {
        endpoint: 'login',
        limit: 10,
        window: 60
      }, 'warn');
      return error(429, 'Too many login attempts', { correlationId });
    }

    const rawBody = event?.body || '';
    logStructured(correlationId, 'login_attempt', {
      bodyLength: rawBody.length
    }, 'info');

    let creds = {};
    if (rawBody) {
      try {
        creds = JSON.parse(rawBody);
      } catch (e) {
        logStructured(correlationId, 'login_json_parse_error', {
          error: e.message
        }, 'error');
        return error(400, 'Invalid JSON body', { correlationId });
      }
    }

    const { email, password, twoFactorCode } = creds || {};
    if (!email || !password) {
      logStructured(correlationId, 'login_missing_credentials', {
        hasEmail: !!email,
        hasPassword: !!password
      }, 'warn');
      return error(400, 'email and password are required', { correlationId });
    }

    logStructured(correlationId, 'login_credentials_received', {
      email: redactEmail(email)
    }, 'info');

    // Defense-in-depth: Check allowlist before DB lookup
    const allowlist = getActiveAllowlist();
    if (allowlist.length > 0 && !allowlist.includes(email.toLowerCase())) {
      logStructured(correlationId, 'login_denied', {
        email: redactEmail(email),
        reason: 'email_not_in_allowlist',
        allowlistCount: allowlist.length
      }, 'warn');
      return error(403, 'Access denied: email not in allowlist', { correlationId });
    }

    logStructured(correlationId, 'login_allowlist_passed', {
      email: redactEmail(email)
    }, 'info');

    const prisma = getPrisma();
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
    } catch (dbError) {
      logStructured(correlationId, 'login_db_error', {
        email: redactEmail(email),
        error: dbError.message
      }, 'error');
      return error(500, 'Server error', { correlationId });
    }

    if (!user) {
      logStructured(correlationId, 'login_user_not_found', {
        email: redactEmail(email)
      }, 'warn');
      return error(401, 'Invalid credentials', { correlationId });
    }
    
    logStructured(correlationId, 'login_user_found', {
      userId: user.id,
      email: redactEmail(user.email),
      hasPasswordHash: !!user.passwordHash,
      hasLegacyPassword: !!user.password
    }, 'info');
    
    /**
     * Transitional legacy password support:
     * Handles users created before passwordHash column was standardized.
     * TODO: Remove after patch-legacy-passwords.mjs migration is executed.
     */
    if (!user.passwordHash && user.password) {
      logStructured(correlationId, 'login_using_legacy_password', {
        userId: user.id,
        email: redactEmail(user.email)
      }, 'warn');
      user.passwordHash = user.password; // assume bcrypt hash
    }
    
    if (!user.passwordHash) {
      logStructured(correlationId, 'login_no_password_hash', {
        userId: user.id,
        email: redactEmail(user.email)
      }, 'error');
      return error(500, 'Server error', { correlationId });
    }

    let valid;
    try {
      valid = await bcrypt.compare(password, user.passwordHash);
    } catch (bcryptError) {
      logStructured(correlationId, 'login_bcrypt_error', {
        userId: user.id,
        email: redactEmail(user.email),
        error: bcryptError.message
      }, 'error');
      return error(500, 'Server error', { correlationId });
    }
    
    if (!valid) {
      logStructured(correlationId, 'login_invalid_password', {
        userId: user.id,
        email: redactEmail(user.email)
      }, 'warn');
      return error(401, 'Invalid credentials', { correlationId });
    }

    logStructured(correlationId, 'login_password_verified', {
      userId: user.id,
      email: redactEmail(user.email)
    }, 'info');

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        logStructured(correlationId, '2fa_code_missing', {
          userId: user.id,
          email: redactEmail(user.email)
        }, 'warn');
        return error(401, 'Two-factor code required', { correlationId });
      }
      const ok = authenticator.verify({
        token: twoFactorCode,
        secret: user.twoFactorSecret
      });
      if (!ok) {
        logStructured(correlationId, '2fa_code_invalid', {
          userId: user.id,
          email: redactEmail(user.email)
        }, 'warn');
        return error(401, 'Invalid two-factor code', { correlationId });
      }
      logStructured(correlationId, '2fa_verified', {
        userId: user.id
      }, 'info');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const csrfToken = generateCsrfToken();

    const cookies = [
      generateAccessTokenCookie(accessToken),
      generateRefreshTokenCookie(refreshToken),
      generateCsrfCookie(csrfToken)
    ];

    logStructured(correlationId, 'login_success', {
      userId: user.id,
      email: redactEmail(user.email),
      latencySeconds: nowSeconds() - start
    }, 'info');

    return response(
      200,
      {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          twoFactorEnabled: user.twoFactorEnabled || false
        },
        csrfToken
      },
      cookies
    );
  } catch (e) {
    logStructured(correlationId, 'login_unhandled_error', {
      error: e.message,
      stack: e.stack
    }, 'error');
    return error(500, 'Server error', { correlationId });
  }
}

/* ---------------------- REGISTER ---------------------- */

async function register(event) {
  const correlationId = generateCorrelationId();
  
  try {
    const rawBody = event?.body || '';
    console.log(`[REGISTER] Raw body length: ${rawBody.length}`);
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch (e) {
        console.error('[REGISTER] JSON parse error:', e);
        return error(400, 'Invalid JSON body');
      }
    }
    const { email, password, username, displayName } = data;
    if (!email || !password) {
      return error(400, 'email and password are required');
    }

    // Generate username from email if not provided
    const finalUsername = username || email.split('@')[0];
    // Generate displayName from email if not provided
    const finalDisplayName = displayName || email.split('@')[0];

    // Enforce allowlist early (before database operations)
    const allowlist = getActiveAllowlist();
    const enableRegistration = (process.env.ENABLE_REGISTRATION || 'false') === 'true';
    const strictAllowlist = (process.env.STRICT_ALLOWLIST || '0') === '1';

    // Check if allowlist is misconfigured when strict mode is enabled
    if (strictAllowlist && allowlist.length < 2) {
      logStructured(correlationId, 'allowlist_misconfigured', {
        allowlistCount: allowlist.length,
        requiredCount: 2
      }, 'error');
      return error(503, 'Service temporarily unavailable: configuration error', { correlationId });
    }

    if (!enableRegistration) {
      // Registration closed to public — require email in allowlist
      if (allowlist.length === 0) {
        console.warn('[REGISTER] Registration closed and no allowlist configured');
        return error(403, 'Registration not permitted');
      }
      if (!allowlist.includes(email.toLowerCase())) {
        logStructured(correlationId, 'registration_denied', {
          email: redactEmail(email),
          reason: 'email_not_in_allowlist',
          allowlistCount: allowlist.length
        }, 'warn');
        return error(403, 'Access denied: email not in allowlist', { correlationId });
      }
    }

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (existing) {
      return error(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: finalUsername,
        passwordHash: passwordHash,
        displayName: finalDisplayName,
      }
    });

    console.log(`[REGISTER] Created userId=${user.id}`);
    return response(201, {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (e) {
    console.error('[REGISTER] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- ME ---------------------- */

async function me(event) {
  const correlationId = generateCorrelationId();
  
  try {
    logStructured(correlationId, 'me_request_received', {}, 'info');
    
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      logStructured(correlationId, 'me_no_token', {
        hasAuthHeader: !!(event.headers?.authorization || event.headers?.Authorization),
        hasCookie: !!(event.headers?.cookie || event.headers?.Cookie)
      }, 'warn');
      return error(401, 'Unauthorized', { correlationId });
    }
    
    logStructured(correlationId, 'me_token_decoded', {
      userId
    }, 'info');
    
    const prisma = getPrisma();
    let user;
    try {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } catch (dbError) {
      logStructured(correlationId, 'me_db_error', {
        userId,
        error: dbError.message
      }, 'error');
      return error(500, 'Server error', { correlationId });
    }
    
    if (!user) {
      logStructured(correlationId, 'me_user_not_found', {
        userId
      }, 'warn');
      return error(404, 'User not found', { correlationId });
    }
    
    logStructured(correlationId, 'me_success', {
      userId: user.id,
      email: redactEmail(user.email)
    }, 'info');
    
    return response(200, {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (e) {
    logStructured(correlationId, 'me_unhandled_error', {
      error: e.message,
      stack: e.stack
    }, 'error');
    return error(500, 'Server error', { correlationId });
  }
}

/* ---------------------- REFRESH ---------------------- */

async function refresh(event) {
  try {
    const refreshTok = extractToken(event, 'refresh');
    if (!refreshTok) {
      return error(401, 'Missing refresh token');
    }
    const payload = verifyToken(refreshTok, 'refresh');
    if (!payload) {
      return error(401, 'Invalid refresh token');
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return error(401, 'Invalid user');
    }

    const newAccess = generateAccessToken(user.id);
    const accessCookie = generateAccessTokenCookie(newAccess);

    return response(200, { ok: true }, [accessCookie]);
  } catch (e) {
    console.error('[REFRESH] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- LOGOUT ---------------------- */

async function logout(_event) {
  try {
    const cookies = [
      ...generateClearCookieHeaders(),
      clearCsrfCookie()
    ];
    return response(200, { ok: true }, cookies);
  } catch (e) {
    console.error('[LOGOUT] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- EMAIL VERIFICATION (stubs) ---------------------- */

async function verifyEmail(event) {
  try {
    const rawBody = event?.body || '';
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return error(400, 'Invalid JSON body');
      }
    }
    const { token } = data;
    if (!token) return error(400, 'token is required');

    console.log('[VERIFY_EMAIL] Not yet implemented');
    return response(200, { verified: true });
  } catch (e) {
    console.error('[VERIFY_EMAIL] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

async function resendVerification(event) {
  try {
    const rawBody = event?.body || '';
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return error(400, 'Invalid JSON body');
      }
    }
    const { email } = data;
    if (!email) return error(400, 'email is required');

    console.log('[RESEND_VERIFICATION] Not yet implemented');
    return response(200, { sent: true });
  } catch (e) {
    console.error('[RESEND_VERIFICATION] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- 2FA HANDLERS ---------------------- */

async function setup2FA(event) {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return error(404, 'Not found');

    if (user.twoFactorEnabled) {
      return error(400, 'Already enabled');
    }

    const secret = authenticator.generateSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret }
    });

    const otpauth = authenticator.keyuri(user.email, 'ProjectValine', secret);
    return response(200, { secret, otpauth });
  } catch (e) {
    console.error('[SETUP2FA] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

async function enable2FA(event) {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const rawBody = event?.body || '';
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return error(400, 'Invalid JSON body');
      }
    }
    const { code } = data;
    if (!code) return error(400, 'code is required');

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return error(400, '2FA not initialized');
    }

    const ok = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret
    });
    if (!ok) return error(401, 'Invalid code');

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });

    return response(200, { twoFactorEnabled: true });
  } catch (e) {
    console.error('[ENABLE2FA] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

async function verify2FA(event) {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const rawBody = event?.body || '';
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return error(400, 'Invalid JSON body');
      }
    }
    const { code } = data;
    if (!code) return error(400, 'code is required');

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return error(400, '2FA not initialized');
    }

    const ok = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret
    });
    if (!ok) return error(401, 'Invalid code');

    return response(200, { verified: true });
  } catch (e) {
    console.error('[VERIFY2FA] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

async function disable2FA(event) {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return error(404, 'Not found');

    if (!user.twoFactorEnabled) {
      return error(400, '2FA not enabled');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    return response(200, { twoFactorEnabled: false });
  } catch (e) {
    console.error('[DISABLE2FA] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- USER EXTRACTION (compat wrapper) ---------------------- */
function getUserFromEvent(event) {
  try {
    return getUserIdFromEvent(event) || null;
  } catch {
    return null;
  }
}

/* ---------------------- EXPORT ALL ---------------------- */

export {
  login,
  register,
  me,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  setup2FA,
  enable2FA,
  verify2FA,
  disable2FA,
  getUserFromEvent
};
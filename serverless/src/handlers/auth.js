/**
 * Authentication & session handlers for Project Valine (Lambda HTTP API v2).
 * Ensure this file is the one packaged into the Lambda zip.
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
  getUserIdFromEvent
} from '../utils/tokenManager.js';

/* ---------------------- Helper / shared functions ---------------------- */

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
 * Attach Set-Cookie headers to response.
 * AWS HTTP API: use "cookies" array for multiple Set-Cookie values.
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
  try {
    const rlResult = await rateLimit(event, 'login', 10, 60);
    if (!rlResult.allowed) {
      console.warn('[LOGIN] Rate limit exceeded');
      return error(429, 'Too many login attempts');
    }

    const rawBody = event?.body || '';
    console.log(`[LOGIN] Raw body length: ${rawBody.length}`);

    let creds = {};
    if (rawBody) {
      try {
        creds = JSON.parse(rawBody);
      } catch (e) {
        console.error('[LOGIN] JSON parse error:', e);
        return error(400, 'Invalid JSON body');
      }
    }

    const { email, password, twoFactorCode } = creds || {};
    if (!email || !password) {
      console.warn('[LOGIN] Missing email/password');
      return error(400, 'email and password are required');
    }

    console.log(`[LOGIN] Attempt for email=${redactEmail(email)}`);

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.warn('[LOGIN] User not found');
      return error(401, 'Invalid credentials');
    }

    if (!user.passwordHash) {
      console.error('[LOGIN] User missing password hash');
      return error(500, 'Server error');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.warn('[LOGIN] Invalid password');
      return error(401, 'Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        console.warn('[LOGIN] 2FA required but code missing');
        return error(401, 'Two-factor code required');
      }
      const ok = authenticator.verify({
        token: twoFactorCode,
        secret: user.twoFactorSecret
      });
      if (!ok) {
        console.warn('[LOGIN] 2FA code invalid');
        return error(401, 'Invalid two-factor code');
      }
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const csrfToken = generateCsrfToken();

    const cookies = [
      generateAccessTokenCookie(accessToken),
      generateRefreshTokenCookie(refreshToken),
      generateCsrfCookie(csrfToken)
    ];

    console.log(
      `[LOGIN] Success userId=${user.id} latency=${nowSeconds() - start}s`
    );

    return response(200, {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled || false
      },
      csrfToken
    }, cookies);
  } catch (e) {
    console.error('[LOGIN] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- REGISTER ---------------------- */

async function register(event) {
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
    const { email, password } = data;
    if (!email || !password) {
      return error(400, 'email and password are required');
    }

    const allowListRaw = process.env.ALLOWED_USER_EMAILS || '';
    if (allowListRaw.trim().length > 0) {
      const allowed = allowListRaw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      if (!allowed.includes(email.toLowerCase())) {
        console.warn('[REGISTER] Email not allowlisted');
        return error(403, 'Registration not permitted');
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
        passwordHash
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
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return error(404, 'Not found');
    }
    return response(200, {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (e) {
    console.error('[ME] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- REFRESH ---------------------- */

async function refresh(event) {
  try {
    const refresh = extractToken(event, 'refresh');
    if (!refresh) {
      return error(401, 'Missing refresh token');
    }
    const payload = verifyToken(refresh, 'refresh');
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

/* ---------------------- ENABLE 2FA ---------------------- */

async function enable2fa(event) {
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
    return response(200, {
      secret,
      otpauth
    });
  } catch (e) {
    console.error('[ENABLE2FA] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- VERIFY 2FA ---------------------- */

async function verify2fa(event) {
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
    console.error('[VERIFY2FA] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- EXPORT ALL ---------------------- */

export {
  login,
  register,
  me,
  refresh,
  logout,
  enable2fa,
  verify2fa
};
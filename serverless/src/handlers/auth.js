/**
 * Authentication & session handlers for Project Valine (Lambda HTTP API v2).
 * Single final export block (no per-function export keywords) to avoid duplicate export errors.
 *
 * Packaging Notes:
 *  - Use `npm ci --omit=dev` before deploying to keep node_modules small.
 *  - With serverless-esbuild bundling, only external deps (e.g. @prisma/client) remain in node_modules.
 */

import { 
  getPrisma, 
  validateDatabaseUrl,
  isPrismaDegraded,
  getDegradedUser,
  createDegradedUser,
  verifyDegradedUserPassword,
  getDegradedUserCount
} from '../db/client.js';
import { error, getCorsHeaders } from '../utils/headers.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
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
  // Disable cache in test environment to allow env var changes between tests
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    const allowListRaw = process.env.ALLOWED_USER_EMAILS || '';
    return allowListRaw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
  }
  
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

/**
 * Clear the allowlist cache (primarily for testing)
 */
function clearAllowlistCache() {
  cachedAllowlist = null;
}

/* ---------------------- Helpers ---------------------- */

function buildHeaders(event = null, extra = {}) {
  return {
    ...getCorsHeaders(event),
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
 * @param {number} statusCode - HTTP status code
 * @param {object} bodyObj - Response body object
 * @param {string[]} cookieHeaders - Array of Set-Cookie header values
 * @param {object} event - Lambda event object for CORS origin detection
 */
function response(statusCode, bodyObj, cookieHeaders = [], event = null) {
  const result = {
    statusCode,
    headers: buildHeaders(event, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(bodyObj)
  };
  
  // Only add cookies if they exist and array is not empty
  if (Array.isArray(cookieHeaders) && cookieHeaders.length > 0) {
    result.cookies = cookieHeaders;
  }
  
  return result;
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
      bodyLength: rawBody.length,
      prismaDegraded: isPrismaDegraded()
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

    // Check if Prisma is in degraded mode
    const degradedMode = isPrismaDegraded();
    
    // If degraded mode is disabled via env var, return 503
    if (degradedMode && process.env.DISABLE_DEGRADED_LOGIN === 'true') {
      logStructured(correlationId, 'login_degraded_disabled', {
        email: redactEmail(email)
      }, 'error');
      return error(503, 'DATABASE_UNAVAILABLE', { correlationId });
    }

    let user;
    
    if (degradedMode) {
      // Degraded mode: use in-memory user store
      logStructured(correlationId, 'login_degraded_mode', {
        email: redactEmail(email)
      }, 'warn');
      
      user = getDegradedUser(email);
      
      if (!user) {
        // In degraded mode, we cannot verify if user exists in DB
        // For security, only allow login for users we've already created in degraded mode
        // or create new user if this is the first login attempt
        logStructured(correlationId, 'login_degraded_user_not_found', {
          email: redactEmail(email)
        }, 'warn');
        
        // Double-check: verify email is in allowlist before creating user
        // (This should already be verified above, but defense-in-depth)
        if (allowlist.length > 0 && !allowlist.includes(email.toLowerCase())) {
          logStructured(correlationId, 'login_degraded_blocked_not_allowlisted', {
            email: redactEmail(email)
          }, 'error');
          return error(403, 'Access denied: email not in allowlist', { correlationId });
        }
        
        // Create degraded mode user for allowlisted email on first login attempt
        // Note: This means first login will "register" the user in degraded store
        // Password will be hashed and stored in memory
        user = await createDegradedUser(email, password);
        
        logStructured(correlationId, 'login_degraded_user_created', {
          email: redactEmail(email),
          userId: user.id
        }, 'warn');
      } else {
        // Verify password for existing degraded mode user
        const valid = await verifyDegradedUserPassword(email, password);
        if (!valid) {
          logStructured(correlationId, 'login_degraded_invalid_password', {
            email: redactEmail(email)
          }, 'warn');
          return error(401, 'Invalid credentials', { correlationId });
        }
      }
    } else {
      // Normal mode: use Prisma
      const prisma = getPrisma();
      
      if (!prisma) {
        // Prisma returned null unexpectedly
        logStructured(correlationId, 'login_prisma_null', {
          email: redactEmail(email)
        }, 'error');
        return error(503, 'DATABASE_UNAVAILABLE', { correlationId });
      }
      
      try {
        user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        });
      } catch (dbError) {
        logStructured(correlationId, 'login_db_error', {
          email: redactEmail(email),
          error: dbError.message,
          code: dbError.code
        }, 'error');
        
        // Check if this is a Prisma initialization or connection error
        if (dbError.name === 'PrismaClientInitializationError' ||
            dbError.code === 'P1001' || // Can't reach database
            dbError.code === 'P1002' || // Database timed out
            dbError.code === 'P1003') { // Database not found
          return error(503, 'DATABASE_UNAVAILABLE', { correlationId });
        }
        
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
    }

    logStructured(correlationId, 'login_password_verified', {
      userId: user.id,
      email: redactEmail(user.email),
      degradedMode
    }, 'info');

    // 2FA only applies in normal mode (degraded mode users don't have 2FA)
    if (!degradedMode && user.twoFactorEnabled) {
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
      latencySeconds: nowSeconds() - start,
      degradedMode
    }, 'info');

    return response(
      200,
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username || null,
          displayName: user.displayName || user.name || null,
          onboardingComplete: user.onboardingComplete || false,
          profileComplete: user.profileComplete || false,
          createdAt: user.createdAt,
          twoFactorEnabled: user.twoFactorEnabled || false
        },
        csrfToken,
        ...(degradedMode ? { _degradedMode: true } : {})
      },
      cookies,
      event
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
    logStructured(correlationId, 'register_attempt', {
      bodyLength: rawBody.length
    }, 'info');
    
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch (e) {
        logStructured(correlationId, 'register_json_parse_error', {
          error: e.message
        }, 'error');
        return error(400, 'Invalid JSON body', { correlationId });
      }
    }
    const { email, password, username, displayName } = data;
    if (!email || !password) {
      logStructured(correlationId, 'register_missing_credentials', {
        hasEmail: !!email,
        hasPassword: !!password
      }, 'warn');
      return error(400, 'email and password are required', { correlationId });
    }

    logStructured(correlationId, 'register_credentials_received', {
      email: redactEmail(email)
    }, 'info');

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

    // Check allowlist enforcement based on registration mode
    if (!enableRegistration) {
      // Registration closed to public — require email in allowlist
      if (allowlist.length === 0) {
        logStructured(correlationId, 'register_closed_no_allowlist', {
          email: redactEmail(email)
        }, 'warn');
        return error(403, 'Registration is currently disabled', { correlationId });
      }
      if (!allowlist.includes(email.toLowerCase())) {
        logStructured(correlationId, 'registration_denied', {
          email: redactEmail(email),
          reason: 'registration_disabled_not_in_allowlist',
          allowlistCount: allowlist.length
        }, 'warn');
        return error(403, 'Registration is currently disabled', { correlationId });
      }
    } else {
      // Registration is enabled, but check allowlist if configured
      if (allowlist.length > 0 && !allowlist.includes(email.toLowerCase())) {
        logStructured(correlationId, 'registration_denied', {
          email: redactEmail(email),
          reason: 'email_not_in_allowlist',
          allowlistCount: allowlist.length
        }, 'warn');
        return error(403, 'Registration not permitted for this email address', { correlationId });
      }
    }

    logStructured(correlationId, 'register_allowlist_passed', {
      email: redactEmail(email)
    }, 'info');

    const prisma = getPrisma();
    
    // Test database connection before proceeding
    try {
      await prisma.$queryRaw`SELECT 1`;
      logStructured(correlationId, 'register_db_connection_ok', {}, 'info');
    } catch (dbTestError) {
      logStructured(correlationId, 'register_db_connection_failed', {
        error: dbTestError.message,
        code: dbTestError.code
      }, 'error');
      
      // Check if it's a connection string parsing error
      if (dbTestError.message.includes('invalid domain character') || 
          dbTestError.message.includes('connection string') ||
          dbTestError.message.includes('database string is invalid')) {
        // Validate and log sanitized URL for debugging
        const validation = validateDatabaseUrl(process.env.DATABASE_URL);
        if (!validation.valid) {
          logStructured(correlationId, 'register_db_config_error', {
            validationError: validation.error,
            sanitizedUrl: validation.sanitizedUrl
          }, 'error');
        }
        return error(503, 'Database configuration error', { correlationId });
      }
      
      return error(503, 'Database temporarily unavailable', { correlationId });
    }
    
    // Check for existing user - wrapped in try-catch to handle DB errors
    let existing;
    try {
      existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
    } catch (dbError) {
      logStructured(correlationId, 'register_db_lookup_error', {
        email: redactEmail(email),
        error: dbError.message
      }, 'error');
      return error(500, 'Server error', { correlationId });
    }
    
    if (existing) {
      logStructured(correlationId, 'register_email_exists', {
        email: redactEmail(email)
      }, 'warn');
      return error(409, 'Email already registered', { correlationId });
    }

    // Create user - wrapped in try-catch to handle unique constraint violations
    let user;
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username: finalUsername,
          passwordHash: passwordHash,
          displayName: finalDisplayName,
        }
      });
    } catch (createError) {
      // Check for Prisma unique constraint violation (P2002)
      if (createError.code === 'P2002') {
        logStructured(correlationId, 'register_duplicate_constraint', {
          email: redactEmail(email),
          target: createError.meta?.target
        }, 'warn');
        return error(409, 'Email or username already registered', { correlationId });
      }
      logStructured(correlationId, 'register_db_create_error', {
        email: redactEmail(email),
        error: createError.message,
        code: createError.code
      }, 'error');
      return error(500, 'Server error', { correlationId });
    }

    logStructured(correlationId, 'register_success', {
      userId: user.id,
      email: redactEmail(user.email)
    }, 'info');
    
    return response(201, {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    }, [], event);
  } catch (e) {
    logStructured(correlationId, 'register_unhandled_error', {
      error: e.message,
      stack: e.stack
    }, 'error');
    return error(500, 'Server error', { correlationId });
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
        hasCookie: !!(event.headers?.cookie || event.headers?.Cookie) || (Array.isArray(event.cookies) && event.cookies.length > 0)
      }, 'warn');
      return error(401, 'Unauthorized', { correlationId });
    }
    
    logStructured(correlationId, 'me_token_decoded', {
      userId
    }, 'info');
    
    const prisma = getPrisma();
    
    // Handle Prisma in degraded mode (null client)
    if (!prisma) {
      logStructured(correlationId, 'me_prisma_unavailable', {
        userId,
        prismaDegraded: isPrismaDegraded()
      }, 'error');
      return error(503, 'DATABASE_UNAVAILABLE', { correlationId });
    }
    
    let user;
    let profile = null;
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

    // Fetch profile data if available
    try {
      profile = await prisma.profile.findUnique({ where: { userId } });
    } catch (profileError) {
      // Profile may not exist - continue with null profile
      logStructured(correlationId, 'me_profile_fetch_warning', {
        userId,
        error: profileError.message
      }, 'warn');
    }
    
    logStructured(correlationId, 'me_success', {
      userId: user.id,
      email: redactEmail(user.email),
      hasProfile: !!profile
    }, 'info');
    
    return response(200, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username || null,
        displayName: user.displayName || user.name || null,
        avatar: user.avatar || null,
        headline: profile?.headline || null,
        // bio exists on both User and Profile tables; Profile takes precedence
        bio: profile?.bio || user.bio || null,
        roles: profile?.roles || [],
        tags: profile?.tags || [],
        onboardingComplete: user.onboardingComplete || false,
        profileComplete: user.profileComplete || false,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    }, [], event);
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
    const payload = verifyToken(refreshTok);
    if (!payload) {
      return error(401, 'Invalid refresh token');
    }
    
    // Ensure this is actually a refresh token, not an access token
    // Check for payload.type existence to handle tokens without type field
    if (!payload.type || payload.type !== 'refresh') {
      return error(401, 'Invalid token type - expected refresh token');
    }

    const prisma = getPrisma();
    if (!prisma) {
      console.error('[REFRESH] Database unavailable');
      return error(503, 'DATABASE_UNAVAILABLE');
    }
    
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return error(401, 'Invalid user');
    }

    const newAccess = generateAccessToken(user.id);
    const accessCookie = generateAccessTokenCookie(newAccess);

    return response(200, { ok: true }, [accessCookie], event);
  } catch (e) {
    console.error('[REFRESH] Unhandled error:', e);
    return error(500, 'Server error');
  }
}

/* ---------------------- LOGOUT ---------------------- */

async function logout(event) {
  try {
    const cookies = [
      ...generateClearCookieHeaders(),
      clearCsrfCookie()
    ];
    return response(200, { ok: true }, cookies, event);
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
    return response(200, { verified: true }, [], event);
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
    return response(200, { sent: true }, [], event);
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
    if (!prisma) {
      console.error('[SETUP2FA] Database unavailable');
      return error(503, 'DATABASE_UNAVAILABLE');
    }
    
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
    return response(200, { secret, otpauth }, [], event);
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
    if (!prisma) {
      console.error('[ENABLE2FA] Database unavailable');
      return error(503, 'DATABASE_UNAVAILABLE');
    }
    
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

    return response(200, { twoFactorEnabled: true }, [], event);
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
    if (!prisma) {
      console.error('[VERIFY2FA] Database unavailable');
      return error(503, 'DATABASE_UNAVAILABLE');
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return error(400, '2FA not initialized');
    }

    const ok = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret
    });
    if (!ok) return error(401, 'Invalid code');

    return response(200, { verified: true }, [], event);
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
    if (!prisma) {
      console.error('[DISABLE2FA] Database unavailable');
      return error(503, 'DATABASE_UNAVAILABLE');
    }
    
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

    return response(200, { twoFactorEnabled: false }, [], event);
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

/* ---------------------- SEED RESTRICTED ---------------------- */

/**
 * POST /auth/seed-restricted
 * Seeds initial allowlisted user accounts.
 * 
 * This endpoint is guarded by the ADMIN_SEED_TOKEN environment variable.
 * It creates users from the ALLOWED_USER_EMAILS environment variable if they
 * don't exist, sets them with onboardingComplete=true, profileComplete=true,
 * emailVerified=true, and generates temporary random passwords.
 * 
 * Security:
 * - Requires ADMIN_SEED_TOKEN in Authorization header (Bearer token)
 * - Token must be at least 32 characters long
 * - Uses constant-time comparison to prevent timing attacks
 * - Returns 403 if token is missing or invalid
 * - Returns 503 if token is configured but too short
 * - All operations are logged for audit trail (info, warn, error levels)
 * 
 * Password Delivery:
 * - Temporary passwords are returned in the response for admin to retrieve
 * - This is intentional for initial setup - endpoint is one-time use
 * - Passwords are NOT logged; only the creation event is logged
 * - Admins should immediately change these passwords after first login
 */
async function seedRestricted(event) {
  const correlationId = generateCorrelationId();
  const start = nowSeconds();
  
  try {
    logStructured(correlationId, 'seed_restricted_attempt', {}, 'info');
    
    // Check for admin seed token
    const adminToken = process.env.ADMIN_SEED_TOKEN;
    if (!adminToken || adminToken.trim() === '') {
      logStructured(correlationId, 'seed_restricted_no_token_configured', {}, 'warn');
      return error(403, 'Seed endpoint not configured', { correlationId });
    }
    
    // Validate token meets minimum security requirements (at least 32 chars)
    const MIN_TOKEN_LENGTH = 32;
    if (adminToken.length < MIN_TOKEN_LENGTH) {
      logStructured(correlationId, 'seed_restricted_token_too_short', {
        minLength: MIN_TOKEN_LENGTH,
        actualLength: adminToken.length
      }, 'error');
      return error(503, 'Seed endpoint misconfigured', { correlationId });
    }
    
    // Extract Authorization header
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const providedToken = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    // Use constant-time comparison to prevent timing attacks
    const tokensMatch = providedToken && 
      providedToken.length === adminToken.length &&
      crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(adminToken));
    
    if (!tokensMatch) {
      logStructured(correlationId, 'seed_restricted_invalid_token', {
        hasToken: !!providedToken,
        tokenLength: providedToken?.length || 0
      }, 'warn');
      return error(403, 'Invalid or missing admin token', { correlationId });
    }
    
    logStructured(correlationId, 'seed_restricted_token_valid', {}, 'info');
    
    // Get allowlisted emails from environment
    const allowlist = getActiveAllowlist();
    if (allowlist.length === 0) {
      logStructured(correlationId, 'seed_restricted_empty_allowlist', {}, 'warn');
      return error(400, 'No allowlisted emails configured', { correlationId });
    }
    
    const prisma = getPrisma();
    if (!prisma) {
      logStructured(correlationId, 'seed_restricted_prisma_unavailable', {
        prismaDegraded: isPrismaDegraded()
      }, 'error');
      return error(503, 'DATABASE_UNAVAILABLE', { correlationId });
    }
    
    const results = [];
    
    for (const email of allowlist) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        });
        
        if (existingUser) {
          logStructured(correlationId, 'seed_restricted_user_exists', {
            email: redactEmail(email),
            userId: existingUser.id
          }, 'info');
          
          results.push({
            email: redactEmail(email),
            status: 'alreadyExists',
            userId: existingUser.id
          });
          continue;
        }
        
        // Generate temporary random password (32 hex chars = 16 bytes = 128 bits of entropy)
        // This is intentionally returned in the response for one-time admin setup
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        
        // Generate username from email
        const username = email.split('@')[0];
        const displayName = username;
        
        // Create user with all flags set
        const user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            username: username,
            passwordHash: passwordHash,
            displayName: displayName,
            onboardingComplete: true,
            profileComplete: true,
            emailVerified: true,
            emailVerifiedAt: new Date()
          }
        });
        
        // Note: Password is intentionally included in response for admin to retrieve
        // during initial setup. This endpoint is protected by ADMIN_SEED_TOKEN and
        // should only be called once during deployment. Do not log the password.
        logStructured(correlationId, 'seed_restricted_user_created', {
          email: redactEmail(email),
          userId: user.id
        }, 'info');
        
        results.push({
          email: redactEmail(email),
          status: 'created',
          userId: user.id,
          tempPassword: tempPassword // Intentional: admin needs this for initial setup
        });
        
      } catch (userError) {
        logStructured(correlationId, 'seed_restricted_user_error', {
          email: redactEmail(email),
          error: userError.message
        }, 'error');
        
        results.push({
          email: redactEmail(email),
          status: 'error',
          error: userError.message
        });
      }
    }
    
    logStructured(correlationId, 'seed_restricted_complete', {
      totalUsers: allowlist.length,
      results: results.map(r => ({ email: r.email, status: r.status })),
      latencySeconds: nowSeconds() - start
    }, 'info');
    
    return response(200, {
      success: true,
      message: 'Seed operation completed',
      users: results
    }, [], event);
    
  } catch (e) {
    logStructured(correlationId, 'seed_restricted_unhandled_error', {
      error: e.message,
      stack: e.stack
    }, 'error');
    return error(500, 'Server error', { correlationId });
  }
}

/* ---------------------- AUTH STATUS ---------------------- */

/**
 * GET /auth/status
 * Returns the current auth configuration for ops visibility.
 * This is a public endpoint that helps operators verify that
 * environment variables are correctly propagated to Lambda.
 */
async function authStatus(event) {
  const correlationId = generateCorrelationId();
  
  try {
    logStructured(correlationId, 'auth_status_request', {}, 'info');
    
    // Defensive: wrap allowlist retrieval in try-catch
    let allowlist = [];
    try {
      allowlist = getActiveAllowlist() || [];
    } catch (allowlistError) {
      logStructured(correlationId, 'auth_status_allowlist_error', {
        error: allowlistError.message
      }, 'error');
      // Continue with empty allowlist rather than failing
    }
    
    // Defensive: safely parse boolean env vars with explicit fallbacks
    const enableRegistration = String(process.env.ENABLE_REGISTRATION || 'false').toLowerCase() === 'true';
    const twoFactorEnabled = String(process.env.TWO_FACTOR_ENABLED || 'false').toLowerCase() === 'true';
    const emailVerificationRequired = String(process.env.EMAIL_VERIFICATION_REQUIRED || 'false').toLowerCase() === 'true';
    
    const statusResponse = {
      registrationEnabled: enableRegistration,
      allowlistActive: allowlist.length > 0,
      allowlistCount: allowlist.length,
      twoFactorEnabled: twoFactorEnabled,
      emailVerificationRequired: emailVerificationRequired
    };
    
    logStructured(correlationId, 'auth_status_response', statusResponse, 'info');
    
    return response(200, statusResponse, [], event);
  } catch (e) {
    logStructured(correlationId, 'auth_status_error', {
      error: e.message,
      stack: e.stack,
      name: e.name
    }, 'error');
    
    // Return a structured error response using the response helper for consistency
    return response(500, {
      error: 'AUTH_STATUS_ERROR',
      message: 'Failed to retrieve auth status',
      correlationId: correlationId
    }, [], event);
  }
}

/* ---------------------- AUTH DIAG ---------------------- */

/**
 * GET /auth/diag
 * Returns diagnostic information for ops debugging.
 * Public endpoint (no auth required) for quickly diagnosing production issues.
 * 
 * WARNING: This endpoint exposes system state for debugging.
 * Consider restricting access in production via WAF or removing after outage.
 */
async function authDiag(event) {
  const correlationId = generateCorrelationId();
  
  try {
    logStructured(correlationId, 'auth_diag_request', {}, 'info');
    
    // Check Prisma degraded status
    const prismaDegradedStatus = isPrismaDegraded();
    
    // Check for .prisma directory presence
    let layerPresent = false;
    let engineFilesFound = [];
    try {
      // Check common Lambda layer paths
      const layerPaths = [
        '/opt/nodejs/node_modules/.prisma',
        '/var/task/node_modules/.prisma',
        './node_modules/.prisma'
      ];
      
      for (const layerPath of layerPaths) {
        try {
          const stats = await fs.stat(layerPath);
          if (stats.isDirectory()) {
            layerPresent = true;
            // List engine files (don't expose full paths for security)
            const clientPath = path.join(layerPath, 'client');
            try {
              const files = await fs.readdir(clientPath);
              engineFilesFound = files.filter(f => 
                f.includes('query_engine') || f.includes('libquery_engine')
              ).map(f => f.replace(/^.*\//, '')); // Strip path
            } catch {
              // Client dir not accessible
            }
            break;
          }
        } catch {
          // Path doesn't exist, continue
        }
      }
    } catch (fsError) {
      // fs not available or error - ignore
      logStructured(correlationId, 'auth_diag_fs_error', {
        error: fsError.message
      }, 'warn');
    }
    
    // Get allowlist info
    let allowlist = [];
    try {
      allowlist = getActiveAllowlist() || [];
    } catch {
      // Ignore errors
    }
    
    // Get degraded user count
    const degradedUserCount = getDegradedUserCount();
    
    const diagResponse = {
      prismaDegraded: prismaDegradedStatus,
      layerPresent,
      allowlistCount: allowlist.length,
      registrationEnabled: String(process.env.ENABLE_REGISTRATION || 'false').toLowerCase() === 'true',
      degradedLoginDisabled: process.env.DISABLE_DEGRADED_LOGIN === 'true',
      degradedUserCount,
      engineFilesFound: engineFilesFound.length > 0 ? engineFilesFound : undefined,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: Date.now()
    };
    
    logStructured(correlationId, 'auth_diag_response', diagResponse, 'info');
    
    return response(200, diagResponse, [], event);
  } catch (e) {
    logStructured(correlationId, 'auth_diag_error', {
      error: e.message,
      stack: e.stack
    }, 'error');
    
    return response(500, {
      error: 'AUTH_DIAG_ERROR',
      message: 'Failed to retrieve diagnostic info',
      correlationId
    }, [], event);
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
  seedRestricted,
  authStatus,
  authDiag,
  getUserFromEvent,
  clearAllowlistCache
};
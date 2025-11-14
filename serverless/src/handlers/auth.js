/**
 * Auth handlers (registration, login, session, tokens, 2FA)
 * CORS FIX: All success responses now use getCorsHeaders(event) instead of '*' wildcard
 * so browsers will accept credentialed (cookie) responses.
 */

import { getPrisma } from '../db/client.js';
import { json, error, getCorsHeaders } from '../utils/headers.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { rateLimit } from '../middleware/rateLimit.js';
import { generateCsrfToken, generateCsrfCookie, clearCsrfCookie } from '../middleware/csrfMiddleware.js';
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

// Password hashing with bcrypt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Password comparison with bcrypt
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Export for backward compatibility
export const getUserFromEvent = getUserIdFromEvent;

/* ============================= REGISTER ============================= */

export const register = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (parseErr) {
    console.error('[REGISTER] JSON parse error. Raw body:', event.body);
    return error('Invalid JSON payload', 400, { event });
  }

  const { email, password, username, displayName } = payload;

  try {
    if (!email || !password || !username || !displayName) {
      return error('email, password, username, and displayName are required', 400, { event });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error('Invalid email format', 400, { event });
    }

    // Allowlist + registration gating
    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const ENABLE_REGISTRATION = process.env.ENABLE_REGISTRATION === 'true';
    const normalizedEmail = email.toLowerCase().trim();

    if (!ENABLE_REGISTRATION) {
      // Registration disabled globally; only allow allowlisted emails
      if (allowedEmails.length === 0 || !allowedEmails.includes(normalizedEmail)) {
        console.log(`Registration blocked: ENABLE_REGISTRATION=false and email ${normalizedEmail} not in allowlist`);
        return error('Registration is currently disabled', 403, { event });
      }
      console.log(`Registration allowed (allowlisted): ${normalizedEmail}`);
    } else if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
      console.log(`Registration blocked: ${normalizedEmail} not in allowlist`);
      return error('Registration not permitted for this email address', 403, { event });
    }

    // Validate password length
    if (password.length < 6) {
      return error('Password must be at least 6 characters', 400, { event });
    }

    const prisma = getPrisma();

    // Check if user already exists (by email or username)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { normalizedEmail },
          { username }
        ]
      }
    });

    if (existingUser) {
      return error('User with this email or username already exists', 409, { event });
    }

    // Create user
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail,
        password: hashedPassword,
        username,
        displayName,
        emailVerified: false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt
      }
    });

    // Send verification (console / SMTP)
    await sendVerificationEmail(user.email, verificationToken, user.username);

    // Generate auth tokens & cookies
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const accessCookie = generateAccessTokenCookie(accessToken);
    const refreshCookie = generateRefreshTokenCookie(refreshToken);

    // CORS headers (FIX)
    const cors = getCorsHeaders(event);

    return {
      statusCode: 201,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'Set-Cookie': accessCookie,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload'
      },
      multiValueHeaders: {
        'Set-Cookie': [accessCookie, refreshCookie]
      },
      body: JSON.stringify({
        user,
        message: 'Registration successful. Please check your email to verify your account.'
      })
    };
  } catch (e) {
    console.error('Register error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============================= LOGIN ============================= */

export const login = async (event) => {
  const rawBody = event.body || '';
  console.log('[LOGIN] Raw body length:', rawBody.length, 'body snippet:', rawBody.substring(0, 120));

  // Safe JSON parse
  let parsed;
  try {
    parsed = JSON.parse(rawBody || '{}');
  } catch (parseErr) {
    console.error('[LOGIN] JSON parse error. Raw body:', rawBody);
    return error('Invalid JSON payload', 400, { event });
  }

  let { email, password } = parsed;

  if (!email || !password) {
    return error('email and password are required', 400, { event });
  }

  email = email.trim().toLowerCase();
  password = password.trim();

  try {
    const prisma = getPrisma();

    // Allow lookup by either stored email or normalizedEmail
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { normalizedEmail: email }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        role: true,
        password: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log(`Login failed: user not found (${email})`);
      return error('Invalid email or password', 401, { event });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      console.log(`Login failed: wrong password (${email})`);
      return error('Invalid email or password', 401, { event });
    }

    // Allowlist enforcement
    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const userEmailNormalized = user.email.toLowerCase();

    if (allowedEmails.length > 0 && !allowedEmails.includes(userEmailNormalized)) {
      console.log(`Login blocked (allowlist): ${user.email}`);
      return error('Account not authorized for access', 403, { event });
    }

    if (!user.emailVerified) {
      console.log(`User logged in with unverified email: ${user.email}`);
    }

    const { password: _, twoFactorEnabled, ...userWithoutPassword } = user;

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Persist refresh token
    const decodedRefresh = verifyToken(refreshToken);
    const jti = decodedRefresh?.jti;
    if (jti) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          jti,
          expiresAt,
          lastUsedAt: new Date()
        }
      });
    }

    // Cookies
    const accessCookie = generateAccessTokenCookie(accessToken);
    const refreshCookie = generateRefreshTokenCookie(refreshToken);
    const csrfToken = generateCsrfToken();
    const csrfCookie = generateCsrfCookie(csrfToken);

    const cors = getCorsHeaders(event);

    return {
      statusCode: 200,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'Set-Cookie': accessCookie,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload'
      },
      multiValueHeaders: {
        'Set-Cookie': [accessCookie, refreshCookie, csrfCookie]
      },
      body: JSON.stringify({
        user: userWithoutPassword,
        requiresTwoFactor: twoFactorEnabled && false
      })
    };
  } catch (e) {
    console.error('Login error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============================= ME ============================= */

export const me = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401, { event });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            reels: true,
            sentRequests: true,
            receivedRequests: true
          }
        }
      }
    });

    if (!user) {
      return error('User not found', 404, { event });
    }

    return json({ user }, 200, { event });
  } catch (e) {
    console.error('Me error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============================= EMAIL VERIFICATION ============================= */

const sendVerificationEmail = async (email, token, username) => {
  const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const maskedToken = token.length > 12
    ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}`
    : '***masked***';

  if (EMAIL_ENABLED) {
    console.log(`[EMAIL] Sending verification email to ${email} via SMTP`);
    console.log(`[EMAIL] Token: ${maskedToken}`);
  } else {
    console.log('=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your Project Valine account`);
    console.log(`Hi ${username},`);
    console.log('Please verify your email by clicking the link below:');
    console.log(verificationUrl);
    console.log(`Token (masked): ${maskedToken}`);
    console.log('This link expires in 24 hours.');
    console.log('=====================================');
  }
};

export const verifyEmail = async (event) => {
  try {
    const { token } = JSON.parse(event.body || '{}');
    if (!token) {
      return error('Verification token is required', 400, { event });
    }

    const prisma = getPrisma();
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verificationToken) {
      return error('Invalid verification token', 400, { event });
    }

    if (new Date() > verificationToken.expiresAt) {
      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      return error('Verification token has expired. Please request a new one.', 400, { event });
    }

    if (verificationToken.user.emailVerified) {
      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      return json({ message: 'Email address already verified', alreadyVerified: true }, 200, { event });
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() }
    });

    await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });

    return json({ message: 'Email verified successfully', verified: true }, 200, { event });
  } catch (e) {
    console.error('Verify email error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const resendVerification = async (event) => {
  try {
    const rateLimitResult = await rateLimit(event, '/auth/resend-verification');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401, { event });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, emailVerified: true }
    });

    if (!user) {
      return error('User not found', 404, { event });
    }

    if (user.emailVerified) {
      return error('Email address is already verified', 400, { event });
    }

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token: verificationToken, expiresAt }
    });

    await sendVerificationEmail(user.email, verificationToken, user.username);

    const response = json({
      message: 'Verification email sent successfully. Please check your email.',
      email: user.email
    }, 200, { event });

    if (event.rateLimitHeaders) {
      response.headers = { ...response.headers, ...event.rateLimitHeaders };
    }

    return response;
  } catch (e) {
    console.error('Resend verification error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============================= REFRESH TOKEN ============================= */

export const refresh = async (event) => {
  try {
    const refreshToken = extractToken(event, 'refresh');
    if (!refreshToken) {
      return error('Refresh token required', 401, { event });
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return error('Invalid refresh token', 401, { event });
    }

    const prisma = getPrisma();

    const oldJti = decoded.jti;
    if (oldJti) {
      const storedToken = await prisma.refreshToken.findUnique({ where: { jti: oldJti } });
      if (!storedToken) return error('Invalid refresh token', 401, { event });
      if (storedToken.invalidatedAt) return error('Refresh token has been invalidated', 401, { event });
      if (new Date() > storedToken.expiresAt) return error('Refresh token has expired', 401, { event });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    });
    if (!user) return error('User not found', 404, { event });

    // Rotate tokens
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    const newDecoded = verifyToken(newRefreshToken);
    const newJti = newDecoded?.jti;

    if (oldJti && newJti) {
      await prisma.$transaction([
        prisma.refreshToken.update({ where: { jti: oldJti }, data: { invalidatedAt: new Date() } }),
        prisma.refreshToken.create({
          data: {
            userId: user.id,
            jti: newJti,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            lastUsedAt: new Date()
          }
        })
      ]);
    }

    const accessCookie = generateAccessTokenCookie(newAccessToken);
    const refreshCookie = generateRefreshTokenCookie(newRefreshToken);
    const csrfToken = generateCsrfToken();
    const csrfCookie = generateCsrfCookie(csrfToken);

    const cors = getCorsHeaders(event);

    return {
      statusCode: 200,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'Set-Cookie': accessCookie,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload'
      },
      multiValueHeaders: {
        'Set-Cookie': [accessCookie, refreshCookie, csrfCookie]
      },
      body: JSON.stringify({ message: 'Token refreshed successfully' })
    };
  } catch (e) {
    console.error('Refresh token error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============================= LOGOUT ============================= */

export const logout = async (event) => {
  try {
    const refreshToken = extractToken(event, 'refresh');
    if (refreshToken) {
      const decoded = verifyToken(refreshToken);
      const jti = decoded?.jti;
      if (jti) {
        const prisma = getPrisma();
        try {
          await prisma.refreshToken.update({
            where: { jti },
            data: { invalidatedAt: new Date() }
          });
        } catch (err) {
          console.log('Refresh token not found for invalidation:', jti);
        }
      }
    }

    const clearCookies = generateClearCookieHeaders();
    const clearCsrf = clearCsrfCookie();

    const cors = getCorsHeaders(event);

    return {
      statusCode: 200,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload'
      },
      multiValueHeaders: {
        'Set-Cookie': [...clearCookies, clearCsrf]
      },
      body: JSON.stringify({ message: 'Logged out successfully' })
    };
  } catch (e) {
    console.error('Logout error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============================= 2FA (Phase 2) ============================= */

authenticator.options = {
  window: 1,
  step: 30
};

const generateTOTPSecret = () => authenticator.generateSecret();

const verifyTOTPCode = (secret, code) => {
  const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
  if (!TWO_FACTOR_ENABLED) return true;
  try {
    return authenticator.verify({ token: code, secret });
  } catch (err) {
    console.error('[2FA] TOTP verification error:', err);
    return false;
  }
};

export const setup2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    if (!TWO_FACTOR_ENABLED) return error('2FA feature is not enabled', 404, { event });

    const userId = getUserIdFromEvent(event);
    if (!userId) return error('Unauthorized - No valid token provided', 401, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, twoFactorEnabled: true }
    });
    if (!user) return error('User not found', 404, { event });
    if (user.twoFactorEnabled) return error('2FA is already enabled for this account', 400, { event });

    const secret = generateTOTPSecret();
    const appName = 'Project Valine';
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });

    return json({
      secret,
      otpauthUrl,
      message: 'Scan the QR code with your authenticator app, then call /auth/2fa/enable with a verification code'
    }, 200, { event });
  } catch (e) {
    console.error('2FA setup error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const enable2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    if (!TWO_FACTOR_ENABLED) return error('2FA feature is not enabled', 404, { event });

    const userId = getUserIdFromEvent(event);
    if (!userId) return error('Unauthorized - No valid token provided', 401, { event });

    const { code } = JSON.parse(event.body || '{}');
    if (!code) return error('Verification code is required', 400, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true }
    });
    if (!user) return error('User not found', 404, { event });
    if (user.twoFactorEnabled) return error('2FA is already enabled', 400, { event });
    if (!user.twoFactorSecret) return error('No 2FA setup found. Call /auth/2fa/setup first.', 400, { event });

    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) return error('Invalid verification code', 400, { event });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    return json({ message: '2FA enabled successfully', enabled: true }, 200, { event });
  } catch (e) {
    console.error('2FA enable error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const verify2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    if (!TWO_FACTOR_ENABLED) return error('2FA feature is not enabled', 404, { event });

    const { code, userId } = JSON.parse(event.body || '{}');
    if (!code || !userId) return error('code and userId are required', 400, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true }
    });
    if (!user) return error('User not found', 404, { event });
    if (!user.twoFactorEnabled) return error('2FA is not enabled for this user', 400, { event });

    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) return error('Invalid verification code', 401, { event });

    return json({ message: '2FA verified successfully', verified: true }, 200, { event });
  } catch (e) {
    console.error('2FA verify error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const disable2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    if (!TWO_FACTOR_ENABLED) return error('2FA feature is not enabled', 404, { event });

    const userId = getUserIdFromEvent(event);
    if (!userId) return error('Unauthorized - No valid token provided', 401, { event });

    const { code } = JSON.parse(event.body || '{}');
    if (!code) return error('Verification code is required to disable 2FA', 400, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true }
    });
    if (!user) return error('User not found', 404, { event });
    if (!user.twoFactorEnabled) return error('2FA is not enabled', 400, { event });

    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) return error('Invalid verification code', 401, { event });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });

    return json({ message: '2FA disabled successfully', enabled: false }, 200, { event });
  } catch (e) {
    console.error('2FA disable error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};
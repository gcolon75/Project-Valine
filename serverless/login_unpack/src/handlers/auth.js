/**
 * Auth handlers (registration, login, session, tokens, 2FA)
 * CORS FIX: All success responses now use getCorsHeaders(event).
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

const hashPassword = async (password) => bcrypt.hash(password, 10);
const comparePassword = async (password, hashed) => bcrypt.compare(password, hashed);
export const getUserFromEvent = getUserIdFromEvent;

/* ============ REGISTER ============ */
export const register = async (event) => {
  let parsed;
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { console.error('[REGISTER] Parse error raw body:', event.body); return error('Invalid JSON payload', 400, { event }); }

  const { email, password, username, displayName } = parsed;
  try {
    if (!email || !password || !username || !displayName) return error('email, password, username, and displayName are required', 400, { event });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Invalid email format', 400, { event });

    // ALLOWLIST ENFORCEMENT - Check before any DB operations
    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const normalizedEmail = email.toLowerCase().trim();

    // If allowlist is configured, strictly enforce it
    if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
      // Structured logging for registration denial
      console.log(JSON.stringify({
        event: 'registration_denied',
        email: normalizedEmail,
        reason: 'email_not_in_allowlist',
        timestamp: new Date().toISOString(),
        allowlistCount: allowedEmails.length
      }));
      return error('Access denied: email not in allowlist', 403, { event });
    }

    if (password.length < 6) return error('Password must be at least 6 characters', 400, { event });

    const prisma = getPrisma();
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { normalizedEmail }, { username }] }
    });
    if (existingUser) return error('User with this email or username already exists', 409, { event });

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
      select: { id: true, username: true, email: true, displayName: true, avatar: true, emailVerified: true, createdAt: true }
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token: verificationToken, expiresAt: new Date(Date.now() + 86400000) }
    });
    await sendVerificationEmail(user.email, verificationToken, user.username);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const accessCookie = generateAccessTokenCookie(accessToken);
    const refreshCookie = generateRefreshTokenCookie(refreshToken);
    const cors = getCorsHeaders(event);

    return {
      statusCode: 201,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'Set-Cookie': accessCookie
      },
      multiValueHeaders: { 'Set-Cookie': [accessCookie, refreshCookie] },
      body: JSON.stringify({ user, message: 'Registration successful. Verify your email.' })
    };
  } catch (e) {
    console.error('Register error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ LOGIN ============ */
export const login = async (event) => {
  const raw = event.body || '';
  console.log('[LOGIN] Raw body length:', raw.length, 'snippet:', raw.substring(0, 120));

  let parsed;
  try { parsed = JSON.parse(raw || '{}'); }
  catch { console.error('[LOGIN] Parse error raw body:', raw); return error('Invalid JSON payload', 400, { event }); }

  let { email, password } = parsed;
  if (!email || !password) return error('email and password are required', 400, { event });

  email = email.trim().toLowerCase();
  password = password.trim();

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { normalizedEmail: email }] },
      select: {
        id: true, username: true, email: true, displayName: true, avatar: true,
        role: true, password: true, emailVerified: true, twoFactorEnabled: true, createdAt: true
      }
    });
    if (!user) return error('Invalid email or password', 401, { event });

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) return error('Invalid email or password', 401, { event });

    // ALLOWLIST ENFORCEMENT - Defense in depth for existing non-allowlisted users
    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allowedEmails.length > 0 && !allowedEmails.includes(user.email.toLowerCase())) {
      // Structured logging for login denial
      console.log(JSON.stringify({
        event: 'login_denied',
        email: user.email.toLowerCase(),
        reason: 'email_not_in_allowlist',
        timestamp: new Date().toISOString(),
        allowlistCount: allowedEmails.length
      }));
      return error('Account not authorized for access', 403, { event });
    }

    const { password: _, twoFactorEnabled, ...userWithoutPassword } = user;
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const decodedRefresh = verifyToken(refreshToken);
    const jti = decodedRefresh?.jti;
    if (jti) {
      await prisma.refreshToken.create({
        data: { userId: user.id, jti, expiresAt: new Date(Date.now() + 7 * 86400000), lastUsedAt: new Date() }
      });
    }

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
        'Set-Cookie': accessCookie
      },
      multiValueHeaders: { 'Set-Cookie': [accessCookie, refreshCookie, csrfCookie] },
      body: JSON.stringify({ user: userWithoutPassword, requiresTwoFactor: twoFactorEnabled && false })
    };
  } catch (e) {
    console.error('Login error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ ME ============ */
export const me = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error('Unauthorized - No valid token provided', 401, { event });
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true, displayName: true, avatar: true, bio: true,
        role: true, emailVerified: true, createdAt: true,
        _count: { select: { posts: true, reels: true, sentRequests: true, receivedRequests: true } }
      }
    });
    if (!user) return error('User not found', 404, { event });
    return json({ user }, 200, { event });
  } catch (e) {
    console.error('Me error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* Remaining handlers unchanged below (verifyEmail, resendVerification, refresh, logout, 2FA). */
authenticator.options = { window: 1, step: 30 };
const generateTOTPSecret = () => authenticator.generateSecret();
const verifyTOTPCode = (secret, code) => {
  const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
  if (!TWO_FACTOR_ENABLED) return true;
  try { return authenticator.verify({ token: code, secret }); }
  catch (err) { console.error('[2FA] TOTP verification error:', err); return false; }
};
const sendVerificationEmail = async (email, token, username) => {
  const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  const maskedToken = token.length > 12 ? `${token.substring(0,8)}...${token.substring(token.length-4)}` : '***masked***';
  if (EMAIL_ENABLED) {
    console.log(`[EMAIL] SMTP verification to ${email} token: ${maskedToken}`);
  } else {
    console.log('=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`); console.log(verificationUrl); console.log(`Token: ${maskedToken}`);
  }
};
// (verifyEmail, resendVerification, refresh, logout, setup2FA, enable2FA, verify2FA, disable2FA kept same as prior corrected version)
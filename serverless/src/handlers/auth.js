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

    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const ENABLE_REGISTRATION = process.env.ENABLE_REGISTRATION === 'true';
    const normalizedEmail = email.toLowerCase().trim();

    if (!ENABLE_REGISTRATION) {
      if (allowedEmails.length === 0 || !allowedEmails.includes(normalizedEmail)) {
        console.log(`Registration blocked: ENABLE_REGISTRATION=false; ${normalizedEmail} not allowlisted`);
        return error('Registration is currently disabled', 403, { event });
      }
    } else if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
      console.log(`Registration blocked: ${normalizedEmail} not in allowlist`);
      return error('Registration not permitted for this email address', 403, { event });
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

    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allowedEmails.length > 0 && !allowedEmails.includes(user.email.toLowerCase()))
      return error('Account not authorized for access', 403, { event });

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

/* ============ VERIFY EMAIL ============ */
export const verifyEmail = async (event) => {
  let parsed;
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { console.error('[VERIFY_EMAIL] Parse error raw body:', event.body); return error('Invalid JSON payload', 400, { event }); }

  const { token } = parsed;
  if (!token) return error('token is required', 400, { event });

  try {
    const prisma = getPrisma();
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verificationToken) return error('Invalid or expired verification token', 400, { event });
    if (new Date() > verificationToken.expiresAt) {
      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      return error('Verification token has expired', 400, { event });
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true }
    });

    await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });

    return json({ message: 'Email verified successfully' }, 200, { event });
  } catch (e) {
    console.error('Verify email error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ RESEND VERIFICATION ============ */
export const resendVerification = async (event) => {
  let parsed;
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { console.error('[RESEND_VERIFICATION] Parse error raw body:', event.body); return error('Invalid JSON payload', 400, { event }); }

  const { email } = parsed;
  if (!email) return error('email is required', 400, { event });

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { normalizedEmail: email.toLowerCase() }] }
    });

    if (!user) return error('User not found', 404, { event });
    if (user.emailVerified) return error('Email already verified', 400, { event });

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token: verificationToken, expiresAt: new Date(Date.now() + 86400000) }
    });

    await sendVerificationEmail(user.email, verificationToken, user.username);

    return json({ message: 'Verification email sent' }, 200, { event });
  } catch (e) {
    console.error('Resend verification error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ REFRESH ============ */
export const refresh = async (event) => {
  try {
    const refreshToken = extractToken(event, 'refresh');
    if (!refreshToken) return error('Refresh token required', 401, { event });

    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') return error('Invalid refresh token', 401, { event });

    const prisma = getPrisma();
    const storedToken = await prisma.refreshToken.findUnique({
      where: { jti: decoded.jti }
    });

    if (!storedToken || storedToken.invalidatedAt) return error('Refresh token has been revoked', 401, { event });
    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { invalidatedAt: new Date() }
      });
      return error('Refresh token has expired', 401, { event });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, displayName: true, avatar: true, role: true, emailVerified: true }
    });

    if (!user) return error('User not found', 404, { event });

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsedAt: new Date(), invalidatedAt: new Date() }
    });

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    const newDecoded = verifyToken(newRefreshToken);
    const newJti = newDecoded?.jti;

    if (newJti) {
      await prisma.refreshToken.create({
        data: { userId: user.id, jti: newJti, expiresAt: new Date(Date.now() + 7 * 86400000), lastUsedAt: new Date() }
      });
    }

    const accessCookie = generateAccessTokenCookie(newAccessToken);
    const refreshCookie = generateRefreshTokenCookie(newRefreshToken);
    const cors = getCorsHeaders(event);

    return {
      statusCode: 200,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'Set-Cookie': accessCookie
      },
      multiValueHeaders: { 'Set-Cookie': [accessCookie, refreshCookie] },
      body: JSON.stringify({ user, message: 'Token refreshed successfully' })
    };
  } catch (e) {
    console.error('Refresh error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ LOGOUT ============ */
export const logout = async (event) => {
  try {
    const refreshToken = extractToken(event, 'refresh');
    if (refreshToken) {
      const decoded = verifyToken(refreshToken);
      if (decoded && decoded.jti) {
        const prisma = getPrisma();
        await prisma.refreshToken.updateMany({
          where: { jti: decoded.jti },
          data: { invalidatedAt: new Date() }
        });
      }
    }

    const clearCookies = generateClearCookieHeaders();
    const csrfClearCookie = clearCsrfCookie();
    const cors = getCorsHeaders(event);

    return {
      statusCode: 200,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'Set-Cookie': clearCookies[0]
      },
      multiValueHeaders: { 'Set-Cookie': [...clearCookies, csrfClearCookie] },
      body: JSON.stringify({ message: 'Logged out successfully' })
    };
  } catch (e) {
    console.error('Logout error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ 2FA SETUP ============ */
authenticator.options = { window: 1, step: 30 };
const generateTOTPSecret = () => authenticator.generateSecret();
const verifyTOTPCode = (secret, code) => {
  const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
  if (!TWO_FACTOR_ENABLED) return true;
  try { return authenticator.verify({ token: code, secret }); }
  catch (err) { console.error('[2FA] TOTP verification error:', err); return false; }
};

export const setup2FA = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error('Unauthorized', 401, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, twoFactorEnabled: true }
    });

    if (!user) return error('User not found', 404, { event });
    if (user.twoFactorEnabled) return error('2FA already enabled', 400, { event });

    const secret = generateTOTPSecret();
    const otpauth = authenticator.keyuri(user.email, 'Valine', secret);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });

    return json({ secret, otpauth, message: 'Scan QR code with authenticator app' }, 200, { event });
  } catch (e) {
    console.error('Setup 2FA error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const enable2FA = async (event) => {
  let parsed;
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { console.error('[ENABLE_2FA] Parse error raw body:', event.body); return error('Invalid JSON payload', 400, { event }); }

  const { code } = parsed;
  if (!code) return error('code is required', 400, { event });

  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error('Unauthorized', 401, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user) return error('User not found', 404, { event });
    if (user.twoFactorEnabled) return error('2FA already enabled', 400, { event });
    if (!user.twoFactorSecret) return error('2FA not set up. Call setup2FA first', 400, { event });

    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) return error('Invalid verification code', 400, { event });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    return json({ message: '2FA enabled successfully' }, 200, { event });
  } catch (e) {
    console.error('Enable 2FA error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const verify2FA = async (event) => {
  let parsed;
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { console.error('[VERIFY_2FA] Parse error raw body:', event.body); return error('Invalid JSON payload', 400, { event }); }

  const { email, code } = parsed;
  if (!email || !code) return error('email and code are required', 400, { event });

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { normalizedEmail: email.toLowerCase() }] },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user) return error('User not found', 404, { event });
    if (!user.twoFactorEnabled) return error('2FA not enabled for this user', 400, { event });

    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) return error('Invalid verification code', 401, { event });

    return json({ message: '2FA verification successful', verified: true }, 200, { event });
  } catch (e) {
    console.error('Verify 2FA error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

export const disable2FA = async (event) => {
  let parsed;
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { console.error('[DISABLE_2FA] Parse error raw body:', event.body); return error('Invalid JSON payload', 400, { event }); }

  const { code } = parsed;
  if (!code) return error('code is required', 400, { event });

  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error('Unauthorized', 401, { event });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user) return error('User not found', 404, { event });
    if (!user.twoFactorEnabled) return error('2FA is not enabled', 400, { event });

    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    if (!isValid) return error('Invalid verification code', 401, { event });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });

    return json({ message: '2FA disabled successfully' }, 200, { event });
  } catch (e) {
    console.error('Disable 2FA error:', e);
    return error('Server error: ' + e.message, 500, { event });
  }
};

/* ============ HELPER FUNCTIONS ============ */
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
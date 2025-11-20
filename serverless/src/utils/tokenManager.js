/**
 * Token management utilities for JWT access and refresh tokens
 * Implements Phase C: HttpOnly Cookie Auth + Refresh
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Token expiry configuration
const ACCESS_TOKEN_EXPIRES_IN = '30m'; // 30 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Helper to check if we're in production mode
 * Re-evaluated each time to allow tests to change NODE_ENV
 */
const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Helper to get cookie domain
 * Re-evaluated each time to allow tests to change COOKIE_DOMAIN
 */
const getCookieDomain = () => process.env.COOKIE_DOMAIN || undefined;

/**
 * Generate access token (short-lived)
 * @param {string} userId - User ID to encode
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRES_IN 
  });
};

/**
 * Generate refresh token (long-lived)
 * @param {string} userId - User ID to encode
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  // Add random jti (JWT ID) for token rotation tracking
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ userId, type: 'refresh', jti }, JWT_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRES_IN 
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded token payload or null if invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Extract token from cookies or Authorization header
 * @param {object} event - Lambda event object
 * @param {string} tokenType - 'access' or 'refresh'
 * @returns {string|null} Token string or null
 */
export const extractToken = (event, tokenType = 'access') => {
  // Try cookies first (preferred method)
  const cookieName = tokenType === 'access' ? 'access_token' : 'refresh_token';
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  
  if (cookies[cookieName]) {
    return cookies[cookieName];
  }
  
  // Fallback to Authorization header for access tokens (for tooling/testing)
  if (tokenType === 'access') {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  
  return null;
};

/**
 * Parse cookie header string into object
 * @param {string} cookieHeader - Cookie header string
 * @returns {object} Parsed cookies as key-value pairs
 */
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  
  return cookies;
};

/**
 * Generate Set-Cookie header for access token
 * @param {string} token - JWT access token
 * @returns {string} Set-Cookie header value
 */
export const generateAccessTokenCookie = (token) => {
  const maxAge = 30 * 60; // 30 minutes in seconds
  
  // Use SameSite=Strict in production for maximum CSRF protection
  // Use SameSite=Lax in development for easier testing
  const sameSite = isProduction() ? 'Strict' : 'Lax';
  
  let cookie = `access_token=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAge}`;
  
  if (isProduction()) {
    cookie += '; Secure';
  }
  
  const cookieDomain = getCookieDomain();
  if (cookieDomain) {
    cookie += `; Domain=${cookieDomain}`;
  }
  
  return cookie;
};

/**
 * Generate Set-Cookie header for refresh token
 * @param {string} token - JWT refresh token
 * @returns {string} Set-Cookie header value
 */
export const generateRefreshTokenCookie = (token) => {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  
  // Use SameSite=Strict in production for maximum CSRF protection
  // Use SameSite=Lax in development for easier testing
  const sameSite = isProduction() ? 'Strict' : 'Lax';
  
  let cookie = `refresh_token=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAge}`;
  
  if (isProduction()) {
    cookie += '; Secure';
  }
  
  const cookieDomain = getCookieDomain();
  if (cookieDomain) {
    cookie += `; Domain=${cookieDomain}`;
  }
  
  return cookie;
};

/**
 * Generate Set-Cookie headers to clear auth cookies
 * @returns {string[]} Array of Set-Cookie headers to clear cookies
 */
export const generateClearCookieHeaders = () => {
  const baseCookie = 'Path=/; SameSite=Lax; Max-Age=0';
  const secureSuffix = isProduction() ? '; Secure' : '';
  const cookieDomain = getCookieDomain();
  const domainSuffix = cookieDomain ? `; Domain=${cookieDomain}` : '';
  
  return [
    `access_token=; ${baseCookie}${secureSuffix}${domainSuffix}`,
    `refresh_token=; ${baseCookie}${secureSuffix}${domainSuffix}`
  ];
};

/**
 * Get user ID from event (cookie or header)
 * @param {object} event - Lambda event object
 * @returns {string|null} User ID or null
 */
export const getUserIdFromEvent = (event) => {
  const token = extractToken(event, 'access');
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'access') return null;
  
  return decoded.userId || null;
};

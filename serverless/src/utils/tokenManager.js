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
 * Validate JWT secret on startup - fail-fast for default secrets in production
 */
function validateJwtSecret() {
  if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-secret-key-change-in-production') {
    const errorLog = {
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      event: 'secret_misconfiguration',
      level: 'error',
      details: {
        type: 'jwt_secret_invalid',
        environment: process.env.NODE_ENV,
        message: 'Default JWT secret detected in production environment'
      }
    };
    console.error(JSON.stringify(errorLog));
    throw new Error('SECURITY ERROR: Default JWT_SECRET must not be used in production. Set a secure JWT_SECRET environment variable.');
  }
}

// Run validation on module load
validateJwtSecret();

/**
 * Helper to check if we're in production mode
 * Re-evaluated each time to allow tests to change NODE_ENV
 */
const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Normalize cookie domain - trim, lowercase, ensure single leading dot
 * @param {string} domain - Raw domain value
 * @returns {string|undefined} Normalized domain or undefined
 */
function normalizeCookieDomain(domain) {
  if (!domain) return undefined;
  
  let normalized = domain.trim().toLowerCase();
  
  // Remove all leading dots first
  while (normalized.startsWith('.')) {
    normalized = normalized.substring(1);
  }
  
  // Add single leading dot if it's a domain (not localhost or IP)
  if (normalized && !normalized.match(/^localhost$|^\d+\.\d+\.\d+\.\d+$/)) {
    normalized = '.' + normalized;
  }
  
  return normalized || undefined;
}

/**
 * Helper to get cookie domain
 * Re-evaluated each time to allow tests to change COOKIE_DOMAIN
 */
const getCookieDomain = () => normalizeCookieDomain(process.env.COOKIE_DOMAIN);

/**
 * Generate access token (short-lived)
 * @param {string} userId - User ID to encode
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ sub: userId, type: 'access' }, JWT_SECRET, { 
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
  return jwt.sign({ sub: userId, type: 'refresh', jti }, JWT_SECRET, { 
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
 * Supports both HTTP API v2 (event.cookies array) and traditional (event.headers.cookie) formats
 * @param {object} event - Lambda event object
 * @param {string} tokenType - 'access' or 'refresh'
 * @returns {string|null} Token string or null
 */
export const extractToken = (event, tokenType = 'access') => {
  const cookieName = tokenType === 'access' ? 'access_token' : 'refresh_token';
  
  // HTTP API v2: Try event.cookies array first (AWS parses cookies into array)
  // Format: ["access_token=abc123", "refresh_token=xyz789"]
  if (Array.isArray(event.cookies) && event.cookies.length > 0) {
    for (const cookie of event.cookies) {
      if (cookie.startsWith(`${cookieName}=`)) {
        return cookie.substring(cookieName.length + 1);
      }
    }
  }
  
  // Traditional format: Parse from headers.cookie string
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
  
  // Use SameSite=None for cross-site requests (CloudFront frontend + API Gateway backend)
  // SameSite=None requires Secure flag
  const sameSite = isProduction() ? 'None' : 'Lax';
  
  let cookie = `access_token=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAge}`;
  
  // Secure flag is required for SameSite=None, always include in production
  if (isProduction()) {
    cookie += '; Secure';
  }
  
  // Don't set Domain - let browser set it to the API domain for cross-site cookies
  
  return cookie;
};

/**
 * Generate Set-Cookie header for refresh token
 * @param {string} token - JWT refresh token
 * @returns {string} Set-Cookie header value
 */
export const generateRefreshTokenCookie = (token) => {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  
  // Use SameSite=None for cross-site requests (CloudFront frontend + API Gateway backend)
  // SameSite=None requires Secure flag
  const sameSite = isProduction() ? 'None' : 'Lax';
  
  let cookie = `refresh_token=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAge}`;
  
  // Secure flag is required for SameSite=None, always include in production
  if (isProduction()) {
    cookie += '; Secure';
  }
  
  // Don't set Domain - let browser set it to the API domain for cross-site cookies
  
  return cookie;
};

/**
 * Generate Set-Cookie headers to clear auth cookies
 * @returns {string[]} Array of Set-Cookie headers to clear cookies
 */
export const generateClearCookieHeaders = () => {
  // Use SameSite=None for cross-site requests (CloudFront frontend + API Gateway backend)
  const sameSite = isProduction() ? 'None' : 'Lax';
  const baseCookie = `Path=/; SameSite=${sameSite}; Max-Age=0`;
  // Secure flag is required for SameSite=None, always include in production
  const secureSuffix = isProduction() ? '; Secure' : '';
  // Don't set Domain - let browser set it to the API domain for cross-site cookies
  
  return [
    `access_token=; ${baseCookie}${secureSuffix}`,
    `refresh_token=; ${baseCookie}${secureSuffix}`
  ];
};

/**
 * Extract user ID from decoded token payload with backward compatibility
 * Supports both new 'sub' claim (post PR#253) and legacy 'userId' claim
 * @param {object} tokenPayload - Decoded JWT payload
 * @returns {string|null} User ID or null
 */
export const getUserIdFromDecoded = (tokenPayload) => {
  if (!tokenPayload) return null;
  // Prefer standard 'sub' claim, fallback to legacy 'userId' for compatibility
  return tokenPayload.sub || tokenPayload.userId || null;
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
  
  return getUserIdFromDecoded(decoded);
};

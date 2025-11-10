/**
 * JWT Token Utilities
 * Handles token generation, verification, and validation
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT Secret - MUST be set in environment
const JWT_SECRET = process.env.AUTH_JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Verification token settings
const VERIFICATION_TOKEN_LENGTH = 32; // bytes (64 chars hex)
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

/**
 * Ensure JWT secret is configured
 */
function ensureJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET environment variable is required but not set');
  }
  
  if (JWT_SECRET.length < 32) {
    console.warn('WARNING: AUTH_JWT_SECRET should be at least 256 bits (32 characters) for security');
  }
}

/**
 * Generate a JWT access token for a user
 * @param {object} user - User object with id and email
 * @returns {string} - JWT token
 */
export function generateAccessToken(user) {
  ensureJwtSecret();
  
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'access',
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: 'project-valine',
    subject: user.id,
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function verifyAccessToken(token) {
  ensureJwtSecret();
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'project-valine',
    });
    
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Generate a random verification token
 * @returns {object} - { token: string, expiresAt: Date }
 */
export function generateVerificationToken() {
  const token = crypto.randomBytes(VERIFICATION_TOKEN_LENGTH).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);
  
  return { token, expiresAt };
}

/**
 * Check if a verification token has expired
 * @param {Date} expiresAt - Expiration timestamp
 * @returns {boolean} - True if expired
 */
export function isTokenExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null if invalid format
 */
export function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7).trim();
}

/**
 * Middleware to require authentication
 * Validates JWT and attaches user info to request
 */
export function requireAuth(req, res, next) {
  const authHeader = req.header('authorization') || '';
  const token = extractBearerToken(authHeader);
  
  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
      hint: 'Include Authorization header with Bearer token',
    });
  }
  
  const decoded = verifyAccessToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
  
  // Attach user info to request
  req.userId = decoded.userId;
  req.userEmail = decoded.email;
  
  next();
}

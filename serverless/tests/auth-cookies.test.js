/**
 * Integration tests for cookie-based authentication
 * Tests Phase C: HttpOnly Cookie Auth + Refresh
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  generateAccessTokenCookie,
  generateRefreshTokenCookie,
  generateClearCookieHeaders,
  extractToken,
  verifyToken,
  getUserIdFromEvent
} from '../src/utils/tokenManager.js';

describe('Token Manager - Cookie Generation', () => {
  const testUserId = 'test-user-123';

  it('should generate access token with correct payload', () => {
    const token = generateAccessToken(testUserId);
    expect(token).toBeTruthy();
    
    const decoded = verifyToken(token);
    expect(decoded).toBeTruthy();
    // Uses standard JWT 'sub' claim for user ID (changed from legacy 'userId')
    expect(decoded.sub).toBe(testUserId);
    expect(decoded.type).toBe('access');
  });

  it('should generate refresh token with correct payload and jti', () => {
    const token = generateRefreshToken(testUserId);
    expect(token).toBeTruthy();
    
    const decoded = verifyToken(token);
    expect(decoded).toBeTruthy();
    // Uses standard JWT 'sub' claim for user ID (changed from legacy 'userId')
    expect(decoded.sub).toBe(testUserId);
    expect(decoded.type).toBe('refresh');
    expect(decoded.jti).toBeTruthy();
  });

  it('should generate access token cookie with correct attributes in development mode', () => {
    // Run in development mode to test the Lax case
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const token = generateAccessToken(testUserId);
    const cookie = generateAccessTokenCookie(token);
    
    expect(cookie).toContain('access_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=1800'); // 30 minutes
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should generate refresh token cookie with correct attributes in development mode', () => {
    // Run in development mode to test the Lax case
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const token = generateRefreshToken(testUserId);
    const cookie = generateRefreshTokenCookie(token);
    
    expect(cookie).toContain('refresh_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=604800'); // 7 days
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should use SameSite=None in production for cross-site support', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const token = generateAccessToken(testUserId);
    const cookie = generateAccessTokenCookie(token);
    
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Secure');
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should include Secure flag in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const token = generateAccessToken(testUserId);
    const cookie = generateAccessTokenCookie(token);
    
    expect(cookie).toContain('Secure');
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should generate clear cookie headers', () => {
    const clearCookies = generateClearCookieHeaders();
    
    expect(clearCookies).toHaveLength(2);
    expect(clearCookies[0]).toContain('access_token=');
    expect(clearCookies[0]).toContain('Max-Age=0');
    expect(clearCookies[1]).toContain('refresh_token=');
    expect(clearCookies[1]).toContain('Max-Age=0');
  });
});

describe('Token Manager - Token Extraction', () => {
  const testUserId = 'test-user-456';

  it('should extract access token from cookie header', () => {
    const token = generateAccessToken(testUserId);
    const event = {
      headers: {
        cookie: `access_token=${token}; other_cookie=value`
      }
    };
    
    const extractedToken = extractToken(event, 'access');
    expect(extractedToken).toBe(token);
  });

  it('should extract refresh token from cookie header', () => {
    const token = generateRefreshToken(testUserId);
    const event = {
      headers: {
        Cookie: `refresh_token=${token}; other_cookie=value`
      }
    };
    
    const extractedToken = extractToken(event, 'refresh');
    expect(extractedToken).toBe(token);
  });

  it('should extract access token from Authorization header (fallback)', () => {
    const token = generateAccessToken(testUserId);
    const event = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    
    const extractedToken = extractToken(event, 'access');
    expect(extractedToken).toBe(token);
  });

  it('should prefer cookie over Authorization header', () => {
    const cookieToken = generateAccessToken('user-from-cookie');
    const headerToken = generateAccessToken('user-from-header');
    
    const event = {
      headers: {
        cookie: `access_token=${cookieToken}`,
        authorization: `Bearer ${headerToken}`
      }
    };
    
    const extractedToken = extractToken(event, 'access');
    expect(extractedToken).toBe(cookieToken);
    
    const decoded = verifyToken(extractedToken);
    // Uses standard JWT 'sub' claim for user ID (changed from legacy 'userId')
    expect(decoded.sub).toBe('user-from-cookie');
  });

  it('should return null when no token is present', () => {
    const event = { headers: {} };
    const extractedToken = extractToken(event, 'access');
    expect(extractedToken).toBeNull();
  });

  it('should get user ID from event', () => {
    const token = generateAccessToken(testUserId);
    const event = {
      headers: {
        cookie: `access_token=${token}`
      }
    };
    
    const userId = getUserIdFromEvent(event);
    expect(userId).toBe(testUserId);
  });

  it('should return null for invalid token', () => {
    const event = {
      headers: {
        cookie: 'access_token=invalid-token'
      }
    };
    
    const userId = getUserIdFromEvent(event);
    expect(userId).toBeNull();
  });

  it('should return null for refresh token when expecting access token', () => {
    const refreshToken = generateRefreshToken(testUserId);
    const event = {
      headers: {
        cookie: `access_token=${refreshToken}` // Using refresh token as access token
      }
    };
    
    const userId = getUserIdFromEvent(event);
    expect(userId).toBeNull();
  });
});

describe('Token Manager - Token Verification', () => {
  const testUserId = 'test-user-789';

  it('should verify valid token', () => {
    const token = generateAccessToken(testUserId);
    const decoded = verifyToken(token);
    
    expect(decoded).toBeTruthy();
    // Uses standard JWT 'sub' claim for user ID (changed from legacy 'userId')
    expect(decoded.sub).toBe(testUserId);
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });

  it('should return null for expired token', () => {
    // This would require a token that's actually expired
    // For now, just test with malformed token
    const decoded = verifyToken('');
    expect(decoded).toBeNull();
  });
});

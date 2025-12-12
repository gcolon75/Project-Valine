/**
 * Tests for API Gateway HTTP API v2 cookie extraction
 * Validates support for both event.cookies[] and event.headers.cookie
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  extractToken,
  verifyToken,
  getUserIdFromEvent,
  getCookieHeader
} from '../src/utils/tokenManager.js';

describe('Cookie Extraction - HTTP API v2 Support', () => {
  const testUserId = 'test-user-v2-123';
  let accessToken;
  let refreshToken;

  beforeEach(() => {
    accessToken = generateAccessToken(testUserId);
    refreshToken = generateRefreshToken(testUserId);
  });

  describe('getCookieHeader helper', () => {
    it('should extract from event.headers.cookie (REST API format)', () => {
      const event = {
        headers: {
          cookie: 'access_token=abc123; refresh_token=xyz789'
        }
      };
      
      const result = getCookieHeader(event);
      expect(result).toBe('access_token=abc123; refresh_token=xyz789');
    });

    it('should extract from event.headers.Cookie (case variation)', () => {
      const event = {
        headers: {
          Cookie: 'access_token=abc123'
        }
      };
      
      const result = getCookieHeader(event);
      expect(result).toBe('access_token=abc123');
    });

    it('should extract from event.cookies array (HTTP API v2 format)', () => {
      const event = {
        cookies: [
          'access_token=abc123',
          'refresh_token=xyz789'
        ]
      };
      
      const result = getCookieHeader(event);
      expect(result).toBe('access_token=abc123; refresh_token=xyz789');
    });

    it('should prefer headers.cookie over cookies array', () => {
      const event = {
        headers: {
          cookie: 'access_token=from_header'
        },
        cookies: [
          'access_token=from_array'
        ]
      };
      
      const result = getCookieHeader(event);
      expect(result).toBe('access_token=from_header');
    });

    it('should return empty string when no cookies present', () => {
      const event = {
        headers: {}
      };
      
      const result = getCookieHeader(event);
      expect(result).toBe('');
    });

    it('should handle empty cookies array', () => {
      const event = {
        cookies: []
      };
      
      const result = getCookieHeader(event);
      expect(result).toBe('');
    });
  });

  describe('extractToken - event.cookies[] support', () => {
    it('should extract access token from event.cookies array', () => {
      const event = {
        cookies: [
          `access_token=${accessToken}`,
          `refresh_token=${refreshToken}`
        ]
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
      
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(testUserId);
    });

    it('should extract refresh token from event.cookies array', () => {
      const event = {
        cookies: [
          `access_token=${accessToken}`,
          `refresh_token=${refreshToken}`
        ]
      };
      
      const token = extractToken(event, 'refresh');
      expect(token).toBe(refreshToken);
      
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(testUserId);
    });

    it('should extract token from event.cookies when only one cookie present', () => {
      const event = {
        cookies: [
          `access_token=${accessToken}`
        ]
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
    });

    it('should handle tokens with equals signs (base64)', () => {
      // Base64 tokens often have = padding
      const tokenWithEquals = accessToken + '==';
      const event = {
        cookies: [
          `access_token=${tokenWithEquals}`
        ]
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(tokenWithEquals);
    });
  });

  describe('extractToken - event.headers.cookie support (backward compatibility)', () => {
    it('should extract access token from event.headers.cookie', () => {
      const event = {
        headers: {
          cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
      
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(testUserId);
    });

    it('should extract refresh token from event.headers.cookie', () => {
      const event = {
        headers: {
          cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`
        }
      };
      
      const token = extractToken(event, 'refresh');
      expect(token).toBe(refreshToken);
    });

    it('should extract from event.headers.Cookie (capital C)', () => {
      const event = {
        headers: {
          Cookie: `access_token=${accessToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
    });
  });

  describe('extractToken - Authorization header fallback', () => {
    it('should extract access token from Authorization header', () => {
      const event = {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
    });

    it('should extract from Authorization header (capital A)', () => {
      const event = {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
    });

    it('should NOT extract refresh token from Authorization header', () => {
      const event = {
        headers: {
          authorization: `Bearer ${refreshToken}`
        }
      };
      
      const token = extractToken(event, 'refresh');
      expect(token).toBeNull();
    });
  });

  describe('extractToken - priority order', () => {
    it('should prioritize event.cookies over event.headers.cookie', () => {
      const wrongToken = generateAccessToken('wrong-user');
      const event = {
        cookies: [
          `access_token=${accessToken}`
        ],
        headers: {
          cookie: `access_token=${wrongToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
      
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(testUserId);
    });

    it('should fall back to headers.cookie when cookies array is empty', () => {
      const event = {
        cookies: [],
        headers: {
          cookie: `access_token=${accessToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
    });

    it('should fall back to Authorization header when no cookies present', () => {
      const event = {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      };
      
      const token = extractToken(event, 'access');
      expect(token).toBe(accessToken);
    });
  });

  describe('getUserIdFromEvent - HTTP API v2', () => {
    it('should extract user ID from event with cookies array', () => {
      const event = {
        cookies: [
          `access_token=${accessToken}`
        ]
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(testUserId);
    });

    it('should extract user ID from event with headers.cookie', () => {
      const event = {
        headers: {
          cookie: `access_token=${accessToken}`
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(testUserId);
    });

    it('should extract user ID from Authorization header', () => {
      const event = {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(testUserId);
    });

    it('should return null when no token present', () => {
      const event = {
        headers: {}
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBeNull();
    });

    it('should return null when token is invalid', () => {
      const event = {
        cookies: [
          'access_token=invalid-token'
        ]
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBeNull();
    });

    it('should return null when token is refresh token (not access)', () => {
      const event = {
        cookies: [
          `access_token=${refreshToken}` // Wrong token type
        ]
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBeNull();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle CloudFront -> API Gateway HTTP API v2 request', () => {
      // CloudFront passes cookies to API Gateway v2 which parses them into array
      const event = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/auth/me'
          }
        },
        cookies: [
          `access_token=${accessToken}`,
          `refresh_token=${refreshToken}`,
          'session_id=some-session-id'
        ],
        headers: {
          origin: 'https://dkmxy676d3vgc.cloudfront.net',
          'user-agent': 'Mozilla/5.0...'
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(testUserId);
    });

    it('should handle REST API (ALB/API Gateway v1) request', () => {
      // Traditional REST API passes cookies as single header string
      const event = {
        httpMethod: 'GET',
        path: '/auth/me',
        headers: {
          cookie: `access_token=${accessToken}; refresh_token=${refreshToken}; session_id=some-session-id`,
          origin: 'https://example.com',
          'user-agent': 'Mozilla/5.0...'
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(testUserId);
    });

    it('should handle local development with Authorization header', () => {
      // Developers often use Authorization header for local testing
      const event = {
        httpMethod: 'GET',
        path: '/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
          origin: 'http://localhost:5173'
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(testUserId);
    });
  });
});

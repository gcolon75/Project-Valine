/**
 * Tests for cookie and CORS hardening
 * Verifies SameSite=Strict in production and CORS origin restrictions
 */

import { generateAccessTokenCookie, generateRefreshTokenCookie } from '../src/utils/tokenManager.js';
import { getCorsHeaders } from '../src/utils/headers.js';

describe('Cookie Hardening Tests', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCookieDomain = process.env.COOKIE_DOMAIN;

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    if (originalCookieDomain !== undefined) {
      process.env.COOKIE_DOMAIN = originalCookieDomain;
    } else {
      delete process.env.COOKIE_DOMAIN;
    }
  });

  describe('SameSite Cookie Attribute', () => {
    test('should use SameSite=Strict in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_DOMAIN;

      const token = 'fake-jwt-token';
      const cookie = generateAccessTokenCookie(token);

      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
    });

    test('should use SameSite=Lax in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.COOKIE_DOMAIN;

      const token = 'fake-jwt-token';
      const cookie = generateAccessTokenCookie(token);

      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Secure');
      expect(cookie).toContain('HttpOnly');
    });

    test('refresh token should use SameSite=Strict in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_DOMAIN;

      const token = 'fake-refresh-token';
      const cookie = generateRefreshTokenCookie(token);

      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
    });

    test('refresh token should use SameSite=Lax in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.COOKIE_DOMAIN;

      const token = 'fake-refresh-token';
      const cookie = generateRefreshTokenCookie(token);

      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Secure');
      expect(cookie).toContain('HttpOnly');
    });
  });

  describe('Secure Flag', () => {
    test('should include Secure flag in production', () => {
      process.env.NODE_ENV = 'production';

      const cookie = generateAccessTokenCookie('token');

      expect(cookie).toContain('Secure');
    });

    test('should NOT include Secure flag in development', () => {
      process.env.NODE_ENV = 'development';

      const cookie = generateAccessTokenCookie('token');

      expect(cookie).not.toContain('Secure');
    });
  });

  describe('Cookie Domain', () => {
    test('should include Domain attribute when COOKIE_DOMAIN is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_DOMAIN = '.example.com';

      const cookie = generateAccessTokenCookie('token');

      expect(cookie).toContain('Domain=.example.com');
    });

    test('should NOT include Domain attribute when COOKIE_DOMAIN is empty', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_DOMAIN;

      const cookie = generateAccessTokenCookie('token');

      expect(cookie).not.toContain('Domain=');
    });
  });

  describe('Cookie Path and HttpOnly', () => {
    test('should always include Path=/ and HttpOnly', () => {
      process.env.NODE_ENV = 'production';

      const cookie = generateAccessTokenCookie('token');

      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
    });
  });
});

describe('CORS Hardening Tests', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalFrontendUrl !== undefined) {
      process.env.FRONTEND_URL = originalFrontendUrl;
    } else {
      delete process.env.FRONTEND_URL;
    }
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Origin Validation', () => {
    test('should allow configured FRONTEND_URL', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://example.com'
        }
      };

      const headers = getCorsHeaders(event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    test('should allow CloudFront distribution in production', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://dkmxy676d3vgc.cloudfront.net'
        }
      };

      const headers = getCorsHeaders(event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://dkmxy676d3vgc.cloudfront.net');
    });

    test('should reject non-allowed origins', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://evil.com'
        }
      };

      const headers = getCorsHeaders(event);

      // Should default to FRONTEND_URL instead of evil origin
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    test('should allow localhost in development', () => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
      process.env.NODE_ENV = 'development';

      const event = {
        headers: {
          origin: 'http://localhost:3000'
        }
      };

      const headers = getCorsHeaders(event);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    test('should NOT allow localhost in production', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'http://localhost:3000'
        }
      };

      const headers = getCorsHeaders(event);

      // Should default to FRONTEND_URL, not localhost
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });
  });

  describe('CORS Headers', () => {
    test('should include all required CORS headers', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://example.com'
        }
      };

      const headers = getCorsHeaders(event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('X-CSRF-Token');
      expect(headers['Access-Control-Max-Age']).toBe('86400'); // 24 hours
    });

    test('should never use wildcard (*) origin', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://anywhere.com'
        }
      };

      const headers = getCorsHeaders(event);

      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });
  });
});

/**
 * Integration test guidance:
 * 
 * Manual testing for cookie flags:
 * 
 * 1. Set NODE_ENV=production
 * 2. Login via /auth/login
 * 3. Check response Set-Cookie headers:
 *    - access_token cookie should have: HttpOnly; Secure; SameSite=Strict
 *    - refresh_token cookie should have: HttpOnly; Secure; SameSite=Strict
 * 
 * 4. Set NODE_ENV=development
 * 5. Login via /auth/login
 * 6. Check response Set-Cookie headers:
 *    - access_token cookie should have: HttpOnly; SameSite=Lax (no Secure)
 *    - refresh_token cookie should have: HttpOnly; SameSite=Lax (no Secure)
 * 
 * Manual testing for CORS:
 * 
 * 1. Set FRONTEND_URL=https://example.com
 * 2. Make request with Origin: https://example.com
 *    - Should get Access-Control-Allow-Origin: https://example.com
 * 
 * 3. Make request with Origin: https://evil.com
 *    - Should get Access-Control-Allow-Origin: https://example.com (default, not evil)
 * 
 * 4. Verify wildcard (*) is never used in production
 */

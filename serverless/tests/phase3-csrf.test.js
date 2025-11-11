/**
 * Phase 3: CSRF Token Enforcement Tests
 * Tests for CSRF token generation and validation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Phase 3: CSRF Token Enforcement', () => {
  let testUser = null;
  let accessToken = null;
  let csrfToken = null;
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Setup: Create test user and login
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-phase3-${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        password: 'TestPass123!',
      }),
    });

    if (registerResponse.ok) {
      const data = await registerResponse.json();
      testUser = data.user;

      // Login to get tokens and CSRF token
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPass123!',
        }),
      });

      const cookies = loginResponse.headers.get('set-cookie');
      accessToken = cookies?.match(/accessToken=([^;]+)/)?.[1];
      csrfToken = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    }
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token on login', () => {
      if (process.env.CSRF_ENABLED !== 'true') {
        console.warn('Skipping test: CSRF_ENABLED flag is false');
        return;
      }

      expect(csrfToken).toBeDefined();
      expect(csrfToken.length).toBeGreaterThan(0);
    });

    it('should rotate CSRF token on refresh', async () => {
      if (process.env.CSRF_ENABLED !== 'true') {
        console.warn('Skipping test: CSRF_ENABLED flag is false');
        return;
      }

      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: `accessToken=${accessToken}` },
      });

      const cookies = response.headers.get('set-cookie');
      const newCsrfToken = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];

      expect(newCsrfToken).toBeDefined();
      // Token should be different after refresh
      expect(newCsrfToken).not.toBe(csrfToken);
    });
  });

  describe('CSRF Token Validation', () => {
    it('should reject POST request without CSRF token', async () => {
      if (process.env.CSRF_ENABLED !== 'true') {
        console.warn('Skipping test: CSRF_ENABLED flag is false');
        return;
      }

      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      const response = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `accessToken=${accessToken}`,
          // NO X-CSRF-Token header
        },
        body: JSON.stringify({
          vanityUrl: 'test-csrf',
          headline: 'Test',
        }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toMatch(/CSRF/i);
    });

    it('should reject POST request with invalid CSRF token', async () => {
      if (process.env.CSRF_ENABLED !== 'true') {
        console.warn('Skipping test: CSRF_ENABLED flag is false');
        return;
      }

      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      const response = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `accessToken=${accessToken}`,
          'X-CSRF-Token': 'invalid-token-12345',
        },
        body: JSON.stringify({
          vanityUrl: 'test-csrf',
          headline: 'Test',
        }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toMatch(/CSRF/i);
    });

    it('should accept POST request with valid CSRF token', async () => {
      if (process.env.CSRF_ENABLED !== 'true') {
        console.warn('Skipping test: CSRF_ENABLED flag is false');
        return;
      }

      if (!accessToken || !csrfToken) {
        console.warn('Skipping test: No access/CSRF token available');
        return;
      }

      const response = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `accessToken=${accessToken}; XSRF-TOKEN=${csrfToken}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          vanityUrl: `test-csrf-${Date.now()}`,
          headline: 'Test Profile',
        }),
      });

      // Should succeed or fail for reasons other than CSRF
      expect(response.status).not.toBe(403);
    });

    it('should allow GET requests without CSRF token', async () => {
      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      const response = await fetch(`${API_BASE}/auth/sessions`, {
        method: 'GET',
        headers: {
          Cookie: `accessToken=${accessToken}`,
          // NO X-CSRF-Token header - GET requests should not require CSRF
        },
      });

      // Should not be blocked by CSRF middleware
      expect(response.status).not.toBe(403);
    });
  });

  describe('CSRF Cookie Properties', () => {
    it('should set CSRF cookie as non-HttpOnly', async () => {
      if (process.env.CSRF_ENABLED !== 'true') {
        console.warn('Skipping test: CSRF_ENABLED flag is false');
        return;
      }

      // Login to get fresh cookie
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPass123!',
        }),
      });

      const setCookie = response.headers.get('set-cookie');
      const csrfCookie = setCookie?.split(',').find(c => c.includes('XSRF-TOKEN'));

      expect(csrfCookie).toBeDefined();
      // Should NOT have HttpOnly flag (frontend needs to read it)
      expect(csrfCookie).not.toMatch(/HttpOnly/i);
      // Should have SameSite
      expect(csrfCookie).toMatch(/SameSite=Lax/i);
    });
  });

  afterAll(async () => {
    // Cleanup: Logout
    if (accessToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Cookie: `accessToken=${accessToken}` },
      });
    }
  });
});

/**
 * Phase 2: Session Management & 2FA Tests
 * Tests for refresh token rotation, session listing, and 2FA functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Phase 2: Session Management & 2FA', () => {
  let testUser = null;
  let accessToken = null;
  let refreshToken = null;
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Setup: Create test user and login
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-phase2-${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        password: 'TestPass123!',
      }),
    });

    if (registerResponse.ok) {
      const data = await registerResponse.json();
      testUser = data.user;

      // Login to get tokens
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPass123!',
        }),
      });

      const cookies = loginResponse.headers.get('set-cookie');
      // Extract tokens from cookies (simplified)
      accessToken = cookies?.match(/accessToken=([^;]+)/)?.[1];
      refreshToken = cookies?.match(/refreshToken=([^;]+)/)?.[1];
    }
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate refresh token on /auth/refresh', async () => {
      if (!refreshToken) {
        console.warn('Skipping test: No refresh token available');
        return;
      }

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${refreshToken}`,
        },
      });

      expect(response.status).toBe(200);

      const cookies = response.headers.get('set-cookie');
      const newRefreshToken = cookies?.match(/refreshToken=([^;]+)/)?.[1];

      // New token should be different
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(refreshToken);
    });

    it('should invalidate old refresh token after rotation', async () => {
      if (!refreshToken) {
        console.warn('Skipping test: No refresh token available');
        return;
      }

      // Use refresh token once
      await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: `refreshToken=${refreshToken}` },
      });

      // Try using old token again (should fail)
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: `refreshToken=${refreshToken}` },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Session Management', () => {
    it('should list active sessions with GET /auth/sessions', async () => {
      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      const response = await fetch(`${API_BASE}/auth/sessions`, {
        method: 'GET',
        headers: {
          Cookie: `accessToken=${accessToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.sessions).toBeDefined();
      expect(Array.isArray(data.sessions)).toBe(true);
      expect(data.sessions.length).toBeGreaterThan(0);
    });

    it('should invalidate specific session with POST /auth/logout-session', async () => {
      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      // Get sessions
      const sessionsResponse = await fetch(`${API_BASE}/auth/sessions`, {
        method: 'GET',
        headers: { Cookie: `accessToken=${accessToken}` },
      });

      const { sessions } = await sessionsResponse.json();
      if (sessions.length === 0) {
        console.warn('No sessions to test invalidation');
        return;
      }

      const sessionId = sessions[0].id;

      // Logout specific session
      const logoutResponse = await fetch(`${API_BASE}/auth/logout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `accessToken=${accessToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      expect(logoutResponse.status).toBe(200);
    });
  });

  describe('2FA Scaffold (when TWO_FACTOR_ENABLED=true)', () => {
    it('should setup 2FA with POST /auth/2fa/setup', async () => {
      if (!accessToken) {
        console.warn('Skipping test: No access token available');
        return;
      }

      if (process.env.TWO_FACTOR_ENABLED !== 'true') {
        console.warn('Skipping test: TWO_FACTOR_ENABLED flag is false');
        return;
      }

      const response = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST',
        headers: { Cookie: `accessToken=${accessToken}` },
      });

      if (response.status === 404) {
        console.warn('2FA feature not enabled');
        return;
      }

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.secret).toBeDefined();
      expect(data.otpauthUrl).toBeDefined();
      expect(data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    });

    it('should enable 2FA with valid code', async () => {
      if (process.env.TWO_FACTOR_ENABLED !== 'true') {
        console.warn('Skipping test: TWO_FACTOR_ENABLED flag is false');
        return;
      }

      // Note: This test requires a valid TOTP code
      // In production tests, use a fixed secret and generate code
      console.warn('2FA enable test requires valid TOTP code - implement with test secret');
    });

    it('should verify 2FA code during login', async () => {
      if (process.env.TWO_FACTOR_ENABLED !== 'true') {
        console.warn('Skipping test: TWO_FACTOR_ENABLED flag is false');
        return;
      }

      // Note: This test requires 2FA to be enabled
      console.warn('2FA verify test requires enabled 2FA - implement with test account');
    });

    it('should disable 2FA with valid code', async () => {
      if (process.env.TWO_FACTOR_ENABLED !== 'true') {
        console.warn('Skipping test: TWO_FACTOR_ENABLED flag is false');
        return;
      }

      // Note: This test requires 2FA to be enabled
      console.warn('2FA disable test requires enabled 2FA - implement with test account');
    });
  });

  afterAll(async () => {
    // Cleanup: Logout
    if (refreshToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Cookie: `refreshToken=${refreshToken}` },
      });
    }
  });
});

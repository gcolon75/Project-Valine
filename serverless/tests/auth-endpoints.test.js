/**
 * Integration tests for authentication endpoints with cookies
 * Tests login, refresh, and logout flows
 */

import { describe, it, expect } from '@jest/globals';
import { login, refresh, logout } from '../src/handlers/auth.js';
import { generateAccessToken, generateRefreshToken, generateAccessTokenCookie, generateRefreshTokenCookie } from '../src/utils/tokenManager.js';

// Mock database - in real tests this would use a test database
const mockUsers = new Map();
let mockUserId = 'test-user-123';

// Mock Prisma
jest.mock('../src/db/client.js', () => ({
  getPrisma: () => ({
    user: {
      findFirst: async ({ where }) => {
        const user = Array.from(mockUsers.values()).find(u => u.email === where.email);
        return user || null;
      },
      findUnique: async ({ where }) => {
        return mockUsers.get(where.id) || null;
      }
    }
  })
}));

describe('Auth Endpoints - Login with Cookies', () => {
  it('should set HttpOnly cookies on successful login', async () => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    // Setup mock user with hashed password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    mockUsers.set(mockUserId, {
      id: mockUserId,
      email: testEmail,
      password: hashedPassword,
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.png',
      role: 'USER',
      emailVerified: true,
      createdAt: new Date()
    });
    
    const event = {
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      headers: {}
    };
    
    const response = await login(event);
    
    expect(response.statusCode).toBe(200);
    expect(response.multiValueHeaders['Set-Cookie']).toBeDefined();
    expect(response.multiValueHeaders['Set-Cookie'].length).toBe(2);
    
    // Check access token cookie
    const accessCookie = response.multiValueHeaders['Set-Cookie'][0];
    expect(accessCookie).toContain('access_token=');
    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).toContain('SameSite=Lax');
    
    // Check refresh token cookie
    const refreshCookie = response.multiValueHeaders['Set-Cookie'][1];
    expect(refreshCookie).toContain('refresh_token=');
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
    
    // Verify response body doesn't contain token
    const body = JSON.parse(response.body);
    expect(body.token).toBeUndefined();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail);
    expect(body.user.password).toBeUndefined(); // Password should not be in response
  });

  it('should return 401 for invalid credentials', async () => {
    const event = {
      body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpass' }),
      headers: {}
    };
    
    const response = await login(event);
    
    expect(response.statusCode).toBe(401);
    expect(response.multiValueHeaders?.['Set-Cookie']).toBeUndefined();
  });

  it('should return 400 for missing credentials', async () => {
    const event = {
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: {}
    };
    
    const response = await login(event);
    
    expect(response.statusCode).toBe(400);
  });
});

describe('Auth Endpoints - Refresh Token', () => {
  it('should rotate tokens on refresh', async () => {
    const refreshToken = generateRefreshToken(mockUserId);
    
    // Ensure mock user exists
    if (!mockUsers.has(mockUserId)) {
      mockUsers.set(mockUserId, {
        id: mockUserId,
        email: 'test@example.com',
        username: 'testuser'
      });
    }
    
    const event = {
      headers: {
        cookie: `refresh_token=${refreshToken}`
      },
      body: '{}'
    };
    
    const response = await refresh(event);
    
    expect(response.statusCode).toBe(200);
    expect(response.multiValueHeaders['Set-Cookie']).toBeDefined();
    expect(response.multiValueHeaders['Set-Cookie'].length).toBe(2);
    
    // Both access and refresh tokens should be new
    const accessCookie = response.multiValueHeaders['Set-Cookie'][0];
    const newRefreshCookie = response.multiValueHeaders['Set-Cookie'][1];
    
    expect(accessCookie).toContain('access_token=');
    expect(newRefreshCookie).toContain('refresh_token=');
    
    // New refresh token should be different from old one
    const oldCookieValue = `refresh_token=${refreshToken}`;
    expect(newRefreshCookie).not.toBe(oldCookieValue);
  });

  it('should return 401 for missing refresh token', async () => {
    const event = {
      headers: {},
      body: '{}'
    };
    
    const response = await refresh(event);
    
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Refresh token required');
  });

  it('should return 401 for invalid refresh token', async () => {
    const event = {
      headers: {
        cookie: 'refresh_token=invalid.token.here'
      },
      body: '{}'
    };
    
    const response = await refresh(event);
    
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for access token used as refresh token', async () => {
    const accessToken = generateAccessToken(mockUserId);
    
    const event = {
      headers: {
        cookie: `refresh_token=${accessToken}` // Using access token instead of refresh
      },
      body: '{}'
    };
    
    const response = await refresh(event);
    
    expect(response.statusCode).toBe(401);
  });
});

describe('Auth Endpoints - Logout', () => {
  it('should clear cookies on logout', async () => {
    const event = {
      headers: {},
      body: '{}'
    };
    
    const response = await logout(event);
    
    expect(response.statusCode).toBe(200);
    expect(response.multiValueHeaders['Set-Cookie']).toBeDefined();
    expect(response.multiValueHeaders['Set-Cookie'].length).toBe(2);
    
    // Check that cookies are cleared (Max-Age=0)
    const cookies = response.multiValueHeaders['Set-Cookie'];
    expect(cookies[0]).toContain('access_token=');
    expect(cookies[0]).toContain('Max-Age=0');
    expect(cookies[1]).toContain('refresh_token=');
    expect(cookies[1]).toContain('Max-Age=0');
    
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Logged out successfully');
  });

  it('should always succeed even without existing cookies', async () => {
    const event = {
      headers: {},
      body: '{}'
    };
    
    const response = await logout(event);
    
    expect(response.statusCode).toBe(200);
  });
});

describe('Auth Endpoints - Header Fallback', () => {
  it('should accept Authorization header when cookies not present', async () => {
    const accessToken = generateAccessToken(mockUserId);
    
    // This would be tested in the /auth/me endpoint or other protected routes
    // For now, we just verify the token extraction works
    const event = {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    };
    
    const { extractToken, verifyToken } = require('../src/utils/tokenManager.js');
    const extractedToken = extractToken(event, 'access');
    const decoded = verifyToken(extractedToken);
    
    expect(decoded).toBeTruthy();
    expect(decoded.userId).toBe(mockUserId);
  });
});

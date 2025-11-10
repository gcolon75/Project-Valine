/**
 * E2E Test: Login with Unverified Email
 * 
 * Tests that users cannot login before verifying their email
 */
import { test, expect } from '@playwright/test';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5000';

test.describe('Account Creation - Login Requires Verification', () => {
  test('should block login for unverified account', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `test-unverified-login-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Step 1: Sign up
    const signupResponse = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    expect(signupResponse.status()).toBe(201);
    const signupData = await signupResponse.json();
    expect(signupData.message).toBe('verification_required');
    
    // Step 2: Attempt immediate login without verification
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    // Should be rejected with 403 Forbidden
    expect(loginResponse.status()).toBe(403);
    const loginData = await loginResponse.json();
    
    expect(loginData.code).toBe('email_not_verified');
    expect(loginData.error).toBe('EMAIL_NOT_VERIFIED');
    expect(loginData.message).toContain('verify your email');
  });
  
  test('should reject login with wrong password', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `test-wrong-password-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Sign up
    await request.post(`${API_BASE}/api/users`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    // Attempt login with wrong password
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: testEmail,
        password: 'WrongPassword123!',
      },
    });
    
    expect(loginResponse.status()).toBe(401);
    const loginData = await loginResponse.json();
    
    expect(loginData.error).toBe('INVALID_CREDENTIALS');
    expect(loginData.message).toContain('Invalid email or password');
  });
  
  test('should reject login with non-existent email', async ({ request }) => {
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      },
    });
    
    expect(loginResponse.status()).toBe(401);
    const loginData = await loginResponse.json();
    
    expect(loginData.error).toBe('INVALID_CREDENTIALS');
    // Should not reveal whether user exists
    expect(loginData.message).toContain('Invalid email or password');
  });
  
  test('should enforce rate limiting on login attempts', async ({ request }) => {
    const testEmail = 'ratelimit@example.com';
    const testPassword = 'TestPassword123!';
    
    // Make 6 failed login attempts (rate limit is 5 per minute)
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push(
        request.post(`${API_BASE}/api/auth/login`, {
          data: {
            email: testEmail,
            password: testPassword,
          },
        })
      );
    }
    
    const responses = await Promise.all(attempts);
    
    // First 5 should get 401 (invalid credentials)
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status()).toBe(401);
    }
    
    // 6th should get 429 (rate limit exceeded)
    expect(responses[5].status()).toBe(429);
    const rateLimitData = await responses[5].json();
    
    expect(rateLimitData.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitData.retryAfter).toBeDefined();
  });
  
  test('should include rate limit headers', async ({ request }) => {
    const testEmail = 'headers-test@example.com';
    const testPassword = 'TestPassword123!';
    
    const response = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    const headers = response.headers();
    
    expect(headers['x-ratelimit-limit']).toBeDefined();
    expect(headers['x-ratelimit-remaining']).toBeDefined();
    expect(headers['x-ratelimit-reset']).toBeDefined();
  });
});

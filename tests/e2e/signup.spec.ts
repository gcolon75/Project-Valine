/**
 * E2E Test: Signup and Email Verification Flow
 * 
 * Tests the complete user signup process including:
 * - Account creation
 * - Email verification token retrieval
 * - Email verification
 * - Login after verification
 */
import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5000';
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || process.env.PW_BASE_URL || 'http://localhost:5173';

test.describe('Account Creation - Signup and Verification', () => {
  test('should complete full signup and verification flow', async ({ request }) => {
    // Generate unique email for this test run
    const timestamp = Date.now();
    const testEmail = `test-user-${timestamp}@example.com`;
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
    expect(signupData.user).toBeDefined();
    expect(signupData.user.email).toBe(testEmail);
    expect(signupData.user.status).toBe('pending');
    
    const userId = signupData.user.id;
    
    // Step 2: Retrieve verification token from analysis-output
    // Wait a moment for file to be written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const tokenFilePath = path.join(process.cwd(), 'analysis-output', `verification-token-${userId}.json`);
    
    let verificationData;
    try {
      const tokenFileContent = await fs.readFile(tokenFilePath, 'utf-8');
      verificationData = JSON.parse(tokenFileContent);
    } catch (error) {
      throw new Error(`Failed to read verification token file: ${tokenFilePath}. Error: ${error.message}`);
    }
    
    expect(verificationData.token).toBeDefined();
    expect(verificationData.userId).toBe(userId);
    expect(verificationData.email).toBe(testEmail);
    
    const verificationToken = verificationData.token;
    
    // Step 3: Verify email
    const verifyResponse = await request.post(`${API_BASE}/api/auth/verify-email`, {
      data: {
        token: verificationToken,
      },
    });
    
    expect(verifyResponse.status()).toBe(200);
    const verifyData = await verifyResponse.json();
    
    expect(verifyData.ok).toBe(true);
    expect(verifyData.message).toContain('verified successfully');
    
    // Step 4: Login with verified account
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    
    expect(loginData.token).toBeDefined();
    expect(loginData.user).toBeDefined();
    expect(loginData.user.email).toBe(testEmail);
    
    // Step 5: Access protected endpoint with token
    const meResponse = await request.get(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    });
    
    expect(meResponse.status()).toBe(200);
    const meData = await meResponse.json();
    
    expect(meData.user).toBeDefined();
    expect(meData.user.email).toBe(testEmail);
    expect(meData.user.emailVerified).toBe(true);
    
    // Cleanup: Delete verification token file
    try {
      await fs.unlink(tokenFilePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  test('should reject login before email verification', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `test-unverified-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Sign up
    const signupResponse = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    expect(signupResponse.status()).toBe(201);
    
    // Attempt login without verification
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    expect(loginResponse.status()).toBe(403);
    const loginData = await loginResponse.json();
    
    expect(loginData.code).toBe('email_not_verified');
    expect(loginData.error).toBe('EMAIL_NOT_VERIFIED');
  });
  
  test('should reject invalid verification token', async ({ request }) => {
    const verifyResponse = await request.post(`${API_BASE}/api/auth/verify-email`, {
      data: {
        token: 'invalid-token-12345',
      },
    });
    
    expect(verifyResponse.status()).toBe(400);
    const verifyData = await verifyResponse.json();
    
    expect(verifyData.error).toBe('INVALID_TOKEN');
  });
  
  test('should protect /me endpoint without auth', async ({ request }) => {
    const meResponse = await request.get(`${API_BASE}/api/auth/me`);
    
    expect(meResponse.status()).toBe(401);
    const meData = await meResponse.json();
    
    expect(meData.error).toBe('UNAUTHORIZED');
  });
});

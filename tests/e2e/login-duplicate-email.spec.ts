/**
 * E2E Test: Duplicate Email Prevention
 * 
 * Tests that the system prevents duplicate email signups
 */
import { test, expect } from '@playwright/test';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5000';

test.describe('Account Creation - Duplicate Email Prevention', () => {
  test('should reject signup with duplicate email', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `test-duplicate-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // First signup - should succeed
    const firstSignup = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    expect(firstSignup.status()).toBe(201);
    const firstData = await firstSignup.json();
    expect(firstData.message).toBe('verification_required');
    
    // Second signup with same email - should fail
    const secondSignup = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    
    expect(secondSignup.status()).toBe(409);
    const secondData = await secondSignup.json();
    
    expect(secondData.error).toBe('EMAIL_EXISTS');
    expect(secondData.message).toContain('already exists');
  });
  
  test('should prevent duplicate with case-insensitive email', async ({ request }) => {
    const timestamp = Date.now();
    const baseEmail = `test-case-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // First signup with lowercase
    const firstSignup = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: baseEmail.toLowerCase(),
        password: testPassword,
      },
    });
    
    expect(firstSignup.status()).toBe(201);
    
    // Second signup with uppercase - should fail due to normalization
    const secondSignup = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: baseEmail.toUpperCase(),
        password: testPassword,
      },
    });
    
    expect(secondSignup.status()).toBe(409);
    const secondData = await secondSignup.json();
    expect(secondData.error).toBe('EMAIL_EXISTS');
  });
  
  test('should prevent duplicate with whitespace variations', async ({ request }) => {
    const timestamp = Date.now();
    const baseEmail = `test-whitespace-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // First signup with trimmed email
    const firstSignup = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: baseEmail,
        password: testPassword,
      },
    });
    
    expect(firstSignup.status()).toBe(201);
    
    // Second signup with whitespace - should fail due to normalization
    const secondSignup = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: `  ${baseEmail}  `,
        password: testPassword,
      },
    });
    
    expect(secondSignup.status()).toBe(409);
    const secondData = await secondSignup.json();
    expect(secondData.error).toBe('EMAIL_EXISTS');
  });
  
  test('should validate email format', async ({ request }) => {
    const testPassword = 'TestPassword123!';
    
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@example.com',
      'user@',
      '',
    ];
    
    for (const invalidEmail of invalidEmails) {
      const response = await request.post(`${API_BASE}/api/users`, {
        data: {
          email: invalidEmail,
          password: testPassword,
        },
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
    }
  });
  
  test('should validate password strength', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-${timestamp}@example.com`;
    
    // Too short password
    const response = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: testEmail,
        password: 'short',
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toContain('at least 8 characters');
  });
  
  test('should require email and password', async ({ request }) => {
    // Missing email
    const noEmail = await request.post(`${API_BASE}/api/users`, {
      data: {
        password: 'TestPassword123!',
      },
    });
    
    expect(noEmail.status()).toBe(400);
    
    // Missing password
    const noPassword = await request.post(`${API_BASE}/api/users`, {
      data: {
        email: 'test@example.com',
      },
    });
    
    expect(noPassword.status()).toBe(400);
    
    // Missing both
    const noData = await request.post(`${API_BASE}/api/users`, {
      data: {},
    });
    
    expect(noData.status()).toBe(400);
  });
});

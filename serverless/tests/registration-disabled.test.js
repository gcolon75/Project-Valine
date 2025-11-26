/**
 * Tests for ENABLE_REGISTRATION flag and ALLOWED_USER_EMAILS integration
 * Verifies that registration is controlled by both flags appropriately
 */

import { register } from '../src/handlers/auth.js';

describe('Registration Disabled Tests', () => {
  const originalEnableReg = process.env.ENABLE_REGISTRATION;
  const originalAllowedEmails = process.env.ALLOWED_USER_EMAILS;

  afterEach(() => {
    // Restore original environment
    if (originalEnableReg !== undefined) {
      process.env.ENABLE_REGISTRATION = originalEnableReg;
    } else {
      delete process.env.ENABLE_REGISTRATION;
    }
    if (originalAllowedEmails !== undefined) {
      process.env.ALLOWED_USER_EMAILS = originalAllowedEmails;
    } else {
      delete process.env.ALLOWED_USER_EMAILS;
    }
  });

  test('should return 403 when ENABLE_REGISTRATION is false and email not in allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'false';
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';

    const event = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await register(event);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Registration is currently disabled');
  });

  test('should allow registration when ENABLE_REGISTRATION is false but email is in allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'false';
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';

    const event = {
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'password123',
        username: 'owneruser',
        displayName: 'Owner User'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await register(event);

    // Should NOT be 403 (registration disabled)
    // May be 500 (database error) or 201 (success with valid DB)
    expect(response.statusCode).not.toBe(403);
  });

  test('should return 403 when ENABLE_REGISTRATION is false and no allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'false';
    delete process.env.ALLOWED_USER_EMAILS;

    const event = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await register(event);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Registration is currently disabled');
  });

  test('should return 403 when ENABLE_REGISTRATION is true but email not in allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';

    const event = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await register(event);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Registration not permitted for this email address');
  });

  test('should allow registration when ENABLE_REGISTRATION is true and no allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    delete process.env.ALLOWED_USER_EMAILS;
    
    const event = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await register(event);

    // Should NOT be 403 (registration disabled)
    // May be 500 (database error) or 201 (success with valid DB)
    expect(response.statusCode).not.toBe(403);
  });

  test('should have CORS headers even when registration is disabled', async () => {
    process.env.ENABLE_REGISTRATION = 'false';
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';

    const event = {
      body: JSON.stringify({
        email: 'nonallowed@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await register(event);

    expect(response.statusCode).toBe(403);
    expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
    expect(response.headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});

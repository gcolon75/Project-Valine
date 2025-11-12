/**
 * Tests for ENABLE_REGISTRATION flag
 * Verifies that registration is disabled when flag is false
 */

import { register } from '../src/handlers/auth.js';

describe('Registration Disabled Tests', () => {
  const originalEnv = process.env.ENABLE_REGISTRATION;

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.ENABLE_REGISTRATION = originalEnv;
    } else {
      delete process.env.ENABLE_REGISTRATION;
    }
  });

  test('should return 403 when ENABLE_REGISTRATION is false', async () => {
    process.env.ENABLE_REGISTRATION = 'false';

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

  test('should return 403 when ENABLE_REGISTRATION is not set (default)', async () => {
    delete process.env.ENABLE_REGISTRATION;

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

  test('should return 403 when ENABLE_REGISTRATION is invalid value', async () => {
    process.env.ENABLE_REGISTRATION = 'yes';

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

  test('should allow registration when ENABLE_REGISTRATION is true', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    // Note: This test will fail without database connection
    // It's mainly to verify the flag check passes when enabled
    
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
    expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
    expect(response.headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});

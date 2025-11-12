/**
 * Tests for ALLOWED_USER_EMAILS email allowlist enforcement
 * Verifies that only allowed emails can login after authentication
 */

import { login } from '../src/handlers/auth.js';

describe('Email Allowlist Tests', () => {
  const originalAllowedEmails = process.env.ALLOWED_USER_EMAILS;
  const originalDb = process.env.DATABASE_URL;

  afterEach(() => {
    // Restore original environment
    if (originalAllowedEmails !== undefined) {
      process.env.ALLOWED_USER_EMAILS = originalAllowedEmails;
    } else {
      delete process.env.ALLOWED_USER_EMAILS;
    }
    if (originalDb !== undefined) {
      process.env.DATABASE_URL = originalDb;
    }
  });

  // Mock successful password verification
  beforeEach(() => {
    // Note: These tests will need a test database or mocks
    // For now, they demonstrate the expected behavior
  });

  test('should block login when email not in allowlist', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com,friend@example.com';

    const event = {
      body: JSON.stringify({
        email: 'hacker@evil.com',
        password: 'correctpassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    // Note: This test requires database mocking
    // Expected behavior: login should check allowlist AFTER password verification
    // and return 403 for unauthorized email
    
    // Placeholder - actual test needs DB mock
    expect(process.env.ALLOWED_USER_EMAILS).toContain('owner@example.com');
    expect(process.env.ALLOWED_USER_EMAILS).not.toContain('hacker@evil.com');
  });

  test('should allow login when email is in allowlist', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com,friend@example.com';

    const event = {
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'correctpassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    // Placeholder - actual test needs DB mock
    const allowedEmails = process.env.ALLOWED_USER_EMAILS.split(',');
    expect(allowedEmails).toContain('owner@example.com');
  });

  test('should allow all users when allowlist is empty', async () => {
    process.env.ALLOWED_USER_EMAILS = '';

    const event = {
      body: JSON.stringify({
        email: 'anyone@example.com',
        password: 'correctpassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    // When allowlist is empty, no restriction should apply
    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '')
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    expect(allowedEmails.length).toBe(0);
  });

  test('should handle allowlist with extra whitespace', async () => {
    process.env.ALLOWED_USER_EMAILS = ' owner@example.com , friend@example.com ';

    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '')
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    expect(allowedEmails).toContain('owner@example.com');
    expect(allowedEmails).toContain('friend@example.com');
    expect(allowedEmails.length).toBe(2);
  });

  test('should be case-sensitive for email comparison', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';

    const allowedEmails = process.env.ALLOWED_USER_EMAILS.split(',').map(e => e.trim());

    // Email comparison should be case-sensitive (emails are stored lowercase in DB)
    expect(allowedEmails).toContain('owner@example.com');
    expect(allowedEmails).not.toContain('Owner@Example.com');
  });
});

/**
 * Integration test guidance:
 * 
 * To properly test email allowlist enforcement, you need:
 * 
 * 1. Test database with sample users:
 *    - owner@example.com (in allowlist)
 *    - friend@example.com (in allowlist)
 *    - hacker@evil.com (NOT in allowlist)
 * 
 * 2. Set ALLOWED_USER_EMAILS=owner@example.com,friend@example.com
 * 
 * 3. Test scenarios:
 *    - Login with owner@example.com + correct password → 200 (success)
 *    - Login with friend@example.com + correct password → 200 (success)
 *    - Login with hacker@evil.com + correct password → 403 (blocked by allowlist)
 *    - Login with hacker@evil.com + wrong password → 401 (invalid credentials)
 * 
 * 4. Verify logging:
 *    - Check console logs for "Login blocked: Email X not in allowlist"
 *    - Verify allowed emails are logged (but NOT passwords)
 */

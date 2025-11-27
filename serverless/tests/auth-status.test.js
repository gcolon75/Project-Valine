/**
 * Tests for the /auth/status endpoint
 * Validates that auth configuration is correctly exposed for ops visibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authStatus } from '../src/handlers/auth.js';

describe('Auth Status Endpoint', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should return correct status when registration is enabled with empty allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    process.env.ALLOWED_USER_EMAILS = '';
    process.env.TWO_FACTOR_ENABLED = 'false';
    process.env.EMAIL_VERIFICATION_REQUIRED = 'false';

    const response = await authStatus({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.registrationEnabled).toBe(true);
    expect(body.allowlistActive).toBe(false);
    expect(body.allowlistCount).toBe(0);
    expect(body.twoFactorEnabled).toBe(false);
    expect(body.emailVerificationRequired).toBe(false);
  });

  it('should return correct status when registration is disabled with allowlist', async () => {
    process.env.ENABLE_REGISTRATION = 'false';
    process.env.ALLOWED_USER_EMAILS = 'user1@example.com,user2@example.com';
    process.env.TWO_FACTOR_ENABLED = 'true';
    process.env.EMAIL_VERIFICATION_REQUIRED = 'true';

    const response = await authStatus({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.registrationEnabled).toBe(false);
    expect(body.allowlistActive).toBe(true);
    expect(body.allowlistCount).toBe(2);
    expect(body.twoFactorEnabled).toBe(true);
    expect(body.emailVerificationRequired).toBe(true);
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.ENABLE_REGISTRATION;
    delete process.env.ALLOWED_USER_EMAILS;
    delete process.env.TWO_FACTOR_ENABLED;
    delete process.env.EMAIL_VERIFICATION_REQUIRED;

    const response = await authStatus({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    // Should use default values (false)
    expect(body.registrationEnabled).toBe(false);
    expect(body.allowlistActive).toBe(false);
    expect(body.allowlistCount).toBe(0);
    expect(body.twoFactorEnabled).toBe(false);
    expect(body.emailVerificationRequired).toBe(false);
  });

  it('should return CORS headers', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    process.env.ALLOWED_USER_EMAILS = '';

    const response = await authStatus({
      headers: {
        origin: 'https://dkmxy676d3vgc.cloudfront.net'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
    expect(response.headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('should handle whitespace in allowlist configuration', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    process.env.ALLOWED_USER_EMAILS = ' user1@example.com , user2@example.com , user3@example.com ';

    const response = await authStatus({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.allowlistActive).toBe(true);
    expect(body.allowlistCount).toBe(3);
  });

  it('should not include empty cookies property in response', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    process.env.ALLOWED_USER_EMAILS = '';

    const response = await authStatus({});

    expect(response.statusCode).toBe(200);
    // Response should not have cookies property when no cookies are set
    expect(response.cookies).toBeUndefined();
  });

  it('should handle case-insensitive boolean env var values', async () => {
    process.env.ENABLE_REGISTRATION = 'TRUE';
    process.env.TWO_FACTOR_ENABLED = 'True';
    process.env.EMAIL_VERIFICATION_REQUIRED = 'TrUe';
    process.env.ALLOWED_USER_EMAILS = '';

    const response = await authStatus({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.registrationEnabled).toBe(true);
    expect(body.twoFactorEnabled).toBe(true);
    expect(body.emailVerificationRequired).toBe(true);
  });
});

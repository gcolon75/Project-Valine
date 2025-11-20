/**
 * Tests for health endpoint secretsStatus
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handler } from '../src/handlers/health.js';

describe('Health Endpoint - Secrets Status', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('secretsStatus object', () => {
    it('should include secretsStatus in response', async () => {
      process.env.JWT_SECRET = 'secure-random-jwt-secret-32-chars-min';
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

      const response = await handler();
      const body = JSON.parse(response.body);

      expect(body.secretsStatus).toBeDefined();
      expect(body.secretsStatus).toHaveProperty('jwtSecretValid');
      expect(body.secretsStatus).toHaveProperty('discordConfigured');
      expect(body.secretsStatus).toHaveProperty('smtpConfigured');
      expect(body.secretsStatus).toHaveProperty('databaseConfigured');
    });

    it('should validate JWT_SECRET correctly', async () => {
      // Valid JWT secret
      process.env.JWT_SECRET = 'secure-random-jwt-secret-32-chars-minimum';
      let response = await handler();
      let body = JSON.parse(response.body);
      expect(body.secretsStatus.jwtSecretValid).toBe(true);

      // Invalid (default) JWT secret
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      response = await handler();
      body = JSON.parse(response.body);
      expect(body.secretsStatus.jwtSecretValid).toBe(false);
      expect(body.secretsStatus.insecureDefaults).toContain('JWT_SECRET');
    });

    it('should detect Discord configuration', async () => {
      // No Discord config
      delete process.env.DISCORD_BOT_TOKEN;
      delete process.env.DISCORD_WEBHOOK;
      delete process.env.DISCORD_PUBLIC_KEY;

      let response = await handler();
      let body = JSON.parse(response.body);
      expect(body.secretsStatus.discordConfigured).toBe(false);

      // With Discord bot token
      process.env.DISCORD_BOT_TOKEN = 'test-discord-token';
      response = await handler();
      body = JSON.parse(response.body);
      expect(body.secretsStatus.discordConfigured).toBe(true);

      // With Discord webhook
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123/abc';
      response = await handler();
      body = JSON.parse(response.body);
      expect(body.secretsStatus.discordConfigured).toBe(true);
    });

    it('should detect SMTP configuration', async () => {
      // No SMTP config
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      let response = await handler();
      let body = JSON.parse(response.body);
      expect(body.secretsStatus.smtpConfigured).toBe(false);

      // Partial SMTP config (not sufficient)
      process.env.SMTP_HOST = 'smtp.example.com';
      response = await handler();
      body = JSON.parse(response.body);
      expect(body.secretsStatus.smtpConfigured).toBe(false);

      // Complete SMTP config
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password123';
      response = await handler();
      body = JSON.parse(response.body);
      expect(body.secretsStatus.smtpConfigured).toBe(true);
    });

    it('should detect database configuration', async () => {
      delete process.env.DATABASE_URL;

      let response = await handler();
      let body = JSON.parse(response.body);
      expect(body.secretsStatus.databaseConfigured).toBe(false);

      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      response = await handler();
      body = JSON.parse(response.body);
      expect(body.secretsStatus.databaseConfigured).toBe(true);
    });

    it('should detect test credentials in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TEST_USER_PASSWORD = 'test-password';
      process.env.JWT_SECRET = 'secure-jwt-secret-32-chars-minimum-length';

      const response = await handler();
      const body = JSON.parse(response.body);

      expect(body.secretsStatus.insecureDefaults).toContain('TEST_USER_PASSWORD');
      expect(body.warnings).toContain('INSECURE_DEFAULTS_DETECTED');
    });

    it('should not expose actual secret values', async () => {
      process.env.JWT_SECRET = 'super-secret-value-that-should-not-appear';
      process.env.DATABASE_URL = 'postgresql://user:secretpassword@host:5432/db';
      process.env.DISCORD_BOT_TOKEN = 'very-secret-discord-token';

      const response = await handler();
      const body = JSON.parse(response.body);
      const bodyString = JSON.stringify(body);

      // Ensure no secret values in response
      expect(bodyString).not.toContain('super-secret-value');
      expect(bodyString).not.toContain('secretpassword');
      expect(bodyString).not.toContain('very-secret-discord-token');

      // But status should still be reported
      expect(body.secretsStatus.jwtSecretValid).toBe(true);
      expect(body.secretsStatus.discordConfigured).toBe(true);
      expect(body.secretsStatus.databaseConfigured).toBe(true);
    });

    it('should add warnings for secret misconfiguration', async () => {
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      process.env.NODE_ENV = 'production';

      const response = await handler();
      const body = JSON.parse(response.body);

      expect(body.warnings).toBeDefined();
      expect(body.warnings).toContain('INSECURE_DEFAULTS_DETECTED');
      expect(body.warnings).toContain('JWT_SECRET_INVALID');
    });

    it('should not include insecureDefaults if none detected', async () => {
      process.env.JWT_SECRET = 'secure-random-jwt-secret-32-chars-minimum';
      process.env.NODE_ENV = 'development';
      delete process.env.TEST_USER_PASSWORD;

      const response = await handler();
      const body = JSON.parse(response.body);

      expect(body.secretsStatus.insecureDefaults).toBeUndefined();
    });
  });

  describe('backward compatibility', () => {
    it('should still include allowlist information', async () => {
      process.env.ALLOWED_USER_EMAILS = 'test@example.com';

      const response = await handler();
      const body = JSON.parse(response.body);

      expect(body.allowlistActive).toBe(true);
      expect(body.allowlistCount).toBe(1);
    });

    it('should maintain existing response structure', async () => {
      const response = await handler();
      const body = JSON.parse(response.body);

      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.service).toBe('Project Valine API');
      expect(body.version).toBe('1.0.0');
    });
  });
});

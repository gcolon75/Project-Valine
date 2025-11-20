/**
 * Integration tests for health endpoint allowlist diagnostics
 * Tests that /health returns allowlist metrics and warnings
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handler } from '../src/handlers/health.js';

describe('Health Endpoint Allowlist Diagnostics', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Allowlist Fields', () => {
    it('should return allowlistActive: true when emails configured', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('allowlistActive');
      expect(body.allowlistActive).toBe(true);
    });

    it('should return allowlistActive: false when no emails configured', async () => {
      process.env.ALLOWED_USER_EMAILS = '';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistActive).toBe(false);
      expect(body.allowlistCount).toBe(0);
    });

    it('should return correct allowlistCount', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistCount).toBe(2);
    });

    it('should handle whitespace in email list', async () => {
      process.env.ALLOWED_USER_EMAILS = ' ghawk075@gmail.com , valinejustin@gmail.com ';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistCount).toBe(2);
    });

    it('should filter out empty strings from email list', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,,valinejustin@gmail.com,';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistCount).toBe(2);
    });
  });

  describe('Misconfiguration Detection', () => {
    it('should set allowlistMisconfigured: false when 2+ emails present', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistMisconfigured).toBe(false);
      expect(body).not.toHaveProperty('warnings');
    });

    it('should set allowlistMisconfigured: true when only 1 email present', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistMisconfigured).toBe(true);
      expect(body.warnings).toContain('ALLOWLIST_MISCONFIGURED');
      expect(body.requiredEmails).toContain('ghawk075@gmail.com');
      expect(body.requiredEmails).toContain('valinejustin@gmail.com');
    });

    it('should not be misconfigured when allowlist is empty (no enforcement)', async () => {
      process.env.ALLOWED_USER_EMAILS = '';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistMisconfigured).toBe(false);
    });
  });

  describe('Required Fields', () => {
    it('should include all standard health fields', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Standard fields
      expect(body).toHaveProperty('status');
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('service');
      expect(body.service).toBe('Project Valine API');
      expect(body).toHaveProperty('version');
      
      // Allowlist fields
      expect(body).toHaveProperty('allowlistActive');
      expect(body).toHaveProperty('allowlistCount');
      expect(body).toHaveProperty('allowlistMisconfigured');
    });

    it('should not include requiredEmails when properly configured', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.requiredEmails).toBeUndefined();
    });

    it('should include requiredEmails when misconfigured', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.requiredEmails).toBeDefined();
      expect(Array.isArray(body.requiredEmails)).toBe(true);
      expect(body.requiredEmails.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined ALLOWED_USER_EMAILS', async () => {
      delete process.env.ALLOWED_USER_EMAILS;

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistActive).toBe(false);
      expect(body.allowlistCount).toBe(0);
      expect(body.allowlistMisconfigured).toBe(false);
    });

    it('should handle multiple trailing commas', async () => {
      process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com,,,';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistCount).toBe(2);
    });

    it('should be case-insensitive in counting', async () => {
      process.env.ALLOWED_USER_EMAILS = 'GHAWK075@GMAIL.COM,ValinejJustin@Gmail.COM';

      const response = await handler();
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.allowlistCount).toBe(2);
    });
  });
});

/**
 * Tests for redaction utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  shouldRedact,
  hashFingerprint,
  redactValue,
  redactObject,
  redactEmail,
  redactEnv,
  isInsecureDefault,
  validateSecret
} from '../src/utils/redaction.js';

describe('Redaction Utilities', () => {
  describe('shouldRedact', () => {
    it('should identify sensitive key patterns', () => {
      expect(shouldRedact('password')).toBe(true);
      expect(shouldRedact('JWT_SECRET')).toBe(true);
      expect(shouldRedact('api_key')).toBe(true);
      expect(shouldRedact('DISCORD_BOT_TOKEN')).toBe(true);
      expect(shouldRedact('DATABASE_URL')).toBe(true);
      expect(shouldRedact('SMTP_PASS')).toBe(true);
    });

    it('should not redact non-sensitive keys', () => {
      expect(shouldRedact('NODE_ENV')).toBe(false);
      expect(shouldRedact('AWS_REGION')).toBe(false);
      expect(shouldRedact('ENABLE_REGISTRATION')).toBe(false);
      expect(shouldRedact('user_email')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(shouldRedact('')).toBe(false);
      expect(shouldRedact(null)).toBe(false);
      expect(shouldRedact(undefined)).toBe(false);
    });
  });

  describe('hashFingerprint', () => {
    it('should generate consistent hash for same input', () => {
      const value = 'my-secret-value';
      const hash1 = hashFingerprint(value);
      const hash2 = hashFingerprint(value);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashFingerprint('secret1');
      const hash2 = hashFingerprint('secret2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return fixed length hash', () => {
      const hash = hashFingerprint('any-value');
      expect(hash).toHaveLength(12); // Default length
    });

    it('should support custom length', () => {
      const hash = hashFingerprint('any-value', 8);
      expect(hash).toHaveLength(8);
    });

    it('should handle empty values', () => {
      expect(hashFingerprint('')).toBe('<empty>');
      expect(hashFingerprint(null)).toBe('<empty>');
    });
  });

  describe('redactValue', () => {
    it('should redact sensitive keys with hash fingerprint', () => {
      const result = redactValue('JWT_SECRET', 'my-secret-value');
      expect(result).toMatch(/^<redacted:[a-f0-9]{12}>$/);
    });

    it('should not redact non-sensitive keys', () => {
      const result = redactValue('NODE_ENV', 'production');
      expect(result).toBe('production');
    });

    it('should handle null/undefined values', () => {
      expect(redactValue('JWT_SECRET', null)).toBe('<not set>');
      expect(redactValue('password', undefined)).toBe('<not set>');
    });

    it('should support mask mode instead of hash', () => {
      const result = redactValue('password', 'secret123', { useHash: false });
      expect(result).toBe('<redacted>');
    });
  });

  describe('redactObject', () => {
    it('should redact sensitive fields in object', () => {
      const obj = {
        username: 'user123',
        password: 'secret123',
        JWT_SECRET: 'my-jwt-secret',
        NODE_ENV: 'production'
      };

      const redacted = redactObject(obj);

      expect(redacted.username).toBe('user123'); // Not sensitive
      expect(redacted.password).toMatch(/^<redacted:[a-f0-9]{12}>$/);
      expect(redacted.JWT_SECRET).toMatch(/^<redacted:[a-f0-9]{12}>$/);
      expect(redacted.NODE_ENV).toBe('production');
    });

    it('should recursively redact nested objects', () => {
      const obj = {
        config: {
          auth: {
            JWT_SECRET: 'secret',
            apiKey: 'key123'
          },
          region: 'us-west-2'
        }
      };

      const redacted = redactObject(obj);

      expect(redacted.config.auth.JWT_SECRET).toMatch(/^<redacted:/);
      expect(redacted.config.auth.apiKey).toMatch(/^<redacted:/);
      expect(redacted.config.region).toBe('us-west-2');
    });

    it('should handle arrays', () => {
      const obj = {
        secrets: ['secret1', 'secret2']
      };

      const redacted = redactObject(obj);
      expect(Array.isArray(redacted.secrets)).toBe(true);
      expect(redacted.secrets[0]).toMatch(/^<redacted:/);
    });
  });

  describe('redactEmail', () => {
    it('should redact email addresses', () => {
      expect(redactEmail('user@example.com')).toBe('us***@example.com');
      expect(redactEmail('a@test.com')).toBe('a***@test.com');
      expect(redactEmail('testuser@domain.org')).toBe('te***@domain.org');
    });

    it('should handle invalid emails', () => {
      expect(redactEmail('not-an-email')).toBe('not-an-email');
      expect(redactEmail('')).toBe('');
      expect(redactEmail(null)).toBe(null);
    });
  });

  describe('redactEnv', () => {
    it('should redact environment object', () => {
      const env = {
        NODE_ENV: 'production',
        JWT_SECRET: 'my-secret-key',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        AWS_REGION: 'us-west-2',
        SOME_LONG_VALUE: 'this-is-a-very-long-value-that-should-be-truncated'
      };

      const redacted = redactEnv(env);

      expect(redacted.NODE_ENV).toBe('production'); // Safe key
      expect(redacted.JWT_SECRET).toMatch(/^<redacted:/); // Sensitive
      expect(redacted.DATABASE_URL).toMatch(/^<redacted:/); // Sensitive
      expect(redacted.AWS_REGION).toBe('us-west-2'); // Safe key
      expect(redacted.SOME_LONG_VALUE).toMatch(/^\w+\.\.\./); // Truncated
    });

    it('should respect allowed keys', () => {
      const env = {
        CUSTOM_VAR: 'value123',
        JWT_SECRET: 'secret'
      };

      const redacted = redactEnv(env, ['CUSTOM_VAR']);

      expect(redacted.CUSTOM_VAR).toBe('value123'); // Explicitly allowed
      expect(redacted.JWT_SECRET).toMatch(/^<redacted:/); // Still sensitive
    });
  });

  describe('isInsecureDefault', () => {
    it('should detect default JWT_SECRET', () => {
      expect(isInsecureDefault('JWT_SECRET', 'dev-secret-key-change-in-production')).toBe(true);
      expect(isInsecureDefault('JWT_SECRET', 'change-me')).toBe(true);
      expect(isInsecureDefault('JWT_SECRET', 'secret')).toBe(true);
    });

    it('should detect default DATABASE_URL', () => {
      expect(isInsecureDefault('DATABASE_URL', 'postgresql://username:password@host:5432/valine_db')).toBe(true);
    });

    it('should not flag secure values', () => {
      expect(isInsecureDefault('JWT_SECRET', 'randomly-generated-secure-key-32-chars')).toBe(false);
      expect(isInsecureDefault('DATABASE_URL', 'postgresql://realuser:complexpass@prod.host:5432/valine')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isInsecureDefault('JWT_SECRET', 'DEV-SECRET-KEY-CHANGE-IN-PRODUCTION')).toBe(true);
      expect(isInsecureDefault('JWT_SECRET', '  change-me  ')).toBe(true);
    });

    it('should return false for non-tracked keys', () => {
      expect(isInsecureDefault('RANDOM_VAR', 'any-value')).toBe(false);
    });
  });

  describe('validateSecret', () => {
    it('should validate JWT_SECRET length', () => {
      const short = validateSecret('JWT_SECRET', 'short');
      expect(short.valid).toBe(false);
      expect(short.reason).toMatch(/too short/i);

      const long = validateSecret('JWT_SECRET', 'this-is-a-long-enough-secret-key-for-jwt-use-minimum-32-characters');
      expect(long.valid).toBe(true);
    });

    it('should reject insecure defaults', () => {
      const result = validateSecret('JWT_SECRET', 'dev-secret-key-change-in-production');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/insecure default/i);
    });

    it('should reject empty values', () => {
      const result = validateSecret('JWT_SECRET', '');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/empty/i);
    });

    it('should validate Discord token length', () => {
      const short = validateSecret('DISCORD_BOT_TOKEN', 'short');
      expect(short.valid).toBe(false);

      const long = validateSecret('DISCORD_BOT_TOKEN', 'a'.repeat(60));
      expect(long.valid).toBe(true);
    });

    it('should pass validation for secure secrets', () => {
      const result = validateSecret('JWT_SECRET', 'a-very-secure-randomly-generated-secret-key-32-plus-chars');
      expect(result.valid).toBe(true);
    });

    it('should handle secrets without specific requirements', () => {
      const result = validateSecret('RANDOM_SECRET', 'any-value');
      expect(result.valid).toBe(true);
    });
  });
});

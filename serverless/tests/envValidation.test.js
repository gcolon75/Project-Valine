/**
 * Tests for environment variable validation
 * Ensures critical env vars are validated at startup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateEnvironment,
  validateEnvVar,
  getRequiredEnvVars,
  generateSecureJwtSecret
} from '../src/utils/envValidation.js';

describe('Environment Variable Validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('validateEnvironment', () => {
    it('should pass validation with all required vars set', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'a'.repeat(32)
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when DATABASE_URL is missing', () => {
      const testEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32)
        // DATABASE_URL missing
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DATABASE_URL is required but not set');
    });

    it('should fail when DATABASE_URL contains spaces', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass @host:5432/db', // space in URL
        JWT_SECRET: 'a'.repeat(32)
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('spaces'))).toBe(true);
    });

    it('should fail when DATABASE_URL has wrong protocol', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://user:pass@host:5432/db', // wrong protocol
        JWT_SECRET: 'a'.repeat(32)
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('postgresql://'))).toBe(true);
    });

    it('should fail when JWT_SECRET is missing', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db'
        // JWT_SECRET missing
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('JWT_SECRET is required but not set');
    });

    it('should fail when JWT_SECRET uses default value in production', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'dev-secret-key-change-in-production'
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('default value'))).toBe(true);
    });

    it('should fail when JWT_SECRET is too short', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'short' // less than 32 characters
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 32 characters'))).toBe(true);
    });

    it('should allow default JWT_SECRET in development', () => {
      const testEnv = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'dev-secret-key-change-in-production'
      };

      const result = validateEnvironment(testEnv);

      // Should pass in development
      expect(result.valid).toBe(true);
    });

    it('should fail when NODE_ENV is missing', () => {
      const testEnv = {
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'a'.repeat(32)
        // NODE_ENV missing
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('NODE_ENV is required but not set');
    });

    it('should fail when NODE_ENV is invalid', () => {
      const testEnv = {
        NODE_ENV: 'staging', // not a valid value
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'a'.repeat(32)
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be one of'))).toBe(true);
    });

    it('should warn when MEDIA_BUCKET is missing', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'a'.repeat(32)
        // MEDIA_BUCKET missing
      };

      const result = validateEnvironment(testEnv);

      // Should still pass (not required)
      expect(result.valid).toBe(true);
      // But should have warning
      expect(result.warnings.some(w => w.includes('MEDIA_BUCKET'))).toBe(true);
    });

    it('should warn when FRONTEND_URL is missing', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'a'.repeat(32)
        // FRONTEND_URL missing
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('FRONTEND_URL'))).toBe(true);
    });

    it('should fail when FRONTEND_URL is invalid URL', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'not-a-valid-url'
      };

      const result = validateEnvironment(testEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('valid URL'))).toBe(true);
    });
  });

  describe('validateEnvVar', () => {
    it('should validate individual env var', () => {
      const result = validateEnvVar('JWT_SECRET', 'a'.repeat(32), 'production');

      expect(result.valid).toBe(true);
    });

    it('should fail for short JWT_SECRET', () => {
      const result = validateEnvVar('JWT_SECRET', 'short', 'production');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 32 characters');
    });

    it('should return valid for unknown env var', () => {
      const result = validateEnvVar('UNKNOWN_VAR', 'value', 'production');

      expect(result.valid).toBe(true);
    });
  });

  describe('getRequiredEnvVars', () => {
    it('should return list of required env vars', () => {
      const required = getRequiredEnvVars();

      expect(required).toContain('DATABASE_URL');
      expect(required).toContain('JWT_SECRET');
      expect(required).toContain('NODE_ENV');
      expect(required).not.toContain('MEDIA_BUCKET'); // optional
    });
  });

  describe('generateSecureJwtSecret', () => {
    it('should generate a secure random secret', () => {
      const secret = generateSecureJwtSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateSecureJwtSecret();
      const secret2 = generateSecureJwtSecret();

      expect(secret1).not.toBe(secret2);
    });
  });
});

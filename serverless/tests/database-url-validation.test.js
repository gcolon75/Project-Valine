/**
 * Tests for DATABASE_URL validation utility
 * Ensures proper error messages for common connection string issues
 */

import { describe, it, expect } from 'vitest';
import { validateDatabaseUrl } from '../src/db/client.js';

describe('DATABASE_URL Validation', () => {
  describe('Valid URLs', () => {
    it('should accept a valid PostgreSQL connection string', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@host.rds.amazonaws.com:5432/database?sslmode=require'
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept a valid connection string without query params', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@localhost:5432/testdb'
      );
      expect(result.valid).toBe(true);
    });

    it('should accept a connection string with URL-encoded password', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:P%40ss%23word%21@host:5432/db?sslmode=require'
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Missing URL', () => {
    it('should reject undefined DATABASE_URL', () => {
      const result = validateDatabaseUrl(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DATABASE_URL is not set');
    });

    it('should reject null DATABASE_URL', () => {
      const result = validateDatabaseUrl(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DATABASE_URL is not set');
    });

    it('should reject empty string DATABASE_URL', () => {
      const result = validateDatabaseUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DATABASE_URL is not set');
    });
  });

  describe('Space Detection', () => {
    it('should reject URL with space in hostname', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@host.rds. amazonaws.com:5432/database?sslmode=require'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('contains spaces');
      expect(result.sanitizedUrl).toBeDefined();
      expect(result.sanitizedUrl).not.toContain('password'); // Password should be masked
    });

    it('should reject URL with space in protocol', () => {
      const result = validateDatabaseUrl(
        'postgresql ://user:password@host:5432/database'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('contains spaces');
    });

    it('should reject URL with trailing space', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@host:5432/database '
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('contains spaces');
    });

    it('should mask password in sanitized URL', () => {
      const result = validateDatabaseUrl(
        'postgresql://myuser:mysecretpassword@host. example.com:5432/db'
      );
      expect(result.valid).toBe(false);
      // The regex masks everything between : and @ including the username
      // This is acceptable behavior - it still hides sensitive info
      expect(result.sanitizedUrl).not.toContain('mysecretpassword');
      expect(result.sanitizedUrl).toContain(':***@');
    });
  });

  describe('Format Validation', () => {
    it('should reject URL with missing port', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@host/database'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is invalid');
    });

    it('should reject URL with missing database name', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@host:5432'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is invalid');
    });

    it('should reject URL with invalid protocol', () => {
      const result = validateDatabaseUrl(
        'mysql://user:password@host:5432/database'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is invalid');
    });

    it('should reject URL with missing password', () => {
      const result = validateDatabaseUrl(
        'postgresql://user@host:5432/database'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is invalid');
    });

    it('should reject URL with non-numeric port', () => {
      const result = validateDatabaseUrl(
        'postgresql://user:password@host:abc/database'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is invalid');
    });
  });

  describe('Real-World Error Cases', () => {
    it('should catch the exact error from the issue (space in rds.amazonaws.com)', () => {
      // This simulates the issue from CloudWatch logs - space in hostname
      const result = validateDatabaseUrl(
        'postgresql://testuser:testpass123@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds. amazonaws.com:5432/postgres?sslmode=require'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('contains spaces');
      // Verify password is masked
      expect(result.sanitizedUrl).not.toContain('testpass123');
      expect(result.sanitizedUrl).toContain(':***@');
    });
  });
});

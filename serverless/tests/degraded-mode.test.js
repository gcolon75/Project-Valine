/**
 * Tests for simplified Prisma client 
 * Verifies the simple singleton pattern and stub functions for backward compatibility
 */

import { describe, it, expect } from 'vitest';
import {
  isPrismaDegraded,
  setDegradedMode,
  getDegradedUser,
  createDegradedUser,
  verifyDegradedUserPassword,
  getDegradedUserCount,
  clearDegradedUserStore,
  validateDatabaseUrl,
  getPrisma,
  getPrismaInitError,
  initPrismaAsync,
  getPrismaSync
} from '../src/db/client.js';

describe('Simplified Prisma Client', () => {
  describe('isPrismaDegraded', () => {
    it('should always return false (degraded mode removed)', () => {
      expect(isPrismaDegraded()).toBe(false);
    });

    it('should still return false after calling setDegradedMode (no-op stub)', () => {
      setDegradedMode(true, 'Test error');
      expect(isPrismaDegraded()).toBe(false);
    });
  });

  describe('Stub Functions for Backward Compatibility', () => {
    it('getDegradedUser should always return null', () => {
      expect(getDegradedUser('any@example.com')).toBeNull();
    });

    it('createDegradedUser should return null (async for backward compatibility)', async () => {
      expect(await createDegradedUser('test@example.com', 'password')).toBeNull();
    });

    it('verifyDegradedUserPassword should return false (async for backward compatibility)', async () => {
      expect(await verifyDegradedUserPassword('test@example.com', 'password')).toBe(false);
    });

    it('getDegradedUserCount should return 0', () => {
      expect(getDegradedUserCount()).toBe(0);
    });

    it('clearDegradedUserStore should be a no-op (no errors)', () => {
      expect(() => clearDegradedUserStore()).not.toThrow();
    });

    it('setDegradedMode should be a no-op (no errors)', () => {
      expect(() => setDegradedMode(true, 'error')).not.toThrow();
    });

    it('getPrismaInitError should return null', () => {
      expect(getPrismaInitError()).toBeNull();
    });
  });

  describe('validateDatabaseUrl', () => {
    it('should return valid for correct URL', () => {
      const result = validateDatabaseUrl('postgresql://user:pass@host:5432/db?sslmode=require');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for URL with spaces', () => {
      const result = validateDatabaseUrl('postgresql://user:pass@host. example.com:5432/db');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('spaces');
    });

    it('should sanitize password in error messages when spaces detected', () => {
      const result = validateDatabaseUrl('postgresql://user:secretpass@host. example.com:5432/db');
      expect(result.valid).toBe(false);
      expect(result.sanitizedUrl).toBeDefined();
      expect(result.sanitizedUrl).not.toContain('secretpass');
      expect(result.sanitizedUrl).toContain(':***@');
    });

    it('should return invalid for missing URL', () => {
      const result = validateDatabaseUrl(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not set');
    });

    it('should return invalid for empty string', () => {
      const result = validateDatabaseUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not set');
    });
  });

  describe('getPrisma', () => {
    it('should return a PrismaClient instance', () => {
      const prisma = getPrisma();
      expect(prisma).not.toBeNull();
      expect(prisma).toBeDefined();
      
      // Verify it's a valid PrismaClient instance by checking for expected methods
      expect(typeof prisma.user).toBe('object');
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
    });

    it('should return the same instance on multiple calls (singleton pattern)', () => {
      const prisma1 = getPrisma();
      const prisma2 = getPrisma();
      expect(prisma1).toBe(prisma2);
    });
  });

  describe('initPrismaAsync', () => {
    it('should return a Promise that resolves to PrismaClient', async () => {
      const prisma = await initPrismaAsync();
      expect(prisma).not.toBeNull();
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
    });
  });

  describe('getPrismaSync', () => {
    it('should return the same instance as getPrisma', () => {
      const prisma = getPrisma();
      const prismaSynced = getPrismaSync();
      expect(prismaSynced).toBe(prisma);
    });
  });
});

/**
 * Tests for Prisma client with degraded mode support
 * Verifies the singleton pattern, degraded mode functionality, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('Prisma Client with Degraded Mode', () => {
  // Clean up degraded user store between tests
  beforeEach(() => {
    clearDegradedUserStore();
  });

  describe('isPrismaDegraded', () => {
    it('should return false by default', () => {
      // Reset state
      setDegradedMode(false);
      expect(isPrismaDegraded()).toBe(false);
    });

    it('should return true when degraded mode is enabled', () => {
      setDegradedMode(true);
      expect(isPrismaDegraded()).toBe(true);
      // Reset for other tests
      setDegradedMode(false);
    });
  });

  describe('Degraded Mode User Store', () => {
    it('getDegradedUser should return null for non-existent user', () => {
      expect(getDegradedUser('nonexistent@example.com')).toBeNull();
    });

    it('createDegradedUser should create a user with hashed password', async () => {
      const user = await createDegradedUser('test@example.com', 'password123');
      expect(user).not.toBeNull();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('password123'); // Should be hashed
      expect(user._degradedMode).toBe(true);
    });

    it('getDegradedUser should return created user', async () => {
      await createDegradedUser('stored@example.com', 'password');
      const user = getDegradedUser('stored@example.com');
      expect(user).not.toBeNull();
      expect(user.email).toBe('stored@example.com');
    });

    it('verifyDegradedUserPassword should verify correct password', async () => {
      await createDegradedUser('verify@example.com', 'correctpassword');
      const result = await verifyDegradedUserPassword('verify@example.com', 'correctpassword');
      expect(result).toBe(true);
    });

    it('verifyDegradedUserPassword should reject incorrect password', async () => {
      await createDegradedUser('verify@example.com', 'correctpassword');
      const result = await verifyDegradedUserPassword('verify@example.com', 'wrongpassword');
      expect(result).toBe(false);
    });

    it('getDegradedUserCount should return number of users', async () => {
      expect(getDegradedUserCount()).toBe(0);
      await createDegradedUser('user1@example.com', 'password');
      expect(getDegradedUserCount()).toBe(1);
      await createDegradedUser('user2@example.com', 'password');
      expect(getDegradedUserCount()).toBe(2);
    });

    it('clearDegradedUserStore should clear all users', async () => {
      await createDegradedUser('user@example.com', 'password');
      expect(getDegradedUserCount()).toBe(1);
      clearDegradedUserStore();
      expect(getDegradedUserCount()).toBe(0);
    });

    it('setDegradedMode should not throw', () => {
      expect(() => setDegradedMode(true)).not.toThrow();
      expect(() => setDegradedMode(false)).not.toThrow();
    });
  });

  describe('validateDatabaseUrl', () => {
    it('should return valid for correct URL', () => {
      const result = validateDatabaseUrl('postgresql://user:pass@host:5432/db?sslmode=require');
      expect(result.valid).toBe(true);
    });

    it('should return valid for postgres:// URL', () => {
      const result = validateDatabaseUrl('postgres://user:pass@host:5432/db');
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

    it('should return invalid for non-postgresql URL', () => {
      const result = validateDatabaseUrl('mysql://user:pass@host:5432/db');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('postgresql://');
    });
  });

  describe('getPrisma', () => {
    it('should return null when degraded mode is enabled', () => {
      setDegradedMode(true);
      const prisma = getPrisma();
      expect(prisma).toBeNull();
      setDegradedMode(false);
    });
  });

  describe('getPrismaSync', () => {
    it('should return the same as getPrisma', () => {
      setDegradedMode(false);
      const prisma1 = getPrisma();
      const prisma2 = getPrismaSync();
      expect(prisma1).toBe(prisma2);
    });
  });
});

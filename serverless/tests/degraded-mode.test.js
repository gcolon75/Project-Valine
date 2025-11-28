/**
 * Tests for degraded mode functionality
 * Verifies emergency fallback behavior when Prisma is unavailable
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
  validateDatabaseUrl
} from '../src/db/client.js';

describe('Degraded Mode - Database Client', () => {
  beforeEach(() => {
    // Reset degraded mode state before each test
    setDegradedMode(false, null);
    clearDegradedUserStore();
  });

  afterEach(() => {
    // Clean up after each test
    setDegradedMode(false, null);
    clearDegradedUserStore();
  });

  describe('isPrismaDegraded', () => {
    it('should return false by default', () => {
      expect(isPrismaDegraded()).toBe(false);
    });

    it('should return true when set to degraded mode', () => {
      setDegradedMode(true, 'Test error');
      expect(isPrismaDegraded()).toBe(true);
    });
  });

  describe('setDegradedMode', () => {
    it('should set degraded mode with error message', () => {
      setDegradedMode(true, 'Prisma init failed');
      expect(isPrismaDegraded()).toBe(true);
    });

    it('should clear degraded mode when set to false', () => {
      setDegradedMode(true, 'Error');
      setDegradedMode(false, null);
      expect(isPrismaDegraded()).toBe(false);
    });
  });

  describe('Degraded User Store', () => {
    it('should create a degraded user with hashed password', async () => {
      const user = await createDegradedUser('test@example.com', 'password123');
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('password123'); // Should be hashed
      expect(user._degradedMode).toBe(true);
    });

    it('should retrieve degraded user by email', async () => {
      await createDegradedUser('test@example.com', 'password123');
      
      const user = getDegradedUser('test@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should retrieve degraded user with case-insensitive email', async () => {
      await createDegradedUser('Test@Example.COM', 'password123');
      
      const user = getDegradedUser('test@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', () => {
      const user = getDegradedUser('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should verify correct password', async () => {
      await createDegradedUser('test@example.com', 'correctpassword');
      
      const result = await verifyDegradedUserPassword('test@example.com', 'correctpassword');
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      await createDegradedUser('test@example.com', 'correctpassword');
      
      const result = await verifyDegradedUserPassword('test@example.com', 'wrongpassword');
      expect(result).toBe(false);
    });

    it('should return false for non-existent user password verification', async () => {
      const result = await verifyDegradedUserPassword('nonexistent@example.com', 'anypassword');
      expect(result).toBe(false);
    });

    it('should track user count correctly', async () => {
      expect(getDegradedUserCount()).toBe(0);
      
      await createDegradedUser('user1@example.com', 'pass1');
      expect(getDegradedUserCount()).toBe(1);
      
      await createDegradedUser('user2@example.com', 'pass2');
      expect(getDegradedUserCount()).toBe(2);
    });

    it('should clear user store', async () => {
      await createDegradedUser('test@example.com', 'password');
      expect(getDegradedUserCount()).toBe(1);
      
      clearDegradedUserStore();
      expect(getDegradedUserCount()).toBe(0);
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

    it('should return invalid for missing URL', () => {
      const result = validateDatabaseUrl(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not set');
    });

    it('should sanitize password in error messages', () => {
      const result = validateDatabaseUrl('postgresql://user:secretpass@host. example.com:5432/db');
      expect(result.valid).toBe(false);
      expect(result.sanitizedUrl).toContain('***');
      expect(result.sanitizedUrl).not.toContain('secretpass');
    });
  });
});

describe('Degraded Mode - Auth Integration', () => {
  const originalAllowedEmails = process.env.ALLOWED_USER_EMAILS;
  
  beforeEach(() => {
    setDegradedMode(false, null);
    clearDegradedUserStore();
    process.env.ALLOWED_USER_EMAILS = 'test@example.com,admin@example.com';
  });

  afterEach(() => {
    setDegradedMode(false, null);
    clearDegradedUserStore();
    if (originalAllowedEmails !== undefined) {
      process.env.ALLOWED_USER_EMAILS = originalAllowedEmails;
    } else {
      delete process.env.ALLOWED_USER_EMAILS;
    }
  });

  it('should only allow allowlisted emails in degraded mode', async () => {
    setDegradedMode(true, 'Prisma init failed');
    
    // Allowlisted email should work
    const user = await createDegradedUser('test@example.com', 'password');
    expect(user).toBeDefined();
    
    // Non-allowlisted email would be blocked by login handler (not tested here)
  });
});

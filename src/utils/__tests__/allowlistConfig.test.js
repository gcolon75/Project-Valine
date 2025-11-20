/**
 * Tests for allowlist configuration utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAllowedEmails,
  isEmailAllowed,
  isAllowlistActive,
  getAllowlistCount,
  getRestrictedMessage
} from '../allowlistConfig';

describe('allowlistConfig', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = import.meta.env.VITE_ALLOWED_USER_EMAILS;
  });

  afterEach(() => {
    // Restore original env
    import.meta.env.VITE_ALLOWED_USER_EMAILS = originalEnv;
  });

  describe('getAllowedEmails', () => {
    it('should parse comma-separated email list', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';
      const emails = getAllowedEmails();
      expect(emails).toEqual(['ghawk075@gmail.com', 'valinejustin@gmail.com']);
    });

    it('should handle whitespace in email list', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = ' ghawk075@gmail.com , valinejustin@gmail.com ';
      const emails = getAllowedEmails();
      expect(emails).toEqual(['ghawk075@gmail.com', 'valinejustin@gmail.com']);
    });

    it('should normalize emails to lowercase', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'GHAWK075@GMAIL.COM,ValiNeJustin@Gmail.com';
      const emails = getAllowedEmails();
      expect(emails).toEqual(['ghawk075@gmail.com', 'valinejustin@gmail.com']);
    });

    it('should return empty array when not configured', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = '';
      const emails = getAllowedEmails();
      expect(emails).toEqual([]);
    });

    it('should filter out empty strings', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,,valinejustin@gmail.com';
      const emails = getAllowedEmails();
      expect(emails).toEqual(['ghawk075@gmail.com', 'valinejustin@gmail.com']);
    });
  });

  describe('isEmailAllowed', () => {
    it('should return true for allowlisted email', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';
      expect(isEmailAllowed('ghawk075@gmail.com')).toBe(true);
      expect(isEmailAllowed('valinejustin@gmail.com')).toBe(true);
    });

    it('should return false for non-allowlisted email', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';
      expect(isEmailAllowed('unauthorized@example.com')).toBe(false);
    });

    it('should be case-insensitive', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com';
      expect(isEmailAllowed('GHAWK075@GMAIL.COM')).toBe(true);
      expect(isEmailAllowed('GHawk075@Gmail.com')).toBe(true);
    });

    it('should handle whitespace in email', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com';
      expect(isEmailAllowed(' ghawk075@gmail.com ')).toBe(true);
    });

    it('should return false for empty email', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com';
      expect(isEmailAllowed('')).toBe(false);
      expect(isEmailAllowed(null)).toBe(false);
      expect(isEmailAllowed(undefined)).toBe(false);
    });

    it('should return true for all emails when allowlist is empty', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = '';
      expect(isEmailAllowed('anyone@example.com')).toBe(true);
      expect(isEmailAllowed('test@test.com')).toBe(true);
    });
  });

  describe('isAllowlistActive', () => {
    it('should return true when allowlist is configured', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';
      expect(isAllowlistActive()).toBe(true);
    });

    it('should return false when allowlist is empty', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = '';
      expect(isAllowlistActive()).toBe(false);
    });

    it('should return false when allowlist is not set', () => {
      delete import.meta.env.VITE_ALLOWED_USER_EMAILS;
      expect(isAllowlistActive()).toBe(false);
    });
  });

  describe('getAllowlistCount', () => {
    it('should return count of allowed emails', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';
      expect(getAllowlistCount()).toBe(2);
    });

    it('should return 0 when allowlist is empty', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = '';
      expect(getAllowlistCount()).toBe(0);
    });

    it('should return 1 for single email', () => {
      import.meta.env.VITE_ALLOWED_USER_EMAILS = 'ghawk075@gmail.com';
      expect(getAllowlistCount()).toBe(1);
    });
  });

  describe('getRestrictedMessage', () => {
    it('should return restriction message', () => {
      const message = getRestrictedMessage();
      expect(message).toBeTruthy();
      expect(message).toContain('restricted');
      expect(message).toContain('pre-approved');
    });
  });
});

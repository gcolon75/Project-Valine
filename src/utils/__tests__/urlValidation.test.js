// src/utils/__tests__/urlValidation.test.js
import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  hasValidUrlFormat,
  sanitizeUrl,
  isValidUrlLength,
  validateProfileUrl,
  validateProfileLink
} from '../urlValidation';

describe('urlValidation', () => {
  describe('isValidUrl', () => {
    it('should accept valid http URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://www.example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should accept valid https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://www.example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidUrl(123)).toBe(false);
      expect(isValidUrl({})).toBe(false);
      expect(isValidUrl([])).toBe(false);
    });
  });

  describe('hasValidUrlFormat', () => {
    it('should accept URLs with http/https prefix', () => {
      expect(hasValidUrlFormat('http://example.com')).toBe(true);
      expect(hasValidUrlFormat('https://example.com')).toBe(true);
      expect(hasValidUrlFormat('HTTP://EXAMPLE.COM')).toBe(true);
    });

    it('should reject URLs without protocol', () => {
      expect(hasValidUrlFormat('example.com')).toBe(false);
      expect(hasValidUrlFormat('www.example.com')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(hasValidUrlFormat('  https://example.com  ')).toBe(true);
      expect(hasValidUrlFormat('  example.com  ')).toBe(false);
    });

    it('should reject empty and invalid inputs', () => {
      expect(hasValidUrlFormat('')).toBe(false);
      expect(hasValidUrlFormat(null)).toBe(false);
      expect(hasValidUrlFormat(undefined)).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should preserve valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should add https:// to URLs without protocol', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should return empty string for invalid URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('not a url at all')).toBe('');
    });

    it('should handle edge cases', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
      expect(sanitizeUrl('  example.com  ')).toBe('https://example.com');
    });
  });

  describe('isValidUrlLength', () => {
    it('should accept URLs within default limit', () => {
      expect(isValidUrlLength('https://example.com')).toBe(true);
      expect(isValidUrlLength('https://example.com/' + 'a'.repeat(2000))).toBe(true);
    });

    it('should reject URLs exceeding default limit', () => {
      expect(isValidUrlLength('https://example.com/' + 'a'.repeat(3000))).toBe(false);
    });

    it('should respect custom max length', () => {
      expect(isValidUrlLength('https://example.com', 10)).toBe(false);
      expect(isValidUrlLength('https://ex', 10)).toBe(true);
    });

    it('should accept empty URLs', () => {
      expect(isValidUrlLength('')).toBe(true);
      expect(isValidUrlLength(null)).toBe(true);
      expect(isValidUrlLength(undefined)).toBe(true);
    });
  });

  describe('validateProfileUrl', () => {
    it('should validate correct URLs', () => {
      const result = validateProfileUrl('https://example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow empty URLs', () => {
      const result = validateProfileUrl('');
      expect(result.valid).toBe(true);
    });

    it('should detect URLs without protocol', () => {
      const result = validateProfileUrl('example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('http:// or https://');
    });

    it('should detect URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = validateProfileUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should detect invalid URL format', () => {
      const result = validateProfileUrl('not a valid url');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateProfileLink', () => {
    it('should validate correct link objects', () => {
      const link = {
        label: 'My Website',
        url: 'https://example.com',
        type: 'Website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should require label', () => {
      const link = {
        label: '',
        url: 'https://example.com',
        type: 'Website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.label).toBeDefined();
    });

    it('should enforce label max length', () => {
      const link = {
        label: 'a'.repeat(41),
        url: 'https://example.com',
        type: 'Website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.label).toContain('40 characters');
    });

    it('should require url', () => {
      const link = {
        label: 'My Website',
        url: '',
        type: 'Website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.url).toBeDefined();
    });

    it('should validate url format', () => {
      const link = {
        label: 'My Website',
        url: 'not a url',
        type: 'Website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.url).toBeDefined();
    });

    it('should enforce type max length', () => {
      const link = {
        label: 'My Website',
        url: 'https://example.com',
        type: 'a'.repeat(31)
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.type).toContain('30 characters');
    });

    it('should allow optional type', () => {
      const link = {
        label: 'My Website',
        url: 'https://example.com'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(true);
    });

    it('should handle invalid input', () => {
      const result = validateProfileLink(null);
      expect(result.valid).toBe(false);
      expect(result.errors._form).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    it('should reject javascript: protocol', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: protocol', () => {
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject vbscript: protocol', () => {
      expect(isValidUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('should reject file: protocol', () => {
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
    });
  });
});

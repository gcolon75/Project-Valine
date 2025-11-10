// src/utils/__tests__/urlValidation.test.js
import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  hasValidUrlFormat,
  sanitizeUrl,
  isValidUrlLength,
  validateProfileUrl,
  validateProfileLink,
  validateProfileLinks,
  VALID_LINK_TYPES,
  MAX_PROFILE_LINKS
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
        type: 'website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should require label', () => {
      const link = {
        label: '',
        url: 'https://example.com',
        type: 'website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.label).toBeDefined();
    });

    it('should enforce label min length (1 character)', () => {
      const link = {
        label: '',
        url: 'https://example.com',
        type: 'website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.label).toBeDefined();
    });

    it('should enforce label max length (40 characters)', () => {
      const link = {
        label: 'a'.repeat(41),
        url: 'https://example.com',
        type: 'website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.label).toContain('40 characters');
    });

    it('should require url', () => {
      const link = {
        label: 'My Website',
        url: '',
        type: 'website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.url).toBeDefined();
    });

    it('should validate url format', () => {
      const link = {
        label: 'My Website',
        url: 'not a url',
        type: 'website'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.url).toBeDefined();
    });

    it('should require type', () => {
      const link = {
        label: 'My Website',
        url: 'https://example.com'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.type).toBeDefined();
    });

    it('should enforce valid link types', () => {
      const link = {
        label: 'My Website',
        url: 'https://example.com',
        type: 'invalid-type'
      };
      const result = validateProfileLink(link);
      expect(result.valid).toBe(false);
      expect(result.errors.type).toContain('website, imdb, showreel, other');
    });

    it('should accept all valid link types', () => {
      VALID_LINK_TYPES.forEach(type => {
        const link = {
          label: 'Test Link',
          url: 'https://example.com',
          type
        };
        const result = validateProfileLink(link);
        expect(result.valid).toBe(true);
      });
    });

    it('should handle invalid input', () => {
      const result = validateProfileLink(null);
      expect(result.valid).toBe(false);
      expect(result.errors._form).toBeDefined();
    });
  });

  describe('validateProfileLinks', () => {
    it('should validate array of valid links', () => {
      const links = [
        { label: 'Website', url: 'https://example.com', type: 'website' },
        { label: 'IMDb', url: 'https://imdb.com/name/nm0000001', type: 'imdb' },
      ];
      const result = validateProfileLinks(links);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.globalErrors).toEqual([]);
    });

    it('should reject non-array input', () => {
      const result = validateProfileLinks('not an array');
      expect(result.valid).toBe(false);
      expect(result.globalErrors).toContain('Links must be an array');
    });

    it('should enforce max links constraint', () => {
      const links = Array(MAX_PROFILE_LINKS + 1).fill({
        label: 'Test',
        url: 'https://example.com',
        type: 'website'
      });
      const result = validateProfileLinks(links);
      expect(result.valid).toBe(false);
      expect(result.globalErrors[0]).toContain(`Maximum of ${MAX_PROFILE_LINKS} links`);
    });

    it('should collect validation errors for each invalid link', () => {
      const links = [
        { label: 'Valid', url: 'https://example.com', type: 'website' },
        { label: '', url: 'https://example.com', type: 'website' }, // Invalid label
        { label: 'Invalid URL', url: 'not-a-url', type: 'website' }, // Invalid URL
      ];
      const result = validateProfileLinks(links);
      expect(result.valid).toBe(false);
      expect(result.errors[1]).toBeDefined();
      expect(result.errors[2]).toBeDefined();
    });

    it('should allow empty arrays', () => {
      const result = validateProfileLinks([]);
      expect(result.valid).toBe(true);
    });

    it('should allow exactly max links', () => {
      const links = Array(MAX_PROFILE_LINKS).fill({
        label: 'Test',
        url: 'https://example.com',
        type: 'website'
      });
      const result = validateProfileLinks(links);
      expect(result.valid).toBe(true);
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

/**
 * Tests for moderation utilities
 * Covers profanity detection, URL validation, and content scanning
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  checkProfanity,
  validateUrl,
  sanitizeAndScanText,
  validateAndScanUrl,
  scanProfilePayload,
  scanLink,
  formatIssuesForResponse,
  getSeverityFromCategory,
  inferCategoryFromIssues,
  redactPII,
} from '../src/utils/moderation.js';

describe('Moderation Utilities', () => {
  beforeEach(() => {
    // Reset environment to defaults
    delete process.env.PROFANITY_LIST_PATH;
    delete process.env.URL_ALLOWED_DOMAINS;
    delete process.env.URL_BLOCKED_DOMAINS;
    delete process.env.URL_ALLOWED_PROTOCOLS;
    delete process.env.MODERATION_STRICT_MODE;
  });

  describe('Profanity Detection', () => {
    it('should detect profanity in text', () => {
      const result = checkProfanity('This is some shit content');
      
      expect(result.hasProfanity).toBe(true);
      expect(result.matches).toContain('shit');
    });

    it('should not detect profanity in clean text', () => {
      const result = checkProfanity('This is a nice clean message');
      
      expect(result.hasProfanity).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should use word boundaries to avoid false positives', () => {
      // "assistant" contains "ass" but should not be flagged
      const result = checkProfanity('I need an assistant for this task');
      
      expect(result.hasProfanity).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should normalize text before matching', () => {
      // Test with uppercase
      const result1 = checkProfanity('SHIT this is bad');
      expect(result1.hasProfanity).toBe(true);
      
      // Test with mixed case
      const result2 = checkProfanity('What the FuCk');
      expect(result2.hasProfanity).toBe(true);
    });

    it('should handle diacritics normalization', () => {
      // Some profanity might be written with accents to bypass filters
      const result = checkProfanity('This is shït');
      expect(result.hasProfanity).toBe(true);
    });

    it('should handle empty or null input', () => {
      expect(checkProfanity('').hasProfanity).toBe(false);
      expect(checkProfanity(null).hasProfanity).toBe(false);
      expect(checkProfanity(undefined).hasProfanity).toBe(false);
    });

    it('should detect multiple profane words', () => {
      const result = checkProfanity('This shit is fucking bad');
      
      expect(result.hasProfanity).toBe(true);
      expect(result.matches.length).toBeGreaterThan(1);
    });
  });

  describe('URL Validation', () => {
    it('should allow valid HTTP and HTTPS URLs', () => {
      const result1 = validateUrl('https://example.com/page');
      expect(result1.isSafe).toBe(true);
      expect(result1.issues).toHaveLength(0);
      
      const result2 = validateUrl('http://example.com');
      expect(result2.isSafe).toBe(true);
    });

    it('should allow mailto URLs', () => {
      const result = validateUrl('mailto:user@example.com');
      expect(result.isSafe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should block javascript: protocol', () => {
      const result = validateUrl('javascript:alert("XSS")');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(i => i.includes('javascript'))).toBe(true);
    });

    it('should block data: protocol', () => {
      const result = validateUrl('data:text/html,<script>alert("XSS")</script>');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(i => i.includes('data'))).toBe(true);
    });

    it('should block file: protocol', () => {
      const result = validateUrl('file:///etc/passwd');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(i => i.includes('file'))).toBe(true);
    });

    it('should detect inline JavaScript in URL', () => {
      const result = validateUrl('http://example.com?param=javascript:alert()');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(i => i.includes('JavaScript'))).toBe(true);
    });

    it('should block domains in blocklist', () => {
      process.env.URL_BLOCKED_DOMAINS = 'malware.com,phishing.test';
      
      const result = validateUrl('https://malware.com/page');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(i => i.includes('blocked'))).toBe(true);
    });

    it('should block subdomains of blocked domains', () => {
      process.env.URL_BLOCKED_DOMAINS = 'malware.com';
      
      const result = validateUrl('https://sub.malware.com/page');
      
      expect(result.isSafe).toBe(false);
    });

    it('should enforce allowlist in strict mode', () => {
      process.env.MODERATION_STRICT_MODE = 'true';
      process.env.URL_ALLOWED_DOMAINS = 'imdb.com,youtube.com';
      
      const result1 = validateUrl('https://imdb.com/title/123');
      expect(result1.isSafe).toBe(true);
      
      const result2 = validateUrl('https://example.com');
      expect(result2.isSafe).toBe(false);
      expect(result2.issues.some(i => i.includes('not in allowed list'))).toBe(true);
    });

    it('should flag suspicious TLDs', () => {
      const result = validateUrl('https://example.xyz');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(i => i.includes('Suspicious TLD'))).toBe(true);
    });

    it('should handle invalid URL format', () => {
      const result = validateUrl('not a url');
      
      expect(result.isSafe).toBe(false);
      expect(result.issues).toContain('Invalid URL format');
    });

    it('should handle empty or null URL', () => {
      expect(validateUrl('').isSafe).toBe(false);
      expect(validateUrl(null).isSafe).toBe(false);
      expect(validateUrl(undefined).isSafe).toBe(false);
    });
  });

  describe('Text Sanitization and Scanning', () => {
    it('should scan text for profanity', () => {
      const result = sanitizeAndScanText('This is shit', 'bio');
      
      expect(result.ok).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].field).toBe('bio');
      expect(result.issues[0].reason).toContain('profane');
    });

    it('should trim whitespace', () => {
      const result = sanitizeAndScanText('  Clean text  ', 'headline');
      
      expect(result.ok).toBe(true);
      expect(result.normalizedText).toBe('Clean text');
    });

    it('should handle empty text', () => {
      const result = sanitizeAndScanText('', 'bio');
      
      expect(result.ok).toBe(true);
      expect(result.normalizedText).toBe('');
    });
  });

  describe('URL Scanning', () => {
    it('should scan URL for safety', () => {
      const result = validateAndScanUrl('javascript:alert()', 'socialLinks.website');
      
      expect(result.ok).toBe(false);
      expect(result.issues).toHaveLength(2); // Two issues for javascript protocol
      expect(result.issues[0].field).toBe('socialLinks.website');
    });

    it('should pass safe URLs', () => {
      const result = validateAndScanUrl('https://example.com', 'url');
      
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Profile Payload Scanning', () => {
    it('should scan all profile fields', () => {
      const payload = {
        displayName: 'John Doe',
        headline: 'Actor and Director',
        bio: 'Clean professional bio',
        socialLinks: {
          website: 'https://example.com',
          imdb: 'https://imdb.com/name/123',
        },
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect profanity in displayName', () => {
      const payload = {
        displayName: 'Shitty Name',
        headline: 'Actor',
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.field === 'displayName')).toBe(true);
    });

    it('should detect profanity in headline', () => {
      const payload = {
        displayName: 'John Doe',
        headline: 'Fucking awesome actor',
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.field === 'headline')).toBe(true);
    });

    it('should detect profanity in bio', () => {
      const payload = {
        bio: 'This is my damn bio',
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.field === 'bio')).toBe(true);
    });

    it('should detect unsafe URLs in socialLinks', () => {
      const payload = {
        socialLinks: {
          website: 'javascript:alert()',
        },
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.field.includes('socialLinks'))).toBe(true);
    });

    it('should accumulate multiple issues', () => {
      const payload = {
        displayName: 'Shitty Name',
        headline: 'Damn good actor',
        socialLinks: {
          website: 'javascript:alert()',
        },
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.ok).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    });

    it('should normalize text fields', () => {
      const payload = {
        displayName: '  John Doe  ',
        headline: '  Actor  ',
      };
      
      const result = scanProfilePayload(payload);
      
      expect(result.normalizedPayload.displayName).toBe('John Doe');
      expect(result.normalizedPayload.headline).toBe('Actor');
    });
  });

  describe('Link Scanning', () => {
    it('should scan link label and URL', () => {
      const link = {
        label: 'My Website',
        url: 'https://example.com',
        type: 'website',
      };
      
      const result = scanLink(link);
      
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect profanity in label', () => {
      const link = {
        label: 'Shitty link',
        url: 'https://example.com',
      };
      
      const result = scanLink(link);
      
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.field === 'label')).toBe(true);
    });

    it('should detect unsafe URL', () => {
      const link = {
        label: 'My Link',
        url: 'javascript:alert()',
      };
      
      const result = scanLink(link);
      
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.field === 'url')).toBe(true);
    });
  });

  describe('Response Formatting', () => {
    it('should format issues for API response', () => {
      const issues = [
        { field: 'displayName', reason: 'Contains profane language' },
        { field: 'url', reason: 'Unsafe protocol detected' },
      ];
      
      const result = formatIssuesForResponse(issues);
      
      expect(result.code).toBe('MODERATION_BLOCKED');
      expect(result.message).toContain('blocked');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].name).toBe('displayName');
      expect(result.fields[1].name).toBe('url');
    });
  });

  describe('Category and Severity', () => {
    it('should map category to severity', () => {
      expect(getSeverityFromCategory('spam')).toBe(1);
      expect(getSeverityFromCategory('abuse')).toBe(3);
      expect(getSeverityFromCategory('unsafe_link')).toBe(2);
      expect(getSeverityFromCategory('profanity')).toBe(1);
      expect(getSeverityFromCategory('privacy')).toBe(2);
      expect(getSeverityFromCategory('other')).toBe(0);
    });

    it('should infer category from URL issues', () => {
      const issues = [
        { field: 'url', reason: 'Unsafe protocol detected' },
      ];
      
      const category = inferCategoryFromIssues(issues);
      
      expect(category).toBe('unsafe_link');
    });

    it('should infer category from profanity issues', () => {
      const issues = [
        { field: 'bio', reason: 'Contains profane language' },
      ];
      
      const category = inferCategoryFromIssues(issues);
      
      expect(category).toBe('profanity');
    });

    it('should default to other for unknown issues', () => {
      const issues = [
        { field: 'name', reason: 'Some unknown issue' },
      ];
      
      const category = inferCategoryFromIssues(issues);
      
      expect(category).toBe('other');
    });
  });

  describe('PII Redaction', () => {
    it('should redact PII with first 6 and last 4 chars', () => {
      const value = '1234567890abcdef';
      const redacted = redactPII(value);
      
      expect(redacted).toBe('123456******cdef');
      expect(redacted.length).toBe(value.length);
    });

    it('should redact short values completely', () => {
      const value = 'short';
      const redacted = redactPII(value);
      
      expect(redacted).toBe('*****');
    });

    it('should handle empty or null values', () => {
      expect(redactPII('')).toBe('[redacted]');
      expect(redactPII(null)).toBe('[redacted]');
      expect(redactPII(undefined)).toBe('[redacted]');
    });
  });
});

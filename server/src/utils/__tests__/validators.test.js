/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest'
import {
  createError,
  validateUrl,
  validateTheme,
  validateStringLength,
  sanitizeString
} from '../validators.js'

describe('Validation Utilities', () => {
  describe('createError', () => {
    it('should create error object with code and message', () => {
      const error = createError('TEST_ERROR', 'Test error message')
      
      expect(error).toEqual({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          details: {}
        }
      })
    })

    it('should include details when provided', () => {
      const error = createError('TEST_ERROR', 'Test error', { field: 'test' })
      
      expect(error.error.details).toEqual({ field: 'test' })
    })
  })

  describe('validateUrl', () => {
    it('should accept valid http URL', () => {
      const result = validateUrl('http://example.com')
      expect(result.valid).toBe(true)
    })

    it('should accept valid https URL', () => {
      const result = validateUrl('https://example.com')
      expect(result.valid).toBe(true)
    })

    it('should accept URL with path', () => {
      const result = validateUrl('https://example.com/path/to/page')
      expect(result.valid).toBe(true)
    })

    it('should accept URL with query params', () => {
      const result = validateUrl('https://example.com?key=value')
      expect(result.valid).toBe(true)
    })

    it('should accept empty string', () => {
      const result = validateUrl('')
      expect(result.valid).toBe(true)
    })

    it('should accept null', () => {
      const result = validateUrl(null)
      expect(result.valid).toBe(true)
    })

    it('should accept undefined', () => {
      const result = validateUrl(undefined)
      expect(result.valid).toBe(true)
    })

    it('should reject ftp protocol', () => {
      const result = validateUrl('ftp://example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('protocol')
    })

    it('should reject file protocol', () => {
      const result = validateUrl('file:///path/to/file')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('protocol')
    })

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid URL')
    })

    it('should reject URL without protocol', () => {
      const result = validateUrl('example.com')
      expect(result.valid).toBe(false)
    })

    it('should reject extremely long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2049)
      const result = validateUrl(longUrl)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('length')
    })

    it('should accept URL at max length', () => {
      const maxUrl = 'https://example.com/' + 'a'.repeat(2020)
      const result = validateUrl(maxUrl)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateTheme', () => {
    it('should accept "light"', () => {
      const result = validateTheme('light')
      expect(result.valid).toBe(true)
    })

    it('should accept "dark"', () => {
      const result = validateTheme('dark')
      expect(result.valid).toBe(true)
    })

    it('should accept null', () => {
      const result = validateTheme(null)
      expect(result.valid).toBe(true)
    })

    it('should accept undefined', () => {
      const result = validateTheme(undefined)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid theme', () => {
      const result = validateTheme('invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('light')
      expect(result.error).toContain('dark')
    })

    it('should reject numeric value', () => {
      const result = validateTheme(123)
      expect(result.valid).toBe(false)
    })

    it('should reject object', () => {
      const result = validateTheme({ theme: 'light' })
      expect(result.valid).toBe(false)
    })
  })

  describe('validateStringLength', () => {
    it('should accept string within bounds', () => {
      const result = validateStringLength('hello', 1, 10, 'test')
      expect(result.valid).toBe(true)
    })

    it('should accept string at min length', () => {
      const result = validateStringLength('hi', 2, 10, 'test')
      expect(result.valid).toBe(true)
    })

    it('should accept string at max length', () => {
      const result = validateStringLength('hello', 1, 5, 'test')
      expect(result.valid).toBe(true)
    })

    it('should reject string below min length', () => {
      const result = validateStringLength('hi', 3, 10, 'test')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 3')
    })

    it('should reject string above max length', () => {
      const result = validateStringLength('hello world', 1, 5, 'test')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exceed 5')
    })

    it('should accept empty string when min is 0', () => {
      const result = validateStringLength('', 0, 10, 'test')
      expect(result.valid).toBe(true)
    })

    it('should reject empty string when min > 0', () => {
      const result = validateStringLength('', 1, 10, 'test')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should accept null when min is 0', () => {
      const result = validateStringLength(null, 0, 10, 'test')
      expect(result.valid).toBe(true)
    })

    it('should reject null when min > 0', () => {
      const result = validateStringLength(null, 1, 10, 'test')
      expect(result.valid).toBe(false)
    })

    it('should accept undefined when min is 0', () => {
      const result = validateStringLength(undefined, 0, 10, 'test')
      expect(result.valid).toBe(true)
    })

    it('should use field name in error message', () => {
      const result = validateStringLength('', 1, 10, 'username')
      expect(result.error).toContain('username')
    })
  })

  describe('sanitizeString', () => {
    it('should trim leading whitespace', () => {
      expect(sanitizeString('  hello')).toBe('hello')
    })

    it('should trim trailing whitespace', () => {
      expect(sanitizeString('hello  ')).toBe('hello')
    })

    it('should trim both leading and trailing whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello')
    })

    it('should preserve internal whitespace', () => {
      expect(sanitizeString('hello  world')).toBe('hello  world')
    })

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('')
    })

    it('should handle null', () => {
      expect(sanitizeString(null)).toBe(null)
    })

    it('should handle undefined', () => {
      expect(sanitizeString(undefined)).toBe(undefined)
    })

    it('should convert numbers to strings', () => {
      expect(sanitizeString(123)).toBe('123')
    })

    it('should handle strings with only whitespace', () => {
      expect(sanitizeString('   ')).toBe('')
    })

    it('should handle newlines', () => {
      expect(sanitizeString('  hello\nworld  ')).toBe('hello\nworld')
    })
  })

  describe('Integration Tests', () => {
    it('should validate and sanitize title', () => {
      const input = '  Senior Voice Actor  '
      const sanitized = sanitizeString(input)
      const validation = validateStringLength(sanitized, 0, 100, 'title')
      
      expect(sanitized).toBe('Senior Voice Actor')
      expect(validation.valid).toBe(true)
    })

    it('should catch invalid URL in social links', () => {
      const urls = {
        website: 'https://example.com',
        instagram: 'not-a-url'
      }
      
      expect(validateUrl(urls.website).valid).toBe(true)
      expect(validateUrl(urls.instagram).valid).toBe(false)
    })

    it('should validate theme preference workflow', () => {
      const validThemes = ['light', 'dark', null]
      const invalidThemes = ['blue', 'red', 123]
      
      validThemes.forEach(theme => {
        expect(validateTheme(theme).valid).toBe(true)
      })
      
      invalidThemes.forEach(theme => {
        expect(validateTheme(theme).valid).toBe(false)
      })
    })
  })
})

/**
 * Unit tests for analytics configuration
 */

import { describe, it, expect } from 'vitest';
import { 
  analyticsConfig, 
  isEventAllowed, 
  hasDisallowedProperties, 
  sanitizeProperties 
} from '../../../serverless/src/config/analytics.js';

describe('Analytics Configuration', () => {
  describe('isEventAllowed', () => {
    it('should allow events in the allowed list', () => {
      expect(isEventAllowed('page_view')).toBe(true);
      expect(isEventAllowed('signup')).toBe(true);
      expect(isEventAllowed('login')).toBe(true);
      expect(isEventAllowed('profile_update')).toBe(true);
      expect(isEventAllowed('media_upload')).toBe(true);
      expect(isEventAllowed('logout')).toBe(true);
    });

    it('should reject events not in the allowed list', () => {
      expect(isEventAllowed('custom_event')).toBe(false);
      expect(isEventAllowed('delete_account')).toBe(false);
      expect(isEventAllowed('')).toBe(false);
    });
  });

  describe('hasDisallowedProperties', () => {
    it('should detect disallowed property keys', () => {
      expect(hasDisallowedProperties({ email: 'test@example.com' })).toBe(true);
      expect(hasDisallowedProperties({ password: '123456' })).toBe(true);
      expect(hasDisallowedProperties({ token: 'abc123' })).toBe(true);
      expect(hasDisallowedProperties({ apiKey: 'secret' })).toBe(true);
      expect(hasDisallowedProperties({ ipAddress: '127.0.0.1' })).toBe(true);
    });

    it('should detect disallowed properties with mixed case', () => {
      expect(hasDisallowedProperties({ Email: 'test@example.com' })).toBe(true);
      expect(hasDisallowedProperties({ PASSWORD: '123456' })).toBe(true);
      expect(hasDisallowedProperties({ AccessToken: 'abc123' })).toBe(true);
    });

    it('should detect disallowed properties in compound keys', () => {
      expect(hasDisallowedProperties({ user_email: 'test@example.com' })).toBe(true);
      expect(hasDisallowedProperties({ access_token: 'abc123' })).toBe(true);
    });

    it('should allow safe properties', () => {
      expect(hasDisallowedProperties({ path: '/dashboard' })).toBe(false);
      expect(hasDisallowedProperties({ success: true })).toBe(false);
      expect(hasDisallowedProperties({ method: 'password' })).toBe(false);
      expect(hasDisallowedProperties({ type: 'video' })).toBe(false);
    });

    it('should handle null/undefined properties', () => {
      expect(hasDisallowedProperties(null)).toBe(false);
      expect(hasDisallowedProperties(undefined)).toBe(false);
      expect(hasDisallowedProperties({})).toBe(false);
    });
  });

  describe('sanitizeProperties', () => {
    it('should remove disallowed property keys', () => {
      const input = {
        path: '/dashboard',
        email: 'test@example.com',
        success: true
      };
      const sanitized = sanitizeProperties(input);
      expect(sanitized).toEqual({
        path: '/dashboard',
        success: true
      });
      expect(sanitized).not.toHaveProperty('email');
    });

    it('should handle multiple disallowed properties', () => {
      const input = {
        path: '/dashboard',
        email: 'test@example.com',
        token: 'abc123',
        password: 'secret',
        success: true
      };
      const sanitized = sanitizeProperties(input);
      expect(sanitized).toEqual({
        path: '/dashboard',
        success: true
      });
    });

    it('should preserve safe properties', () => {
      const input = {
        path: '/profile',
        method: 'password',
        success: true,
        fieldsChanged: ['headline', 'bio']
      };
      const sanitized = sanitizeProperties(input);
      expect(sanitized).toEqual(input);
    });

    it('should handle null/undefined input', () => {
      expect(sanitizeProperties(null)).toBeNull();
      expect(sanitizeProperties(undefined)).toBeUndefined();
      expect(sanitizeProperties({})).toEqual({});
    });
  });

  describe('analyticsConfig', () => {
    it('should have correct default values', () => {
      expect(analyticsConfig.enabled).toBe(false);
      expect(analyticsConfig.requireConsent).toBe(true);
      expect(analyticsConfig.persistEnabled).toBe(true);
      expect(analyticsConfig.retentionDays).toBe(30);
      expect(analyticsConfig.samplingRate).toBe(1.0);
      expect(analyticsConfig.maxBatchSize).toBe(50);
    });

    it('should have property denylist', () => {
      expect(analyticsConfig.propertyDenylist).toBeInstanceOf(Array);
      expect(analyticsConfig.propertyDenylist.length).toBeGreaterThan(0);
      expect(analyticsConfig.propertyDenylist).toContain('email');
      expect(analyticsConfig.propertyDenylist).toContain('password');
      expect(analyticsConfig.propertyDenylist).toContain('token');
    });

    it('should have allowed events list', () => {
      expect(analyticsConfig.allowedEvents).toBeInstanceOf(Array);
      expect(analyticsConfig.allowedEvents).toContain('page_view');
      expect(analyticsConfig.allowedEvents).toContain('login');
      expect(analyticsConfig.allowedEvents).toContain('signup');
    });
  });
});

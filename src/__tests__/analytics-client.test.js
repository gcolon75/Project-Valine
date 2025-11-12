/**
 * Unit tests for analytics client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  setConsent, 
  hasConsent, 
  shouldShowConsentBanner,
  queueEvent,
  trackPageView,
  trackLogin,
  trackSignup
} from '../analytics/client.js';

// Mock fetch
const fetchMock = vi.fn();
fetchMock = fetchMock;

// Mock document.cookie
let cookieStore = '';
Object.defineProperty(document, 'cookie', {
  get: () => cookieStore,
  set: (value) => {
    const cookies = cookieStore.split(';').filter(c => c.trim());
    const [name] = value.split('=');
    const cleanName = name.trim();
    
    // Remove existing cookie with same name
    cookieStore = cookies.filter(c => !c.trim().startsWith(cleanName)).join(';');
    
    // Add new cookie if not being deleted
    if (!value.includes('expires=Thu, 01 Jan 1970')) {
      if (cookieStore) cookieStore += ';';
      cookieStore += value.split(';')[0];
    }
  }
});

describe('Analytics Client', () => {
  beforeEach(() => {
    // Reset cookies
    cookieStore = '';
    
    // Reset fetch mock
    fetchMock.mockReset();
    
    // Mock successful config response
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled: true,
        requireConsent: true,
        allowedEvents: ['page_view', 'signup', 'login', 'profile_update', 'media_upload', 'logout'],
        samplingRate: 1.0,
        consentCookie: 'analytics_consent'
      })
    });
  });

  describe('Consent Management', () => {
    it('should set consent cookie when accepting', () => {
      setConsent(true);
      expect(document.cookie).toContain('analytics_consent=accept');
    });

    it('should set consent cookie when declining', () => {
      setConsent(false);
      expect(document.cookie).toContain('analytics_consent=decline');
    });

    it('should detect consent status', () => {
      setConsent(true);
      expect(hasConsent()).toBe(true);
      
      setConsent(false);
      expect(hasConsent()).toBe(false);
    });

    it('should return false for hasConsent when no decision made', () => {
      expect(hasConsent()).toBe(false);
    });

    it('should remove anonId cookie when declining', () => {
      // First set an anonId cookie
      document.cookie = 'analytics_uuid=test-uuid; path=/';
      expect(document.cookie).toContain('analytics_uuid');
      
      // Decline consent
      setConsent(false);
      
      // anonId cookie should be removed
      expect(document.cookie).not.toContain('analytics_uuid=test-uuid');
    });
  });

  describe('Event Queuing', () => {
    beforeEach(async () => {
      // Set consent before queuing events
      setConsent(true);
    });

    it('should queue page_view event', async () => {
      await trackPageView('/dashboard', 'https://example.com');
      
      // Wait a bit for queue to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have called fetch to send events
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should queue login event', async () => {
      await trackLogin('password', true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should queue signup event', async () => {
      await trackSignup('password', true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('Sampling Rate', () => {
    it('should respect sampling rate < 1.0', async () => {
      // Mock config with low sampling rate
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          enabled: true,
          requireConsent: true,
          allowedEvents: ['page_view'],
          samplingRate: 0.0, // Never sample
          consentCookie: 'analytics_consent'
        })
      });
      
      setConsent(true);
      
      // Try to queue multiple events
      for (let i = 0; i < 10; i++) {
        await queueEvent('page_view', { path: `/page${i}` });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should only have called fetch once for config, not for events
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Flags', () => {
    it('should not queue events when analytics disabled', async () => {
      // Mock config with analytics disabled
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          enabled: false,
          requireConsent: true,
          allowedEvents: [],
          samplingRate: 1.0,
          consentCookie: 'analytics_consent'
        })
      });
      
      setConsent(true);
      await queueEvent('page_view', { path: '/test' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should only have called fetch for config, not for events
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not queue events without consent when required', async () => {
      // Don't set consent
      await queueEvent('page_view', { path: '/test' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have loaded config but not sent events
      const calls = fetchMock.mock.calls;
      const eventCalls = calls.filter(call => call[0].includes('/analytics/ingest'));
      expect(eventCalls.length).toBe(0);
    });

    it('should not queue disallowed events', async () => {
      setConsent(true);
      
      // Try to queue an event not in allowed list
      await queueEvent('custom_event', { data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have loaded config but not sent the custom event
      const calls = fetchMock.mock.calls;
      const ingestCalls = calls.filter(call => call[0].includes('/analytics/ingest'));
      expect(ingestCalls.length).toBe(0);
    });
  });
});

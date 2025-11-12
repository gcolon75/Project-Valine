import { describe, it, expect } from 'vitest';
import {
  routeMetadata,
  getMetadataForRoute,
  buildCanonicalUrl,
  SEO_CONFIG,
} from '../metaConfig';

describe('metaConfig', () => {
  describe('routeMetadata', () => {
    it('should have complete metadata for home route', () => {
      const meta = routeMetadata['/'];
      expect(meta).toBeDefined();
      expect(meta.title).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.canonicalSegment).toBeDefined();
      expect(meta.noIndex).toBe(false);
    });

    it('should have titles under 60 characters', () => {
      Object.values(routeMetadata).forEach((meta) => {
        expect(meta.title.length).toBeLessThanOrEqual(60);
      });
    });

    it('should have descriptions between 50-160 characters', () => {
      Object.values(routeMetadata).forEach((meta) => {
        expect(meta.description.length).toBeGreaterThanOrEqual(50);
        expect(meta.description.length).toBeLessThanOrEqual(160);
      });
    });

    it('should mark auth pages as noIndex', () => {
      expect(routeMetadata['/login'].noIndex).toBe(true);
      expect(routeMetadata['/signup-page'].noIndex).toBe(true);
      expect(routeMetadata['/login-page'].noIndex).toBe(true);
      expect(routeMetadata['/onboarding'].noIndex).toBe(true);
    });

    it('should not mark marketing pages as noIndex', () => {
      expect(routeMetadata['/'].noIndex).toBe(false);
      expect(routeMetadata['/join'].noIndex).toBe(false);
      expect(routeMetadata['/#features'].noIndex).toBe(false);
    });
  });

  describe('getMetadataForRoute', () => {
    it('should return exact match for root path', () => {
      const meta = getMetadataForRoute('/');
      expect(meta.title).toBe(routeMetadata['/'].title);
    });

    it('should return metadata for join page', () => {
      const meta = getMetadataForRoute('/join');
      expect(meta.title).toContain('Join');
    });

    it('should handle hash navigation', () => {
      const meta = getMetadataForRoute('/#features');
      expect(meta.title).toContain('Features');
    });

    it('should fallback to home metadata for unknown routes', () => {
      const meta = getMetadataForRoute('/unknown-route');
      expect(meta.title).toBe(routeMetadata['/'].title);
      expect(meta.description).toBe(SEO_CONFIG.defaultDescription);
    });

    it('should handle paths with query parameters', () => {
      const meta = getMetadataForRoute('/join?ref=twitter');
      expect(meta.title).toContain('Join');
    });
  });

  describe('buildCanonicalUrl', () => {
    it('should build URL with domain', () => {
      const url = buildCanonicalUrl('');
      expect(url).toBe(SEO_CONFIG.siteDomain);
    });

    it('should build URL with segment', () => {
      const url = buildCanonicalUrl('join');
      expect(url).toBe(`${SEO_CONFIG.siteDomain}/join`);
    });

    it('should remove trailing slashes', () => {
      const url = buildCanonicalUrl('join/');
      expect(url).toBe(`${SEO_CONFIG.siteDomain}/join`);
    });

    it('should handle hash segments', () => {
      const url = buildCanonicalUrl('#features');
      expect(url).toBe(`${SEO_CONFIG.siteDomain}/#features`);
    });
  });

  describe('SEO_CONFIG', () => {
    it('should have required configuration properties', () => {
      expect(SEO_CONFIG.siteName).toBeTruthy();
      expect(SEO_CONFIG.siteDomain).toBeTruthy();
      expect(SEO_CONFIG.defaultDescription).toBeTruthy();
      expect(SEO_CONFIG.ogImageDefault).toBeTruthy();
      expect(SEO_CONFIG.themeColor).toBeTruthy();
      expect(SEO_CONFIG.language).toBe('en');
    });

    it('should have valid theme color format', () => {
      expect(SEO_CONFIG.themeColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have valid OG image path', () => {
      expect(SEO_CONFIG.ogImageDefault).toMatch(/^\/.*\.(png|jpg|jpeg)$/);
    });
  });
});

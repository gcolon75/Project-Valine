import { describe, it, expect } from 'vitest';
import { generateSitemap } from '../build-sitemap.mjs';

describe('build-sitemap', () => {
  describe('generateSitemap', () => {
    it('should generate valid XML', () => {
      const sitemap = generateSitemap();
      
      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap).toContain('</urlset>');
    });

    it('should include home page', () => {
      const sitemap = generateSitemap();
      
      expect(sitemap).toContain('<loc>https://projectvaline.com</loc>');
    });

    it('should include join page', () => {
      const sitemap = generateSitemap();
      
      expect(sitemap).toContain('<loc>https://projectvaline.com/join</loc>');
    });

    it('should include required elements for each URL', () => {
      const sitemap = generateSitemap();
      
      // Each URL should have loc, lastmod, changefreq, and priority
      const urlMatches = sitemap.match(/<url>/g);
      const locMatches = sitemap.match(/<loc>/g);
      const lastmodMatches = sitemap.match(/<lastmod>/g);
      const changefreqMatches = sitemap.match(/<changefreq>/g);
      const priorityMatches = sitemap.match(/<priority>/g);
      
      expect(urlMatches?.length).toBeGreaterThan(0);
      expect(locMatches?.length).toBe(urlMatches?.length);
      expect(lastmodMatches?.length).toBe(urlMatches?.length);
      expect(changefreqMatches?.length).toBe(urlMatches?.length);
      expect(priorityMatches?.length).toBe(urlMatches?.length);
    });

    it('should have valid ISO 8601 lastmod dates', () => {
      const sitemap = generateSitemap();
      
      const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/g;
      const matches = [...sitemap.matchAll(lastmodRegex)];
      
      matches.forEach(match => {
        const date = match[1];
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(date).toISOString()).toBe(date);
      });
    });

    it('should have valid changefreq values', () => {
      const sitemap = generateSitemap();
      
      const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      const changefreqRegex = /<changefreq>(.*?)<\/changefreq>/g;
      const matches = [...sitemap.matchAll(changefreqRegex)];
      
      matches.forEach(match => {
        const freq = match[1];
        expect(validFreqs).toContain(freq);
      });
    });

    it('should have valid priority values (0.0-1.0)', () => {
      const sitemap = generateSitemap();
      
      const priorityRegex = /<priority>(.*?)<\/priority>/g;
      const matches = [...sitemap.matchAll(priorityRegex)];
      
      matches.forEach(match => {
        const priority = parseFloat(match[1]);
        expect(priority).toBeGreaterThanOrEqual(0);
        expect(priority).toBeLessThanOrEqual(1.0);
      });
    });

    it('should not include trailing slashes in URLs', () => {
      const sitemap = generateSitemap();
      
      const locRegex = /<loc>(.*?)<\/loc>/g;
      const matches = [...sitemap.matchAll(locRegex)];
      
      matches.forEach(match => {
        const url = match[1];
        if (!url.endsWith('.com') && !url.endsWith('.org')) {
          expect(url).not.toMatch(/\/$/);
        }
      });
    });

    it('should not include anchor links', () => {
      const sitemap = generateSitemap();
      
      // Anchor links (#features, #about) should not be in sitemap
      expect(sitemap).not.toContain('#features');
      expect(sitemap).not.toContain('#about');
      expect(sitemap).not.toContain('#faq');
    });
  });
});

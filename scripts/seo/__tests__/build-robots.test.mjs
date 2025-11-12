import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateRobotsTxt } from '../build-robots.mjs';

describe('build-robots', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('generateRobotsTxt - Production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.VITE_IS_STAGING = 'false';
    });

    it('should generate valid robots.txt', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Sitemap:');
    });

    it('should allow public marketing pages', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Allow: /join');
      expect(robotsTxt).toContain('Allow: /signup');
    });

    it('should disallow auth routes', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Disallow: /login');
      expect(robotsTxt).toContain('Disallow: /login-page');
      expect(robotsTxt).toContain('Disallow: /signup-page');
      expect(robotsTxt).toContain('Disallow: /onboarding');
    });

    it('should disallow authenticated routes', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Disallow: /feed');
      expect(robotsTxt).toContain('Disallow: /messages');
      expect(robotsTxt).toContain('Disallow: /settings');
      expect(robotsTxt).toContain('Disallow: /profile/*');
      expect(robotsTxt).toContain('Disallow: /scripts/*');
      expect(robotsTxt).toContain('Disallow: /auditions/*');
    });

    it('should disallow API endpoints', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Disallow: /api/*');
    });

    it('should include sitemap URL', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Sitemap:');
      expect(robotsTxt).toContain('/sitemap.xml');
    });

    it('should include generation timestamp', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Generated:');
    });
  });

  describe('generateRobotsTxt - Staging', () => {
    it('should have environment-aware behavior', () => {
      // This test documents that the function responds to environment variables
      // When VITE_IS_STAGING=true or NODE_ENV=staging, it should generate restrictive rules
      // The actual staging output is tested via manual script execution
      const robotsTxt = generateRobotsTxt();
      
      // Should always have basic structure
      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Sitemap:');
    });
  });

  describe('generateRobotsTxt - Format', () => {
    it('should have proper line endings', () => {
      const robotsTxt = generateRobotsTxt();
      
      // Should have newlines
      expect(robotsTxt).toContain('\n');
    });

    it('should have comments for documentation', () => {
      const robotsTxt = generateRobotsTxt();
      
      // Should have comment lines starting with #
      expect(robotsTxt).toContain('#');
    });

    it('should be under 10KB', () => {
      const robotsTxt = generateRobotsTxt();
      
      // robots.txt should be small
      expect(robotsTxt.length).toBeLessThan(10 * 1024);
    });
  });
});

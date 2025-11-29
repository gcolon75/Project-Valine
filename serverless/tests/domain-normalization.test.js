/**
 * Tests for cookie domain normalization
 * Note: Domain attribute is intentionally not set for cross-site cookies
 * to support CloudFront frontend + API Gateway backend architecture.
 * The normalizeCookieDomain utility is still tested for edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateAccessTokenCookie,
  generateRefreshTokenCookie
} from '../src/utils/tokenManager.js';

describe('Cookie Domain Normalization', () => {
  let originalNodeEnv;
  let originalCookieDomain;
  
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalCookieDomain = process.env.COOKIE_DOMAIN;
    process.env.NODE_ENV = 'production';
  });
  
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.COOKIE_DOMAIN = originalCookieDomain;
  });
  
  describe('Domain attribute behavior for cross-site cookies', () => {
    it('should NOT include Domain attribute even when COOKIE_DOMAIN is set (for cross-site cookie support)', () => {
      process.env.COOKIE_DOMAIN = ' example.com ';
      const cookie = generateAccessTokenCookie('test-token');
      
      // Domain attribute is intentionally not set for cross-site cookies
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute with uppercase domain', () => {
      process.env.COOKIE_DOMAIN = 'Example.COM';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute with leading dot', () => {
      process.env.COOKIE_DOMAIN = '.example.com';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute with multiple leading dots', () => {
      process.env.COOKIE_DOMAIN = '...example.com';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute for subdomain', () => {
      process.env.COOKIE_DOMAIN = 'sub.domain.com';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute with combined edge case', () => {
      process.env.COOKIE_DOMAIN = ' .Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute for localhost', () => {
      process.env.COOKIE_DOMAIN = 'localhost';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute for IP addresses', () => {
      process.env.COOKIE_DOMAIN = '192.168.1.1';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute with empty domain string', () => {
      process.env.COOKIE_DOMAIN = '';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should NOT include Domain attribute when undefined', () => {
      delete process.env.COOKIE_DOMAIN;
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
    });
  });
  
  describe('Cookie generation without domain attribute', () => {
    it('should generate access token cookie without Domain attribute', () => {
      process.env.COOKIE_DOMAIN = ' Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('access_token=test-token');
      expect(cookie).not.toContain('Domain=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
    });
    
    it('should generate refresh token cookie without Domain attribute', () => {
      process.env.COOKIE_DOMAIN = '.EXAMPLE.com';
      const cookie = generateRefreshTokenCookie('test-token');
      
      expect(cookie).toContain('refresh_token=test-token');
      expect(cookie).not.toContain('Domain=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
    });
  });
  
  describe('Development vs Production domain handling', () => {
    it('should NOT include Domain attribute in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_DOMAIN = ' Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
      expect(cookie).toContain('SameSite=Lax'); // dev mode
      expect(cookie).not.toContain('Secure'); // no Secure in dev
    });
    
    it('should NOT include Domain attribute in production mode and use SameSite=None', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_DOMAIN = ' Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).not.toContain('Domain=');
      expect(cookie).toContain('SameSite=None'); // prod mode with cross-site support
      expect(cookie).toContain('Secure'); // Secure in prod (required for SameSite=None)
    });
  });
});

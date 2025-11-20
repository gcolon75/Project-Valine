/**
 * Tests for cookie domain normalization
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
  
  describe('Domain normalization edge cases', () => {
    it('should trim whitespace from domain', () => {
      process.env.COOKIE_DOMAIN = ' example.com ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).not.toContain(' example.com');
    });
    
    it('should convert domain to lowercase', () => {
      process.env.COOKIE_DOMAIN = 'Example.COM';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).not.toContain('Example.COM');
    });
    
    it('should handle domain with leading dot', () => {
      process.env.COOKIE_DOMAIN = '.example.com';
      const cookie = generateAccessTokenCookie('test-token');
      
      // Should have single leading dot
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).not.toContain('Domain=..example.com');
    });
    
    it('should handle domain with multiple leading dots', () => {
      process.env.COOKIE_DOMAIN = '...example.com';
      const cookie = generateAccessTokenCookie('test-token');
      
      // Should normalize to single leading dot
      expect(cookie).toContain('Domain=.example.com');
    });
    
    it('should handle subdomain', () => {
      process.env.COOKIE_DOMAIN = 'sub.domain.com';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=.sub.domain.com');
    });
    
    it('should handle combined edge case: whitespace + case + dots', () => {
      process.env.COOKIE_DOMAIN = ' .Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=.example.com');
    });
    
    it('should not add dot for localhost', () => {
      process.env.COOKIE_DOMAIN = 'localhost';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=localhost');
      expect(cookie).not.toContain('Domain=.localhost');
    });
    
    it('should not add dot for IP addresses', () => {
      process.env.COOKIE_DOMAIN = '192.168.1.1';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=192.168.1.1');
      expect(cookie).not.toContain('Domain=.192.168.1.1');
    });
    
    it('should handle empty domain string', () => {
      process.env.COOKIE_DOMAIN = '';
      const cookie = generateAccessTokenCookie('test-token');
      
      // Should not include Domain attribute
      expect(cookie).not.toContain('Domain=');
    });
    
    it('should handle undefined domain', () => {
      delete process.env.COOKIE_DOMAIN;
      const cookie = generateAccessTokenCookie('test-token');
      
      // Should not include Domain attribute
      expect(cookie).not.toContain('Domain=');
    });
  });
  
  describe('Cookie generation with normalized domain', () => {
    it('should generate access token cookie with normalized domain', () => {
      process.env.COOKIE_DOMAIN = ' Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('access_token=test-token');
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
    });
    
    it('should generate refresh token cookie with normalized domain', () => {
      process.env.COOKIE_DOMAIN = '.EXAMPLE.com';
      const cookie = generateRefreshTokenCookie('test-token');
      
      expect(cookie).toContain('refresh_token=test-token');
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
    });
  });
  
  describe('Development vs Production domain handling', () => {
    it('should normalize domain in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_DOMAIN = ' Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).toContain('SameSite=Lax'); // dev mode
      expect(cookie).not.toContain('Secure'); // no Secure in dev
    });
    
    it('should normalize domain in production mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_DOMAIN = ' Example.COM ';
      const cookie = generateAccessTokenCookie('test-token');
      
      expect(cookie).toContain('Domain=.example.com');
      expect(cookie).toContain('SameSite=Strict'); // prod mode
      expect(cookie).toContain('Secure'); // Secure in prod
    });
  });
});

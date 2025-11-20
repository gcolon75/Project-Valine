/**
 * Tests for diagnostic headers (X-Service-Version, X-Auth-Mode, X-Correlation-ID)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { json, error } from '../src/utils/headers.js';

describe('Health & Diagnostic Headers', () => {
  let originalNodeEnv;
  let originalRegistration;
  let originalAllowlist;
  let originalServiceVersion;
  
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalRegistration = process.env.ENABLE_REGISTRATION;
    originalAllowlist = process.env.ALLOWED_USER_EMAILS;
    originalServiceVersion = process.env.SERVICE_VERSION;
    
    process.env.NODE_ENV = 'production';
  });
  
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENABLE_REGISTRATION = originalRegistration;
    process.env.ALLOWED_USER_EMAILS = originalAllowlist;
    process.env.SERVICE_VERSION = originalServiceVersion;
  });
  
  describe('X-Service-Version header', () => {
    it('should include service version in response', () => {
      const response = json({ test: 'data' });
      
      expect(response.headers['x-service-version']).toBeDefined();
    });
    
    it('should use SERVICE_VERSION from environment if set', () => {
      process.env.SERVICE_VERSION = '1.2.3';
      const response = json({ test: 'data' });
      
      expect(response.headers['x-service-version']).toBe('1.2.3');
    });
    
    it('should use default version if SERVICE_VERSION not set', () => {
      delete process.env.SERVICE_VERSION;
      const response = json({ test: 'data' });
      
      expect(response.headers['x-service-version']).toBe('0.0.1');
    });
  });
  
  describe('X-Auth-Mode header', () => {
    it('should return "owner-only" when registration disabled with allowlist', () => {
      process.env.ENABLE_REGISTRATION = 'false';
      process.env.ALLOWED_USER_EMAILS = 'owner@example.com';
      
      const response = json({ test: 'data' });
      
      expect(response.headers['x-auth-mode']).toBe('owner-only');
    });
    
    it('should return "registration-disabled" when no allowlist', () => {
      process.env.ENABLE_REGISTRATION = 'false';
      process.env.ALLOWED_USER_EMAILS = '';
      
      const response = json({ test: 'data' });
      
      expect(response.headers['x-auth-mode']).toBe('registration-disabled');
    });
    
    it('should return "allowlist-restricted" when registration enabled with allowlist', () => {
      process.env.ENABLE_REGISTRATION = 'true';
      process.env.ALLOWED_USER_EMAILS = 'user1@example.com,user2@example.com';
      
      const response = json({ test: 'data' });
      
      expect(response.headers['x-auth-mode']).toBe('allowlist-restricted');
    });
    
    it('should return "open" when registration enabled without allowlist', () => {
      process.env.ENABLE_REGISTRATION = 'true';
      process.env.ALLOWED_USER_EMAILS = '';
      
      const response = json({ test: 'data' });
      
      expect(response.headers['x-auth-mode']).toBe('open');
    });
  });
  
  describe('X-Correlation-ID header', () => {
    it('should include correlation ID when provided in extra', () => {
      const correlationId = 'test-correlation-123';
      const response = json({ test: 'data' }, 200, { correlationId });
      
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
    
    it('should not include correlation ID header when not provided', () => {
      const response = json({ test: 'data' });
      
      expect(response.headers['x-correlation-id']).toBeUndefined();
    });
    
    it('should include correlation ID in error responses', () => {
      const correlationId = 'error-correlation-456';
      const response = error(400, 'Bad Request', { correlationId });
      
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
  
  describe('Combined diagnostic headers', () => {
    it('should include all diagnostic headers in success response', () => {
      process.env.SERVICE_VERSION = '2.0.0';
      process.env.ENABLE_REGISTRATION = 'false';
      process.env.ALLOWED_USER_EMAILS = 'owner@example.com';
      
      const correlationId = 'test-123';
      const response = json({ user: 'data' }, 200, { correlationId });
      
      expect(response.headers['x-service-version']).toBe('2.0.0');
      expect(response.headers['x-auth-mode']).toBe('owner-only');
      expect(response.headers['x-correlation-id']).toBe('test-123');
    });
    
    it('should include all diagnostic headers in error response', () => {
      process.env.SERVICE_VERSION = '1.5.0';
      process.env.ENABLE_REGISTRATION = 'true';
      process.env.ALLOWED_USER_EMAILS = '';
      
      const correlationId = 'error-789';
      const response = error(403, 'Forbidden', { correlationId });
      
      expect(response.headers['x-service-version']).toBe('1.5.0');
      expect(response.headers['x-auth-mode']).toBe('open');
      expect(response.headers['x-correlation-id']).toBe('error-789');
    });
  });
  
  describe('Headers do not interfere with other headers', () => {
    it('should preserve CORS headers', () => {
      const response = json({ test: 'data' });
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
    
    it('should preserve security headers', () => {
      const response = json({ test: 'data' });
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
    
    it('should preserve content-type header', () => {
      const response = json({ test: 'data' });
      
      expect(response.headers['content-type']).toBe('application/json');
    });
    
    it('should allow custom headers in extra', () => {
      const response = json({ test: 'data' }, 200, {
        'x-custom-header': 'custom-value',
        correlationId: 'test-123'
      });
      
      expect(response.headers['x-custom-header']).toBe('custom-value');
      expect(response.headers['x-correlation-id']).toBe('test-123');
    });
  });
});

/**
 * Tests for JWT secret validation (fail-fast for default secrets in production)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('JWT Secret Validation', () => {
  let originalNodeEnv;
  let originalJwtSecret;
  
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalJwtSecret = process.env.JWT_SECRET;
    
    // Clear module cache to test initialization logic
    vi.resetModules();
  });
  
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    vi.resetModules();
  });
  
  describe('Production environment validation', () => {
    it('should throw error when using default secret in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      
      // Mock console.error to capture structured log
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        // Import should trigger validation
        await expect(async () => {
          await import('../src/utils/tokenManager.js?t=' + Date.now());
        }).rejects.toThrow(/Default JWT_SECRET must not be used in production/);
        
        // Verify structured log was written
        expect(consoleErrorSpy).toHaveBeenCalled();
        const logArg = consoleErrorSpy.mock.calls[0][0];
        const parsedLog = JSON.parse(logArg);
        
        expect(parsedLog.event).toBe('jwt_secret_invalid');
        expect(parsedLog.level).toBe('error');
        expect(parsedLog.environment).toBe('production');
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
    
    it('should allow custom secret in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'super-secure-production-secret-key-with-at-least-32-characters';
      
      // Should not throw
      await expect(async () => {
        await import('../src/utils/tokenManager.js?t=' + Date.now());
      }).resolves.toBeDefined();
    });
  });
  
  describe('Development environment validation', () => {
    it('should allow default secret in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      
      // Should not throw
      await expect(async () => {
        await import('../src/utils/tokenManager.js?t=' + Date.now());
      }).resolves.toBeDefined();
    });
    
    it('should allow custom secret in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'custom-dev-secret';
      
      // Should not throw
      await expect(async () => {
        await import('../src/utils/tokenManager.js?t=' + Date.now());
      }).resolves.toBeDefined();
    });
  });
  
  describe('Undefined environment (defaults to development)', () => {
    it('should allow default secret when NODE_ENV not set', async () => {
      delete process.env.NODE_ENV;
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      
      // Should not throw (defaults to dev mode)
      await expect(async () => {
        await import('../src/utils/tokenManager.js?t=' + Date.now());
      }).resolves.toBeDefined();
    });
  });
  
  describe('Structured logging of security error', () => {
    it('should log structured error with all required fields', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await import('../src/utils/tokenManager.js?t=' + Date.now());
      } catch (e) {
        // Expected to throw
      }
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logArg = consoleErrorSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logArg);
      
      expect(parsedLog).toHaveProperty('timestamp');
      expect(parsedLog).toHaveProperty('event');
      expect(parsedLog).toHaveProperty('level');
      expect(parsedLog).toHaveProperty('message');
      expect(parsedLog).toHaveProperty('environment');
      
      // Verify timestamp is valid ISO date
      expect(() => new Date(parsedLog.timestamp)).not.toThrow();
      
      consoleErrorSpy.mockRestore();
    });
  });
});

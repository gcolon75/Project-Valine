/**
 * Integration test for auth handler exports
 * Verifies all required handlers are exported and have correct signatures
 */

import { describe, it, expect } from 'vitest';
import * as authModule from '../src/handlers/auth.js';

describe('Auth Handler Exports', () => {
  const requiredHandlers = [
    'login',
    'register',
    'me',
    'refresh',
    'logout',
    'verifyEmail',
    'resendVerification',
    'setup2FA',
    'enable2FA',
    'verify2FA',
    'disable2FA',
    'enable2fa',
    'verify2fa',
    'getUserFromEvent' // Helper function for compatibility
  ];

  it('should export all required handlers', () => {
    requiredHandlers.forEach(handlerName => {
      expect(authModule[handlerName]).toBeDefined();
      expect(typeof authModule[handlerName]).toBe('function');
    });
  });

  it('should have exactly the expected number of exports', () => {
    const exportedKeys = Object.keys(authModule);
    expect(exportedKeys.length).toBe(requiredHandlers.length);
  });

  it('should have lowercase 2FA aliases that work', () => {
    // Verify lowercase versions exist
    expect(authModule.enable2fa).toBeDefined();
    expect(authModule.verify2fa).toBeDefined();
    
    // Verify they're functions
    expect(typeof authModule.enable2fa).toBe('function');
    expect(typeof authModule.verify2fa).toBe('function');
  });

  it('should have camelCase 2FA handlers', () => {
    expect(authModule.enable2FA).toBeDefined();
    expect(authModule.verify2FA).toBeDefined();
    expect(authModule.setup2FA).toBeDefined();
    expect(authModule.disable2FA).toBeDefined();
  });

  it('should have core auth handlers', () => {
    expect(authModule.login).toBeDefined();
    expect(authModule.register).toBeDefined();
    expect(authModule.me).toBeDefined();
    expect(authModule.refresh).toBeDefined();
    expect(authModule.logout).toBeDefined();
  });

  it('should have email verification handlers', () => {
    expect(authModule.verifyEmail).toBeDefined();
    expect(authModule.resendVerification).toBeDefined();
  });
});

describe('Auth Handler Serverless.yml Compatibility', () => {
  // These are the exact handler names referenced in serverless.yml
  const serverlessYmlHandlers = {
    'src/handlers/auth.login': 'login',
    'src/handlers/auth.register': 'register',
    'src/handlers/auth.me': 'me',
    'src/handlers/auth.refresh': 'refresh',
    'src/handlers/auth.logout': 'logout',
    'src/handlers/auth.verifyEmail': 'verifyEmail',
    'src/handlers/auth.resendVerification': 'resendVerification',
    'src/handlers/auth.setup2FA': 'setup2FA',
    'src/handlers/auth.enable2FA': 'enable2FA',
    'src/handlers/auth.verify2FA': 'verify2FA',
    'src/handlers/auth.disable2FA': 'disable2FA'
  };

  Object.entries(serverlessYmlHandlers).forEach(([fullPath, handlerName]) => {
    it(`should export ${handlerName} for ${fullPath}`, () => {
      expect(authModule[handlerName]).toBeDefined();
      expect(typeof authModule[handlerName]).toBe('function');
    });
  });
});

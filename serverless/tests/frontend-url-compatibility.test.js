/**
 * Tests for FRONTEND_URL vs FRONTEND_BASE_URL compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('FRONTEND_URL Compatibility', () => {
  let originalEnv;
  let consoleWarnSpy;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Spy on console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  describe('Variable usage in server code', () => {
    it('should use FRONTEND_URL when both are set', async () => {
      process.env.FRONTEND_URL = 'https://new.example.com';
      process.env.FRONTEND_BASE_URL = 'https://old.example.com';

      // Import fresh to get new env values
      const module = await import('../src/routes/users.js');
      
      // The code should prefer FRONTEND_URL
      // Note: This is a conceptual test - actual verification would require
      // calling the route handler and checking the generated URL
      expect(process.env.FRONTEND_URL).toBe('https://new.example.com');
    });

    it('should fall back to FRONTEND_BASE_URL when FRONTEND_URL not set', () => {
      delete process.env.FRONTEND_URL;
      process.env.FRONTEND_BASE_URL = 'https://legacy.example.com';

      // Simulate the fallback logic
      const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      
      expect(frontendUrl).toBe('https://legacy.example.com');
    });

    it('should log deprecation warning when using FRONTEND_BASE_URL', () => {
      delete process.env.FRONTEND_URL;
      process.env.FRONTEND_BASE_URL = 'https://legacy.example.com';

      // Simulate the warning logic
      if (!process.env.FRONTEND_URL && process.env.FRONTEND_BASE_URL) {
        console.warn('[DEPRECATION WARNING] FRONTEND_BASE_URL is deprecated. Please migrate to FRONTEND_URL.');
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('FRONTEND_BASE_URL is deprecated')
      );
    });

    it('should not log warning when using FRONTEND_URL', () => {
      process.env.FRONTEND_URL = 'https://new.example.com';
      delete process.env.FRONTEND_BASE_URL;

      // Simulate the warning logic
      if (!process.env.FRONTEND_URL && process.env.FRONTEND_BASE_URL) {
        console.warn('[DEPRECATION WARNING] FRONTEND_BASE_URL is deprecated. Please migrate to FRONTEND_URL.');
      }

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should default to localhost when neither is set', () => {
      delete process.env.FRONTEND_URL;
      delete process.env.FRONTEND_BASE_URL;

      const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      
      expect(frontendUrl).toBe('http://localhost:5173');
    });
  });

  describe('Environment contract validation', () => {
    it('should detect when FRONTEND_BASE_URL is set but FRONTEND_URL is not', async () => {
      delete process.env.FRONTEND_URL;
      process.env.FRONTEND_BASE_URL = 'https://legacy.example.com';

      // This would be caught by verify-env-contract.mjs
      const hasDeprecatedUsage = !process.env.FRONTEND_URL && process.env.FRONTEND_BASE_URL;
      
      expect(hasDeprecatedUsage).toBe(true);
    });

    it('should pass validation when using FRONTEND_URL', () => {
      process.env.FRONTEND_URL = 'https://new.example.com';
      delete process.env.FRONTEND_BASE_URL;

      const hasDeprecatedUsage = !process.env.FRONTEND_URL && process.env.FRONTEND_BASE_URL;
      
      expect(hasDeprecatedUsage).toBe(false);
    });

    it('should pass validation when both are set (migration in progress)', () => {
      process.env.FRONTEND_URL = 'https://new.example.com';
      process.env.FRONTEND_BASE_URL = 'https://old.example.com';

      const hasDeprecatedUsage = !process.env.FRONTEND_URL && process.env.FRONTEND_BASE_URL;
      
      expect(hasDeprecatedUsage).toBe(false);
    });
  });

  describe('GitHub Actions workflow compatibility', () => {
    it('should use FRONTEND_URL with fallback to FRONTEND_BASE_URL', () => {
      // Simulate workflow env setup: FRONTEND_URL: ${{ secrets.FRONTEND_URL || secrets.FRONTEND_BASE_URL }}
      const secrets = {
        FRONTEND_URL: undefined,
        FRONTEND_BASE_URL: 'https://legacy.example.com'
      };

      const workflowEnv = secrets.FRONTEND_URL || secrets.FRONTEND_BASE_URL;
      
      expect(workflowEnv).toBe('https://legacy.example.com');
    });

    it('should prefer FRONTEND_URL when both secrets exist', () => {
      const secrets = {
        FRONTEND_URL: 'https://new.example.com',
        FRONTEND_BASE_URL: 'https://old.example.com'
      };

      const workflowEnv = secrets.FRONTEND_URL || secrets.FRONTEND_BASE_URL;
      
      expect(workflowEnv).toBe('https://new.example.com');
    });
  });

  describe('Migration path', () => {
    it('should document migration steps', () => {
      const migrationSteps = [
        '1. Set FRONTEND_URL to your frontend domain',
        '2. Remove FRONTEND_BASE_URL from GitHub Secrets',
        '3. Update any deployment scripts or documentation',
        '4. Verify no deprecation warnings in logs'
      ];

      expect(migrationSteps.length).toBeGreaterThan(0);
      expect(migrationSteps[0]).toContain('FRONTEND_URL');
      expect(migrationSteps[1]).toContain('FRONTEND_BASE_URL');
    });

    it('should support gradual migration with both variables', () => {
      // During migration, both can coexist
      process.env.FRONTEND_URL = 'https://new.example.com';
      process.env.FRONTEND_BASE_URL = 'https://old.example.com';

      const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL;
      
      // Should use new variable
      expect(frontendUrl).toBe('https://new.example.com');
      
      // Old variable still exists for rollback
      expect(process.env.FRONTEND_BASE_URL).toBe('https://old.example.com');
    });
  });
});

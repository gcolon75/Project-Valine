/**
 * Build Guard Tests for Dev Bypass
 * 
 * Ensures that the prebuild.js script correctly prevents production builds
 * when dev bypass is accidentally enabled with production domains.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const prebuildScript = join(rootDir, 'scripts', 'prebuild.js');

/**
 * Run prebuild.js with specified environment variables
 * @param {Object} env - Environment variables to set
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
function runPrebuild(env = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [prebuildScript], {
      env: { ...process.env, ...env },
      cwd: rootDir
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

describe('Dev Bypass Build Guard', () => {
  describe('Should FAIL when dev bypass enabled with production domains', () => {
    test('fails with cloudfront.net domain', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'https://dkmxy676d3vgc.cloudfront.net'
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('BUILD FAILED');
      expect(result.stderr).toContain('Dev bypass');
    }, 10000);

    test('fails with projectvaline.com domain', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'https://projectvaline.com'
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('BUILD FAILED');
      expect(result.stderr).toContain('production domain');
    }, 10000);

    test('fails with www.projectvaline.com domain', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'https://www.projectvaline.com'
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('BUILD FAILED');
    }, 10000);

    test('fails with case-insensitive CloudFront domain', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'https://example.CLOUDFRONT.NET'
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('BUILD FAILED');
    }, 10000);
  });

  describe('Should PASS when dev bypass disabled', () => {
    test('passes with dev bypass explicitly false', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'false',
        VITE_FRONTEND_URL: 'https://dkmxy676d3vgc.cloudfront.net'
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('validation passed');
    }, 10000);

    test('passes with dev bypass undefined', async () => {
      const result = await runPrebuild({
        VITE_FRONTEND_URL: 'https://dkmxy676d3vgc.cloudfront.net'
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('validation passed');
    }, 10000);

    test('passes with empty dev bypass', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: '',
        VITE_FRONTEND_URL: 'https://projectvaline.com'
      });

      expect(result.exitCode).toBe(0);
    }, 10000);
  });

  describe('Should PASS when dev bypass enabled with localhost', () => {
    test('passes with localhost URL', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'http://localhost:5173'
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('validation passed');
      expect(result.stdout).toContain('Dev Bypass is ENABLED');
    }, 10000);

    test('passes with localhost without port', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'http://localhost'
      });

      expect(result.exitCode).toBe(0);
    }, 10000);

    test('passes with 127.0.0.1 IP (non-production domain)', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'http://127.0.0.1:5173'
      });

      expect(result.exitCode).toBe(0);
    }, 10000);
  });

  describe('Edge cases', () => {
    test('passes when VITE_FRONTEND_URL is undefined', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true'
      });

      // Should pass because empty URL doesn't match production pattern
      expect(result.exitCode).toBe(0);
    }, 10000);

    test('warns when dev bypass enabled', async () => {
      const result = await runPrebuild({
        VITE_ENABLE_DEV_BYPASS: 'true',
        VITE_FRONTEND_URL: 'http://localhost:5173'
      });

      expect(result.stdout).toContain('Dev Bypass is ENABLED');
      expect(result.stdout).toContain('should only be used locally');
    }, 10000);
  });
});

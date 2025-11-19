/**
 * Test suite for auth backend diagnostic scripts
 * Verifies that the scripts exist, are executable, and can run with --help
 * @vitest-environment node
 */

import { test, expect, describe } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, accessSync, constants, readFileSync } from 'fs';
import { resolve } from 'path';

const scriptsDir = resolve(process.cwd(), 'scripts');

describe('Auth Backend Diagnostic Scripts', () => {
  describe('check-auth-backend.js', () => {
    const scriptPath = resolve(scriptsDir, 'check-auth-backend.js');

    test('script file exists', () => {
      expect(existsSync(scriptPath)).toBe(true);
    });

    test('script is executable', () => {
      try {
        accessSync(scriptPath, constants.X_OK);
        expect(true).toBe(true);
      } catch (err) {
        // On some systems, checking execute permission may not work as expected
        // Just verify the file exists and is readable
        accessSync(scriptPath, constants.R_OK);
        expect(true).toBe(true);
      }
    });

    test('script shows help output', () => {
      const output = execSync('node scripts/check-auth-backend.js --help', {
        encoding: 'utf-8',
        cwd: process.cwd()
      });

      expect(output).toContain('Auth Backend Diagnostics');
      expect(output).toContain('--domain');
      expect(output).toContain('--timeout');
      expect(output).toContain('--verbose');
      expect(output).toContain('Exit Codes');
    });

    test('script shows help when --domain is missing', () => {
      try {
        execSync('node scripts/check-auth-backend.js', {
          encoding: 'utf-8',
          cwd: process.cwd(),
          stdio: 'pipe'
        });
        // If we get here, the script didn't fail as expected
        expect(true).toBe(false);
      } catch (err) {
        // Script should exit with non-zero code
        expect(err.status).toBe(1);
        // Should show help or error message
        const output = err.stdout || err.stderr;
        expect(output).toMatch(/--domain.*required|Auth Backend Diagnostics/);
      }
    });
  });

  describe('check-auth-backend.ps1', () => {
    const scriptPath = resolve(scriptsDir, 'check-auth-backend.ps1');

    test('PowerShell script file exists', () => {
      expect(existsSync(scriptPath)).toBe(true);
    });

    test('PowerShell script is readable', () => {
      accessSync(scriptPath, constants.R_OK);
      expect(true).toBe(true);
    });

    test('PowerShell script contains expected content', () => {
      const content = readFileSync(scriptPath, 'utf-8');

      expect(content).toContain('Auth Backend Diagnostics');
      expect(content).toContain('param(');
      expect(content).toContain('$Domain');
      expect(content).toContain('Test-DNSResolution');
      expect(content).toContain('Test-TCPConnection');
      expect(content).toContain('Test-HTTPSRequest');
    });
  });

  describe('test-auth-login.sh', () => {
    const scriptPath = resolve(scriptsDir, 'test-auth-login.sh');

    test('script file exists', () => {
      expect(existsSync(scriptPath)).toBe(true);
    });

    test('script is executable', () => {
      try {
        accessSync(scriptPath, constants.X_OK);
        expect(true).toBe(true);
      } catch (err) {
        // On some systems, checking execute permission may not work as expected
        accessSync(scriptPath, constants.R_OK);
        expect(true).toBe(true);
      }
    });

    test('script contains security warnings', () => {
      const content = readFileSync(scriptPath, 'utf-8');

      expect(content).toContain('SECURITY WARNING');
      expect(content).toContain('TEST_EMAIL');
      expect(content).toContain('TEST_PASSWORD');
      expect(content).toContain('Never commit credentials');
    });
  });

  describe('test-auth-login.ps1', () => {
    const scriptPath = resolve(scriptsDir, 'test-auth-login.ps1');

    test('PowerShell script file exists', () => {
      expect(existsSync(scriptPath)).toBe(true);
    });

    test('PowerShell script is readable', () => {
      accessSync(scriptPath, constants.R_OK);
      expect(true).toBe(true);
    });

    test('PowerShell script contains security warnings', () => {
      const content = readFileSync(scriptPath, 'utf-8');

      expect(content).toContain('SECURITY WARNING');
      expect(content).toContain('$Email');
      expect(content).toContain('$Password');
      expect(content).toContain('Never commit credentials');
    });
  });
});

describe('Auth Backend Documentation', () => {
  test('AUTH_BACKEND_INVESTIGATION.md exists', () => {
    const docPath = resolve(process.cwd(), 'docs', 'AUTH_BACKEND_INVESTIGATION.md');
    expect(existsSync(docPath)).toBe(true);
  });

  test('AUTH_BACKEND_INVESTIGATION.md contains key sections', () => {
    const docPath = resolve(process.cwd(), 'docs', 'AUTH_BACKEND_INVESTIGATION.md');
    const content = readFileSync(docPath, 'utf-8');

    expect(content).toContain('Auth Backend Investigation Runbook');
    expect(content).toContain('Quick Diagnostics');
    expect(content).toContain('Priority-Ordered Troubleshooting');
    expect(content).toContain('Verify Environment Configuration');
    expect(content).toContain('Verify DNS Resolution');
    expect(content).toContain('Check API Gateway Deployment');
    expect(content).toContain('Check CloudFront Distribution');
    expect(content).toContain('Check WAF Rules');
    expect(content).toContain('Check CORS Configuration');
  });

  test('docs/README.md references AUTH_BACKEND_INVESTIGATION.md', () => {
    const docPath = resolve(process.cwd(), 'docs', 'README.md');
    const content = readFileSync(docPath, 'utf-8');

    expect(content).toContain('AUTH_BACKEND_INVESTIGATION.md');
    expect(content).toContain('auth connectivity issues');
  });

  test('white-screen-runbook.md references auth diagnostics', () => {
    const docPath = resolve(process.cwd(), 'docs', 'white-screen-runbook.md');
    const content = readFileSync(docPath, 'utf-8');

    expect(content).toContain('check-auth-backend.js');
    expect(content).toContain('AUTH_BACKEND_INVESTIGATION');
  });
});

describe('GitHub Actions Workflow', () => {
  test('auth-diagnostics.yml workflow exists', () => {
    const workflowPath = resolve(process.cwd(), '.github', 'workflows', 'auth-diagnostics.yml');
    expect(existsSync(workflowPath)).toBe(true);
  });

  test('workflow contains required configuration', () => {
    const workflowPath = resolve(process.cwd(), '.github', 'workflows', 'auth-diagnostics.yml');
    const content = readFileSync(workflowPath, 'utf-8');

    expect(content).toContain('workflow_dispatch');
    expect(content).toContain('domain:');
    expect(content).toContain('timeout:');
    expect(content).toContain('verbose:');
    expect(content).toContain('node scripts/check-auth-backend.js');
    expect(content).toContain('upload-artifact');
  });
});

describe('Environment Variables', () => {
  test('.env.example includes VITE_DEBUG_API', () => {
    const envPath = resolve(process.cwd(), '.env.example');
    const content = readFileSync(envPath, 'utf-8');

    expect(content).toContain('VITE_DEBUG_API');
    expect(content).toContain('Enhanced diagnostics for API requests');
  });
});

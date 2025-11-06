/**
 * Playwright Configuration
 * Supports both legacy tests (playwright-tests/) and new e2e tests (tests/e2e/)
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30000,
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  projects: [
    { 
      name: 'chromium', 
      use: { browserName: 'chromium' } 
    },
    { 
      name: 'webkit', 
      use: { browserName: 'webkit' } 
    },
    { 
      name: 'firefox', 
      use: { browserName: 'firefox' } 
    },
  ],
  testDir: '.',
  // Test match patterns for both legacy and new test directories
  testMatch: [
    '**/playwright-tests/**/*.spec.js',
    '**/tests/e2e/**/*.spec.ts'
  ],
  // Output directory for test artifacts
  outputDir: 'test-results',
  // Workers for parallel execution (limit to 2 for rate limiting)
  workers: process.env.CI ? 1 : 2,
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  // Global timeout
  globalTimeout: 1800000, // 30 minutes
});
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
  },
  projects: [
    { 
      name: 'chromium', 
      use: { browserName: 'chromium' } 
    },
  ],
  testDir: '.',
  // Test match patterns for both legacy and new test directories
  testMatch: [
    '**/playwright-tests/**/*.spec.js',
    '**/tests/e2e/**/*.spec.ts'
  ]
});
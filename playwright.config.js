// Playwright config (adjust testDir and baseURL to your repo)
module.exports = {
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30000,
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  testDir: 'playwright-tests'
};
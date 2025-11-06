/**
 * Visual Regression Testing Suite
 * 
 * Captures visual snapshots of key components and pages across:
 * - Chromium
 * - WebKit (Safari)
 * - Firefox
 * 
 * Components tested:
 * - Header
 * - Button variants
 * - Card component
 * - Onboarding steps
 * - Profile Edit form
 * 
 * Reports visual diffs for review
 */

import { test, expect } from '@playwright/test';

test.describe('Component Visual Regression - Chromium', () => {
  test.use({ browserName: 'chromium' });

  test('Header component snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Locate header
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    
    // Take snapshot
    await expect(header).toHaveScreenshot('header-chromium.png', {
      maxDiffPixels: 100,
    });
  });

  test('Button variants snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find various button types
    const buttons = page.locator('button').first();
    if (await buttons.isVisible().catch(() => false)) {
      await expect(buttons).toHaveScreenshot('button-primary-chromium.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Card component snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find card components
    const card = page.locator('[class*="card"]').first();
    if (await card.isVisible().catch(() => false)) {
      await expect(card).toHaveScreenshot('card-chromium.png', {
        maxDiffPixels: 100,
      });
    }
  });

  test('Login page full snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-chromium.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('Home page full snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-page-chromium.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });

  test('Profile Edit page snapshot', async ({ page }) => {
    // Mock auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-test-token');
    });
    
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('profile-edit-chromium.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });
});

test.describe('Component Visual Regression - WebKit', () => {
  test.use({ browserName: 'webkit' });

  test('Header component snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    
    await expect(header).toHaveScreenshot('header-webkit.png', {
      maxDiffPixels: 100,
    });
  });

  test('Button variants snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = page.locator('button').first();
    if (await buttons.isVisible().catch(() => false)) {
      await expect(buttons).toHaveScreenshot('button-primary-webkit.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Login page full snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-webkit.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('Home page full snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-page-webkit.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });
});

test.describe('Component Visual Regression - Firefox', () => {
  test.use({ browserName: 'firefox' });

  test('Header component snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    
    await expect(header).toHaveScreenshot('header-firefox.png', {
      maxDiffPixels: 100,
    });
  });

  test('Button variants snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = page.locator('button').first();
    if (await buttons.isVisible().catch(() => false)) {
      await expect(buttons).toHaveScreenshot('button-primary-firefox.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Login page full snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-firefox.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('Home page full snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-page-firefox.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });
});

test.describe('Onboarding Steps Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-test-token');
    });
  });

  test('Onboarding Step 1 snapshot - Chromium', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('onboarding-step1-chromium.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('Onboarding Step 2 snapshot - Chromium', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    const continueButton = page.locator('button:has-text("Continue")');
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('onboarding-step2-chromium.png', {
        fullPage: true,
        maxDiffPixels: 200,
      });
    }
  });
});

test.describe('Responsive Visual Regression', () => {
  test('Mobile viewport - Login page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-mobile.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('Tablet viewport - Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-test-token');
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });

  test('Desktop viewport - Home page', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-desktop.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });
});

test.describe('Dark Mode Visual Regression', () => {
  test('Login page - Dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Enable dark mode if available
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });

  test('Settings page - Dark mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-test-token');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('settings-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 300,
    });
  });
});

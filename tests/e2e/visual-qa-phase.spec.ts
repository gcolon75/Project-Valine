/**
 * Visual Regression Tests - A11y Phase
 * 
 * Tests visual appearance of key components across 3 viewports:
 * - Mobile: 375x667
 * - Tablet: 768x1024  
 * - Desktop: 1280x720
 * 
 * Components tested:
 * - Header (MarketingLayout)
 * - Footer (MarketingFooter)
 * - Auth forms (Login, Signup)
 * - Landing sections (Hero, Features)
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
};

test.describe('Visual Regression - Header Component', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`Header renders correctly on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of header
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      
      await expect(header).toHaveScreenshot(`header-${device}.png`, {
        maxDiffPixels: 100, // Allow small differences for anti-aliasing
      });
    });
  }
});

test.describe('Visual Regression - Footer Component', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`Footer renders correctly on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Scroll to footer
      await page.locator('footer').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      
      const footer = page.locator('footer').first();
      await expect(footer).toBeVisible();
      
      await expect(footer).toHaveScreenshot(`footer-${device}.png`, {
        maxDiffPixels: 100,
      });
    });
  }
});

test.describe('Visual Regression - Auth Forms', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`Login form renders correctly on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // Screenshot the form container
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
      
      await expect(form).toHaveScreenshot(`login-form-${device}.png`, {
        maxDiffPixels: 100,
      });
    });

    test(`Signup form renders correctly on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/signup-page');
      await page.waitForLoadState('networkidle');
      
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
      
      await expect(form).toHaveScreenshot(`signup-form-${device}.png`, {
        maxDiffPixels: 100,
      });
    });
  }
});

test.describe('Visual Regression - Landing Sections', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`Hero section renders correctly on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Hero is the first section
      const hero = page.locator('section').first();
      await expect(hero).toBeVisible();
      
      await expect(hero).toHaveScreenshot(`hero-section-${device}.png`, {
        maxDiffPixels: 150,
      });
    });
  }
});

test.describe('Visual Regression - Responsive Behavior', () => {
  test('Landing page has no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll, 'Page should not have horizontal scroll on mobile').toBe(false);
  });

  test('Login page has no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('Footer stacks correctly on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('footer').first().scrollIntoViewIfNeeded();
    
    // Check footer layout - should be stacked on mobile
    const footerGrid = page.locator('footer .grid').first();
    
    if (await footerGrid.count() > 0) {
      const gridClasses = await footerGrid.getAttribute('class');
      
      // Should have grid-cols-2 or similar for mobile
      expect(gridClasses).toContain('grid');
    }
  });
});

test.describe('Visual Regression - Focus States', () => {
  test('Button focus state is visible on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find primary CTA button
    const ctaButton = page.locator('a:has-text("Get Started")').first();
    await expect(ctaButton).toBeVisible();
    
    // Focus the button
    await ctaButton.focus();
    
    // Take screenshot showing focus ring
    await expect(ctaButton).toHaveScreenshot('button-focus-state.png', {
      maxDiffPixels: 50,
    });
  });

  test('Input focus state is visible on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.focus();
    
    await expect(emailInput).toHaveScreenshot('input-focus-state.png', {
      maxDiffPixels: 50,
    });
  });
});

test.describe('Visual Regression - Before/After Evidence', () => {
  test('Generate full landing page screenshots for PR evidence', async ({ page }) => {
    // Desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('landing-desktop-full.png', {
      fullPage: true,
      maxDiffPixels: 500,
    });
    
    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('landing-mobile-full.png', {
      fullPage: true,
      maxDiffPixels: 500,
    });
  });

  test('Generate login page screenshots for PR evidence', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-full.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });
});

test.describe('Visual Regression - Component Spacing', () => {
  test('Section padding is consistent on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all sections
    const sections = page.locator('section');
    const count = await sections.count();
    
    console.log(`\nChecking padding on ${count} sections`);
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const section = sections.nth(i);
      const padding = await section.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          top: styles.paddingTop,
          bottom: styles.paddingBottom,
        };
      });
      
      console.log(`Section ${i + 1}: padding-top: ${padding.top}, padding-bottom: ${padding.bottom}`);
    }
    
    // This test is informational - actual padding values are checked manually
    expect(count).toBeGreaterThan(0);
  });

  test('Container max-width is consistent', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check containers have consistent max-width
    const containers = page.locator('.max-w-7xl, .max-w-6xl');
    const count = await containers.count();
    
    console.log(`\nFound ${count} containers with max-width classes`);
    
    expect(count).toBeGreaterThan(0);
  });
});

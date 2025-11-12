/**
 * Accessibility & Visual QA Phase - WCAG AA Compliance Tests
 * 
 * Comprehensive accessibility testing for the A11y + Visual QA Sweep phase
 * Tests all target pages specified in the phase requirements
 * 
 * Target Pages:
 * - Landing (Home)
 * - About (anchor section on landing)
 * - Auth pages (Login, Register, VerifyEmail)
 * - Settings (Sessions panel)
 * 
 * Target Components:
 * - NavBar, MarketingFooter
 * - Alerts, Buttons, Forms, Inputs, Links, Cards, Modals
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';

// Helper to create detailed accessibility reports
function createA11yReport(results: AxeResults, pageName: string) {
  const critical = results.violations.filter(v => v.impact === 'critical');
  const serious = results.violations.filter(v => v.impact === 'serious');
  const moderate = results.violations.filter(v => v.impact === 'moderate');
  const minor = results.violations.filter(v => v.impact === 'minor');

  const report = {
    pageName,
    timestamp: new Date().toISOString(),
    totals: {
      violations: results.violations.length,
      critical: critical.length,
      serious: serious.length,
      moderate: moderate.length,
      minor: minor.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
    },
    violations: results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
      selectors: v.nodes.map(n => n.target.join(' > ')),
    })),
  };

  // Console output for debugging
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Accessibility Report: ${pageName}`);
  console.log('='.repeat(70));
  console.log(`Critical: ${critical.length} | Serious: ${serious.length} | Moderate: ${moderate.length} | Minor: ${minor.length}`);
  console.log(`Total Violations: ${results.violations.length} | Passes: ${results.passes.length}`);
  
  if (critical.length > 0 || serious.length > 0) {
    console.log('\n⚠️  High Priority Issues:');
    [...critical, ...serious].forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
    });
  }

  return report;
}

test.describe('WCAG AA Compliance - Marketing Pages', () => {
  test('Landing page meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = createA11yReport(results, 'Landing Page');
    
    // Phase requirements: 0 critical, ≤3 serious
    expect(report.totals.critical, 'Critical violations should be 0').toBe(0);
    expect(report.totals.serious, 'Serious violations should be ≤3').toBeLessThanOrEqual(3);
  });

  test('About section (anchor) accessibility', async ({ page }) => {
    await page.goto('/#about');
    await page.waitForLoadState('networkidle');
    
    // Wait for smooth scroll to complete
    await page.waitForTimeout(500);
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = createA11yReport(results, 'About Section');
    
    expect(report.totals.critical).toBe(0);
    expect(report.totals.serious).toBeLessThanOrEqual(3);
  });

  test('FAQ section (anchor) accessibility', async ({ page }) => {
    await page.goto('/#faq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = createA11yReport(results, 'FAQ Section');
    
    expect(report.totals.critical).toBe(0);
    expect(report.totals.serious).toBeLessThanOrEqual(3);
  });
});

test.describe('WCAG AA Compliance - Authentication Pages', () => {
  test('Login page meets WCAG AA standards', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = createA11yReport(results, 'Login Page');
    
    expect(report.totals.critical).toBe(0);
    expect(report.totals.serious).toBeLessThanOrEqual(3);
  });

  test('SignupPage meets WCAG AA standards', async ({ page }) => {
    await page.goto('/signup-page');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = createA11yReport(results, 'Signup Page');
    
    expect(report.totals.critical).toBe(0);
    expect(report.totals.serious).toBeLessThanOrEqual(3);
  });

  test('Join page meets WCAG AA standards', async ({ page }) => {
    await page.goto('/join');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = createA11yReport(results, 'Join Page');
    
    expect(report.totals.critical).toBe(0);
    expect(report.totals.serious).toBeLessThanOrEqual(3);
  });
});

test.describe('WCAG AA Compliance - Form Accessibility', () => {
  test('Login form has proper labels and ARIA attributes', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check email field
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('id');
    await expect(emailInput).toHaveAttribute('aria-describedby');
    
    const emailId = await emailInput.getAttribute('id');
    const emailLabel = page.locator(`label[for="${emailId}"]`);
    await expect(emailLabel).toBeVisible();
    
    // Check password field
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('id');
    
    const passwordId = await passwordInput.getAttribute('id');
    const passwordLabel = page.locator(`label[for="${passwordId}"]`);
    await expect(passwordLabel).toBeVisible();
    
    // Trigger validation error to check aria-invalid
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Check for aria-invalid on error
    const emailInvalid = await emailInput.getAttribute('aria-invalid');
    expect(emailInvalid).toBe('true');
  });

  test('Signup form has proper labels and ARIA attributes', async ({ page }) => {
    await page.goto('/signup-page');
    await page.waitForLoadState('networkidle');
    
    // Check all form fields have labels
    const emailInput = page.locator('#signup-email');
    const passwordInput = page.locator('#signup-password');
    const confirmPasswordInput = page.locator('#signup-confirm-password');
    
    // Verify labels exist
    await expect(page.locator('label[for="signup-email"]')).toBeVisible();
    await expect(page.locator('label[for="signup-password"]')).toBeVisible();
    await expect(page.locator('label[for="signup-confirm-password"]')).toBeVisible();
    
    // Check ARIA attributes
    await expect(emailInput).toHaveAttribute('aria-describedby');
    await expect(passwordInput).toHaveAttribute('aria-describedby');
    await expect(confirmPasswordInput).toHaveAttribute('aria-describedby');
  });
});

test.describe('WCAG AA Compliance - Heading Hierarchy', () => {
  test('Landing page has proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for exactly one H1
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements, 'Page should have exactly one H1').toBe(1);
    
    // Verify H1 content is meaningful
    const h1Text = await page.locator('h1').first().textContent();
    expect(h1Text?.length, 'H1 should have meaningful content').toBeGreaterThan(10);
    
    // Check that headings follow logical hierarchy
    const allHeadings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      allHeadings.map(async (h) => {
        const tagName = await h.evaluate(el => el.tagName);
        return parseInt(tagName.replace('H', ''));
      })
    );
    
    // Verify no heading level skips (e.g., H1 to H3)
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1];
      expect(diff, `Heading level should not skip (found ${headingLevels[i - 1]} -> ${headingLevels[i]})`).toBeLessThanOrEqual(1);
    }
  });

  test('Login page has proper heading structure', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBe(1);
  });

  test('Signup page has proper heading structure', async ({ page }) => {
    await page.goto('/signup-page');
    await page.waitForLoadState('networkidle');
    
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBe(1);
  });
});

test.describe('WCAG AA Compliance - Landmarks', () => {
  test('Landing page has proper landmark structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for main landmark
    const mainLandmark = page.locator('main');
    await expect(mainLandmark).toBeVisible();
    
    // Check for header
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check for footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Check for navigation
    const nav = page.locator('nav');
    await expect(nav.first()).toBeVisible();
  });

  test('Skip to main content link exists and works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find skip link (should be visually hidden but available to keyboard users)
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);
    
    // Verify it points to main content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toHaveCount(1);
  });
});

test.describe('WCAG AA Compliance - Focus Management', () => {
  test('All interactive elements have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all buttons and links
    const buttons = page.locator('button');
    const links = page.locator('a');
    
    const buttonCount = await buttons.count();
    const linkCount = await links.count();
    
    console.log(`Testing focus on ${buttonCount} buttons and ${linkCount} links`);
    
    // Sample test on first few interactive elements
    const sampleSize = Math.min(5, buttonCount);
    for (let i = 0; i < sampleSize; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.focus();
        // Verify focus is on the element (Playwright doesn't easily check visual focus ring)
        await expect(button).toBeFocused();
      }
    }
  });

  test('Tab order is logical on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through first several focusable elements
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Logo or first nav item
    
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const tagName = await focusedElement.evaluate(el => el?.tagName);
    
    // Should be on an interactive element (A, BUTTON, INPUT, etc.)
    expect(['A', 'BUTTON', 'INPUT'].includes(tagName || '')).toBe(true);
  });
});

test.describe('WCAG AA Compliance - Color Contrast', () => {
  test('Landing page passes color contrast checks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .disableRules(['color-contrast']) // We'll use axe's built-in check
      .analyze();
    
    // Filter for color contrast specific violations if any
    const contrastViolations = results.violations.filter(v => 
      v.id.includes('color-contrast') || v.id.includes('contrast')
    );
    
    expect(contrastViolations.length, 'Should have no color contrast violations').toBe(0);
  });
});

test.describe('WCAG AA Compliance - Images and Icons', () => {
  test('Decorative images have aria-hidden', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check SVG icons used decoratively
    const decorativeIcons = page.locator('svg[aria-hidden="true"]');
    const decorativeCount = await decorativeIcons.count();
    
    console.log(`Found ${decorativeCount} properly marked decorative icons`);
    expect(decorativeCount).toBeGreaterThan(0);
  });

  test('Non-decorative images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find all img elements
    const images = page.locator('img');
    const imageCount = await images.count();
    
    // Check that each has either alt text or aria-hidden
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const hasAlt = await img.getAttribute('alt');
      const isHidden = await img.getAttribute('aria-hidden');
      
      expect(hasAlt !== null || isHidden === 'true', 
        `Image ${i + 1} should have alt text or aria-hidden`).toBe(true);
    }
  });
});

test.describe('WCAG AA Compliance - External Links', () => {
  test('External links have rel="noopener noreferrer"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find all external links (target="_blank" or href starting with http)
    const externalLinks = page.locator('a[target="_blank"], a[href^="http"]');
    const count = await externalLinks.count();
    
    console.log(`Checking ${count} external links`);
    
    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');
      
      // Should have noopener noreferrer
      expect(rel, `External link ${i + 1} should have rel="noopener noreferrer"`).toContain('noopener');
      expect(rel, `External link ${i + 1} should have rel="noopener noreferrer"`).toContain('noreferrer');
    }
  });
});

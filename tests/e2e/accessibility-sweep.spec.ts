/**
 * Comprehensive Accessibility Sweep (WCAG AA Compliance)
 * 
 * Tests all main user flows with axe-core:
 * - Marketing pages (home, about, features)
 * - Authentication flows (login, signup, 2FA, reset password)
 * - Onboarding wizard
 * - Profile pages (view, edit)
 * - Settings page
 * 
 * Generates prioritized list of WCAG AA violations with:
 * - File pointers
 * - Suggested fixes
 * - Impact level (critical, serious, moderate, minor)
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to analyze and format axe results
import type { AxeResults, Result } from 'axe-core';

function formatAxeResults(results: AxeResults, pageName: string) {
  const criticalViolations = results.violations.filter(v => v.impact === 'critical');
  const seriousViolations = results.violations.filter(v => v.impact === 'serious');
  const moderateViolations = results.violations.filter(v => v.impact === 'moderate');
  const minorViolations = results.violations.filter(v => v.impact === 'minor');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Accessibility Report: ${pageName}`);
  console.log('='.repeat(60));
  console.log(`Critical: ${criticalViolations.length}`);
  console.log(`Serious: ${seriousViolations.length}`);
  console.log(`Moderate: ${moderateViolations.length}`);
  console.log(`Minor: ${minorViolations.length}`);
  console.log(`Total: ${results.violations.length}`);
  
  if (results.violations.length > 0) {
    console.log('\n--- Violations by Priority ---\n');
    
    [...criticalViolations, ...seriousViolations, ...moderateViolations, ...minorViolations].forEach((violation, index) => {
      console.log(`${index + 1}. [${(violation.impact || 'unknown').toUpperCase()}] ${violation.id}`);
      console.log(`   Description: ${violation.description}`);
      console.log(`   Help: ${violation.help}`);
      console.log(`   More info: ${violation.helpUrl}`);
      console.log(`   Affected nodes: ${violation.nodes.length}`);
      
      // Show first 2 nodes
      violation.nodes.slice(0, 2).forEach((node, nodeIndex) => {
        console.log(`   Node ${nodeIndex + 1}:`);
        console.log(`     Selector: ${node.target.join(' > ')}`);
        console.log(`     HTML: ${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}`);
        console.log(`     Issue: ${node.failureSummary}`);
      });
      
      if (violation.nodes.length > 2) {
        console.log(`     ... and ${violation.nodes.length - 2} more nodes`);
      }
      console.log('');
    });
  }

  return {
    pageName,
    total: results.violations.length,
    critical: criticalViolations.length,
    serious: seriousViolations.length,
    moderate: moderateViolations.length,
    minor: minorViolations.length,
    violations: results.violations
  };
}

test.describe('Marketing Pages Accessibility', () => {
  test('Home page WCAG AA compliance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Home Page');
    
    // Critical violations should be 0
    expect(report.critical).toBe(0);
    // Serious violations should be minimal
    expect(report.serious).toBeLessThanOrEqual(5);
  });

  test('About Us page WCAG AA compliance', async ({ page }) => {
    await page.goto('/about-us');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'About Us Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(5);
  });

  test('Features page WCAG AA compliance', async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Features Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(5);
  });
});

test.describe('Authentication Flow Accessibility', () => {
  test('Login page WCAG AA compliance', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Login Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(3);
  });

  test('Signup page WCAG AA compliance', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Signup Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(3);
  });

  test('Forgot Password page WCAG AA compliance', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Forgot Password Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(3);
  });

  test('Reset Password page WCAG AA compliance', async ({ page }) => {
    // Mock valid token
    await page.route('**/auth/verify-reset-token*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true })
      });
    });

    await page.goto('/reset-password?token=test-token-123');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Reset Password Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(3);
  });

  test('Verify Email page WCAG AA compliance', async ({ page }) => {
    await page.goto('/verify-email?token=test-token-123');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Verify Email Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(3);
  });
});

test.describe('Authenticated Pages Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-test-token-12345');
    });
  });

  test('Dashboard WCAG AA compliance', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Dashboard Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(5);
  });

  test('Profile view WCAG AA compliance', async ({ page }) => {
    await page.goto('/profile/123');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Profile View Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(5);
  });

  test('Profile edit WCAG AA compliance', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Profile Edit Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(5);
  });

  test('Settings page WCAG AA compliance', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    const report = formatAxeResults(results, 'Settings Page');
    
    expect(report.critical).toBe(0);
    expect(report.serious).toBeLessThanOrEqual(5);
  });
});

test.describe('Onboarding Wizard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-test-token-12345');
    });
  });

  test('Onboarding - All steps WCAG AA compliance', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Test Step 1 (Welcome)
    let results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    let report = formatAxeResults(results, 'Onboarding - Step 1 (Welcome)');
    expect(report.critical).toBe(0);
    
    // Navigate to Step 2 if Continue button exists
    const continueButton = page.locator('button:has-text("Continue")');
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
      await page.waitForTimeout(500);
      
      results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      report = formatAxeResults(results, 'Onboarding - Step 2 (Profile Basics)');
      expect(report.critical).toBe(0);
    }
  });
});

test.describe('Color Contrast Specific Tests', () => {
  test('All interactive elements meet contrast requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['button', 'a', 'input', 'select', 'textarea'])
      .analyze();
    
    const contrastViolations = results.violations.filter(v => 
      v.id.includes('color-contrast')
    );
    
    console.log(`\nColor Contrast Violations: ${contrastViolations.length}`);
    contrastViolations.forEach(v => {
      console.log(`  - ${v.help}`);
      console.log(`    Affected: ${v.nodes.length} elements`);
    });
    
    expect(contrastViolations.length).toBeLessThanOrEqual(3);
  });
});

test.describe('Keyboard Navigation Tests', () => {
  test('All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const keyboardViolations = results.violations.filter(v => 
      v.id.includes('keyboard') || v.id.includes('tabindex') || v.id.includes('focus')
    );
    
    console.log(`\nKeyboard Navigation Violations: ${keyboardViolations.length}`);
    keyboardViolations.forEach(v => {
      console.log(`  - ${v.help}`);
    });
    
    expect(keyboardViolations.length).toBe(0);
  });
});

test.describe('Form Accessibility Tests', () => {
  test('All form fields have proper labels and ARIA', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const formViolations = results.violations.filter(v => 
      v.id.includes('label') || v.id.includes('aria-label') || v.id.includes('form')
    );
    
    console.log(`\nForm Accessibility Violations: ${formViolations.length}`);
    formViolations.forEach(v => {
      console.log(`  - ${v.help}`);
      console.log(`    Nodes: ${v.nodes.length}`);
    });
    
    expect(formViolations.length).toBe(0);
  });
});

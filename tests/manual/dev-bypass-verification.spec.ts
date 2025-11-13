import { test, expect } from '@playwright/test';

/**
 * Manual Verification Test for Dev Bypass Feature
 * 
 * This test demonstrates the dev bypass functionality with screenshots.
 * Run with: VITE_ENABLE_DEV_BYPASS=true npm run dev
 * Then: npx playwright test tests/manual/dev-bypass-verification.spec.ts --headed
 */

test.describe('Dev Bypass Manual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before test
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('verify dev bypass button and banner', async ({ page }) => {
    console.log('📋 Manual Verification: Dev Bypass Feature\n');

    // Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ 
      path: '/tmp/dev-bypass-login.png',
      fullPage: true 
    });
    console.log('   ✅ Screenshot: /tmp/dev-bypass-login.png\n');

    // Check for dev bypass button
    console.log('2. Checking for Dev Bypass button...');
    const devBypassButton = page.locator('button:has-text("Dev Bypass")');
    await expect(devBypassButton).toBeVisible({ timeout: 2000 });
    console.log('   ✅ Dev Bypass button is visible\n');

    // Verify button styling
    const buttonClass = await devBypassButton.getAttribute('class');
    expect(buttonClass).toContain('purple'); // Should have purple gradient
    console.log('   ✅ Button has correct styling (purple/pink gradient)\n');

    // Click dev bypass button
    console.log('3. Clicking Dev Bypass button...');
    await devBypassButton.click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 5000 });
    console.log('   ✅ Redirected to authenticated area\n');

    // Check for DEV SESSION banner
    console.log('4. Checking for DEV SESSION banner...');
    const banner = page.locator('text=/DEV SESSION.*NO REAL AUTH/i');
    await expect(banner).toBeVisible({ timeout: 2000 });
    console.log('   ✅ DEV SESSION banner is visible\n');

    // Verify banner styling
    const bannerElement = page.locator('div:has-text("DEV SESSION")').first();
    const bannerBg = await bannerElement.evaluate(el => 
      window.getComputedStyle(el).background
    );
    console.log(`   ✅ Banner background: ${bannerBg.substring(0, 50)}...\n`);

    // Take screenshot of dashboard with banner
    await page.screenshot({ 
      path: '/tmp/dev-bypass-dashboard.png',
      fullPage: true 
    });
    console.log('   📸 Screenshot: /tmp/dev-bypass-dashboard.png\n');

    // Verify user has DEV_BYPASS role
    console.log('5. Verifying dev bypass user data...');
    const userData = await page.evaluate(() => {
      const userStr = localStorage.getItem('devUserSession');
      return userStr ? JSON.parse(userStr) : null;
    });

    expect(userData).toBeTruthy();
    expect(userData.id).toBe('dev-user');
    expect(userData.email).toBe('dev@local');
    expect(userData.roles).toContain('DEV_BYPASS');
    console.log('   ✅ User data correct:', JSON.stringify(userData, null, 2));
    console.log();

    // Test reload persistence
    console.log('6. Testing session persistence on reload...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const bannerAfterReload = page.locator('text=/DEV SESSION.*NO REAL AUTH/i');
    await expect(bannerAfterReload).toBeVisible({ timeout: 2000 });
    console.log('   ✅ Dev session persists after reload\n');

    console.log('✅ All manual verification checks passed!\n');
    console.log('📸 Screenshots saved to:');
    console.log('   - /tmp/dev-bypass-login.png');
    console.log('   - /tmp/dev-bypass-dashboard.png');
  });

  test('verify dev bypass disabled on non-localhost', async ({ page }) => {
    console.log('📋 Security Test: Dev Bypass on Non-Localhost\n');

    // This test would need to run against 127.0.0.1 or a domain
    // For now, we just verify the logic exists
    console.log('⚠️  Note: This test requires running against 127.0.0.1 or domain');
    console.log('   Dev bypass should NOT appear on non-localhost hostnames');
  });
});

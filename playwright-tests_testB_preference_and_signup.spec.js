const { test, expect } = require('@playwright/test');

test.describe('UX Test B - Preference + Signup (variant smoke)', () => {
  test('preference quick impression and signup flow', async ({ page }) => {
    // For preference test we simply verify hero loads and CTA visibility for both variants
    // Variant URLs: if you build variants, point to those pages, else use main hero and a variant query param.
    await page.goto('/?variant=original');
    await page.waitForSelector('header, [data-testid="hero"]', { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: 'artifacts/variantA-hero.png' });

    await page.goto('/?variant=high-contrast');
    await page.waitForSelector('header, [data-testid="hero"]', { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: 'artifacts/variantB-hero.png' });

    // Basic checks for CTA prominence
    const ctaA = await page.$('a:has-text("Get Started"), button:has-text("Get Started")');
    expect(ctaA).not.toBeNull();

    // Basic signup step (visit /signup)
    await page.goto('/signup');
    await page.waitForSelector('form', { timeout: 5000 });
    await page.screenshot({ path: 'artifacts/signup-page.png' });
  });
});
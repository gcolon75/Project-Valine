const { test, expect } = require('@playwright/test');

test.describe('UX Test A - Signup & Discovery (smoke)', () => {
  test('first impression, signup, discovery and request flow (core smoke)', async ({ page, baseURL }) => {
    // 1) First impression - open home page
    await page.goto('/');
    // Wait for hero
    await page.waitForSelector('header, main, [data-testid="hero"]', { timeout: 5000 }).catch(() => {});
    // Optionally capture screenshot
    await page.screenshot({ path: 'artifacts/first-impression.png', fullPage: false });

    // 2) Find and click signup (adapt selector to your repo)
    const signup = await page.$('a[href*="signup"], a:has-text("Get Started"), button:has-text("Sign up")');
    if (signup) {
      await signup.click();
    } else {
      // fallback: visit /signup
      await page.goto('/signup');
    }

    // Fill signup form (best-effort selectors; adjust to your UI)
    if (await page.$('input[name="email"]')) {
      await page.fill('input[name="email"]', 'test+ux@projectvaline.local');
    }
    if (await page.$('input[name="password"]')) {
      await page.fill('input[name="password"]', 'ValineTest123!');
    }
    if (await page.$('button[type="submit"]')) {
      await page.click('button[type="submit"]');
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for navigation / success message
    await page.waitForTimeout(1500);

    // 3) Discovery: go to /dashboard or /discover
    await page.goto('/dashboard');
    // Wait for feed or search box
    await page.waitForSelector('[data-testid="feed"], [data-testid="search"], input[placeholder*="Search"]', { timeout: 5000 }).catch(() => {});
    // Try a search
    if (await page.$('input[placeholder*="Search"]')) {
      await page.fill('input[placeholder*="Search"]', 'contemporary monologues');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'artifacts/discovery-search.png' });
    } else {
      await page.screenshot({ path: 'artifacts/discovery-feed.png' });
    }

    // 4) Attempt to open a profile or request view
    const profileLink = await page.$('a[href*="/profile/"], a:has-text("View profile"), .profile-card a');
    if (profileLink) {
      await profileLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'artifacts/profile.png' });
      const requestBtn = await page.$('button:has-text("Request"), button:has-text("Request to view"), a:has-text("Request")');
      if (requestBtn) {
        await requestBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'artifacts/request-flow.png' });
      }
    }

    // Assertions (non-fatal): ensure pages loaded with main content
    const mainExists = await page.$('main, [role="main"], [data-testid="main"]');
    expect(mainExists).not.toBeNull();
  });
});
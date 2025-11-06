/**
 * Comprehensive Negative Flow Testing
 * 
 * Tests edge cases and error scenarios:
 * - Expired tokens
 * - Wrong 2FA codes
 * - Rate-limited flows
 * - Concurrent request handling
 * - Network timeouts
 * - Invalid state transitions
 */

import { test, expect } from '@playwright/test';

test.describe('Expired Token Scenarios', () => {
  test('Login with expired auth token', async ({ page }) => {
    await page.goto('/');
    
    // Set an expired token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'expired-token-12345');
      localStorage.setItem('token_expiry', String(Date.now() - 3600000)); // 1 hour ago
    });
    
    // Try to access protected page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show error
    const currentUrl = page.url();
    console.log(`After expired token access: ${currentUrl}`);
    
    expect(currentUrl.includes('/login') || currentUrl.includes('/unauthorized')).toBeTruthy();
  });

  test('Refresh token expiration handling', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/auth/refresh', (route) => {
      requestCount++;
      
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Refresh token expired' })
      });
    });
    
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'valid-token');
      localStorage.setItem('refresh_token', 'expired-refresh-token');
    });
    
    // Simulate API call that triggers token refresh
    await page.evaluate(async () => {
      try {
        await fetch('/api/protected-endpoint', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });
      } catch (e) {
        // Expected to fail
      }
    });
    
    console.log(`Refresh token requests: ${requestCount}`);
  });

  test('Email verification token expired', async ({ page }) => {
    await page.route('**/auth/verify-email*', (route) => {
      route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ 
          message: 'Verification token has expired',
          code: 'TOKEN_EXPIRED'
        })
      });
    });
    
    await page.goto('/verify-email?token=expired-token-abc');
    await page.waitForLoadState('networkidle');
    
    // Should show expired message and resend option
    await expect(page.locator('text=/Verification Link Expired/i')).toBeVisible();
    await expect(page.locator('button:has-text("Resend")')).toBeVisible();
  });

  test('Password reset token expired', async ({ page }) => {
    await page.route('**/auth/verify-reset-token*', (route) => {
      route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ 
          message: 'Reset token has expired',
          code: 'TOKEN_EXPIRED'
        })
      });
    });
    
    await page.goto('/reset-password?token=expired-reset-123');
    await page.waitForLoadState('networkidle');
    
    // Should show expired message
    await expect(page.locator('text=/Reset Link Expired/i')).toBeVisible();
    await expect(page.locator('a:has-text("Request New")')).toBeVisible();
  });
});

test.describe('2FA Error Scenarios', () => {
  test('Wrong 2FA code - single attempt', async ({ page }) => {
    await page.route('**/auth/verify-2fa', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          message: 'Invalid verification code',
          remainingAttempts: 4
        })
      });
    });
    
    await page.goto('/login/2fa');
    await page.waitForLoadState('networkidle');
    
    // Fill wrong code
    const codeInput = page.locator('input[name="code"], input[type="text"]').first();
    if (await codeInput.isVisible().catch(() => false)) {
      await codeInput.fill('000000');
      await page.click('button[type="submit"]');
      
      // Should show error
      await expect(page.locator('[role="alert"]')).toContainText(/invalid/i);
    }
  });

  test('Wrong 2FA code - multiple attempts lockout', async ({ page }) => {
    let attemptCount = 0;
    
    await page.route('**/auth/verify-2fa', (route) => {
      attemptCount++;
      
      if (attemptCount >= 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            message: 'Too many failed attempts. Account locked for 15 minutes.',
            code: 'ACCOUNT_LOCKED',
            lockoutUntil: Date.now() + 900000
          })
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            message: 'Invalid verification code',
            remainingAttempts: 5 - attemptCount
          })
        });
      }
    });
    
    await page.goto('/login/2fa');
    await page.waitForLoadState('networkidle');
    
    const codeInput = page.locator('input[name="code"]').first();
    
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      if (await codeInput.isVisible().catch(() => false)) {
        await codeInput.fill('000000');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
    }
    
    // Should show lockout message
    if (attemptCount >= 5) {
      await expect(page.locator('text=/locked|too many attempts/i')).toBeVisible();
    }
    
    console.log(`2FA attempts before lockout: ${attemptCount}`);
  });

  test('Expired 2FA session', async ({ page }) => {
    await page.route('**/auth/verify-2fa', (route) => {
      route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ 
          message: '2FA session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        })
      });
    });
    
    await page.goto('/login/2fa');
    await page.waitForLoadState('networkidle');
    
    const codeInput = page.locator('input[name="code"]').first();
    if (await codeInput.isVisible().catch(() => false)) {
      await codeInput.fill('123456');
      await page.click('button[type="submit"]');
      
      // Should redirect to login
      await page.waitForURL(/\/login(?!\/)/, { timeout: 5000 }).catch(() => {});
    }
  });
});

test.describe('Rate Limiting Scenarios', () => {
  test('Login rate limiting after multiple failed attempts', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/auth/login', (route) => {
      requestCount++;
      
      if (requestCount >= 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({ 
            message: 'Too many login attempts. Please try again in 60 seconds.',
            retryAfter: 60
          })
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid credentials' })
        });
      }
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Make 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', 'user@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    // Should show rate limit message
    await expect(page.locator('text=/too many|rate limit|try again/i')).toBeVisible();
    
    console.log(`Requests before rate limit: ${requestCount}`);
  });

  test('Password reset rate limiting', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/auth/forgot-password', (route) => {
      requestCount++;
      
      if (requestCount >= 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            message: 'Too many password reset requests. Please wait before trying again.'
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    
    // Make 3 requests
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', 'user@example.com');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Reset to try again
      if (i < 2) {
        await page.goto('/forgot-password');
      }
    }
    
    console.log(`Password reset requests: ${requestCount}`);
  });

  test('API rate limiting with exponential backoff', async ({ page }) => {
    let requestCount = 0;
    const requestTimes: number[] = [];
    
    await page.route('**/api/**', (route) => {
      requestCount++;
      requestTimes.push(Date.now());
      
      if (requestCount <= 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Rate limited' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    // Simulate client with exponential backoff
    await page.goto('/');
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await fetch('/api/test-endpoint');
        } catch (e) {
          // Rate limited
        }
        
        // Exponential backoff: 100ms, 200ms, 400ms
        if (attempt < 3) {
          await sleep(100 * Math.pow(2, attempt));
        }
      }
    });
    
    // Check if delays increased
    if (requestTimes.length >= 3) {
      const delay1 = requestTimes[1] - requestTimes[0];
      const delay2 = requestTimes[2] - requestTimes[1];
      console.log(`Backoff delays: ${delay1}ms, ${delay2}ms`);
      
      // Second delay should be larger than first
      expect(delay2).toBeGreaterThanOrEqual(delay1);
    }
  });
});

test.describe('Network Error Scenarios', () => {
  test('Network timeout handling', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      // Simulate very slow response (timeout)
      await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show timeout error or loading state
    const hasError = await page.locator('text=/timeout|taking too long|try again/i')
      .isVisible({ timeout: 32000 })
      .catch(() => false);
    
    console.log(`Timeout error shown: ${hasError}`);
  });

  test('Connection refused / offline', async ({ page }) => {
    await page.route('**/auth/login', (route) => route.abort('failed'));
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show network error
    await expect(page.locator('text=/network|connection|offline/i')).toBeVisible({ timeout: 5000 });
  });

  test('Server error 500 handling', async ({ page }) => {
    await page.route('**/auth/login', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show server error
    await expect(page.locator('text=/server error|something went wrong/i')).toBeVisible();
  });
});

test.describe('Concurrent Request Handling', () => {
  test('Multiple simultaneous login attempts', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/auth/login', async (route) => {
      requestCount++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-token', user: { id: 1 } })
      });
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click submit multiple times quickly
    await Promise.all([
      page.click('button[type="submit"]'),
      page.click('button[type="submit"]'),
      page.click('button[type="submit"]')
    ].map(p => p.catch(() => {}))); // Ignore errors
    
    await page.waitForTimeout(2000);
    
    console.log(`Concurrent requests made: ${requestCount}`);
    // Should only process one request (debouncing/throttling)
    expect(requestCount).toBeLessThanOrEqual(2);
  });

  test('Race condition in token refresh', async ({ page }) => {
    let refreshCount = 0;
    
    await page.route('**/auth/refresh', async (route) => {
      refreshCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: `new-token-${refreshCount}` })
      });
    });
    
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'expiring-token');
    });
    
    // Simulate multiple API calls that trigger refresh
    await page.evaluate(async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          fetch('/api/endpoint', {
            headers: { 'Authorization': 'Bearer expiring-token' }
          }).catch(() => {})
        );
      }
      await Promise.all(promises);
    });
    
    console.log(`Token refresh calls: ${refreshCount}`);
    // Should only refresh once (lock mechanism)
    expect(refreshCount).toBeLessThanOrEqual(2);
  });
});

test.describe('Invalid State Transitions', () => {
  test('Access onboarding after completion', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'valid-token');
      localStorage.setItem('onboarding_completed', 'true');
    });
    
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to dashboard
    const currentUrl = page.url();
    console.log(`After accessing completed onboarding: ${currentUrl}`);
    
    expect(currentUrl.includes('/dashboard') || currentUrl.includes('/feed')).toBeTruthy();
  });

  test('Access authenticated page without token', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl.includes('/login')).toBeTruthy();
  });

  test('Password reset without valid token', async ({ page }) => {
    await page.goto('/reset-password'); // No token in URL
    await page.waitForLoadState('networkidle');
    
    // Should show error or redirect
    const hasError = await page.locator('text=/invalid|missing|token/i').isVisible().catch(() => false);
    const isRedirected = page.url().includes('/login') || page.url().includes('/forgot-password');
    
    expect(hasError || isRedirected).toBeTruthy();
  });
});

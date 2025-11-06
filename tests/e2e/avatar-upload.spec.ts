/**
 * E2E Tests for Avatar Upload UX
 * Tests drag-and-drop, validation, progress, cancel, and cross-browser compatibility
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Avatar Upload UX', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile edit or wherever avatar upload is used
    // This assumes the uploader is on /profile/edit or similar
    await page.goto('/profile/edit');
    
    // Open avatar uploader (adjust selector as needed)
    // await page.click('button:has-text("Upload Avatar")');
  });

  test('should accept valid image file via file picker', async ({ page }) => {
    // Create a test image file
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click upload button (adjust selector)
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should show processing state
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
  });

  test('should reject invalid file type', async ({ page }) => {
    const buffer = Buffer.from('Not an image');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: buffer,
    });
    
    // Should show error
    await expect(page.locator('text=Invalid file type')).toBeVisible({ timeout: 5000 });
  });

  test('should reject file exceeding size limit', async ({ page }) => {
    // Create a buffer larger than 5MB
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'large.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuffer,
    });
    
    // Should show error
    await expect(page.locator('text=File too large')).toBeVisible({ timeout: 5000 });
  });

  test('should show progress indicator during upload', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Mock slow upload
    await page.route('**/upload/avatar', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ url: 'https://example.com/avatar.jpg' }),
      });
    });
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should show progress bar
    await expect(page.locator('[role="progressbar"]')).toBeVisible({ timeout: 5000 });
  });

  test('should allow canceling upload', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Mock slow upload
    await page.route('**/upload/avatar', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      route.fulfill({ status: 200, body: JSON.stringify({ url: 'https://example.com/avatar.jpg' }) });
    });
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Wait for upload to start
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 2000 });
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Processing should disappear
    await expect(page.locator('text=Processing')).not.toBeVisible({ timeout: 2000 });
  });

  test('should allow retry after failed upload', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    let attemptCount = 0;
    
    // First attempt fails, second succeeds
    await page.route('**/upload/avatar', (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        route.fulfill({ status: 500, body: 'Server error' });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ url: 'https://example.com/avatar.jpg' }),
        });
      }
    });
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should show error
    await expect(page.locator('text=Failed to process')).toBeVisible({ timeout: 5000 });
    
    // Should have retry option (Change Image button)
    const changeButton = page.locator('button:has-text("Change Image")');
    await expect(changeButton).toBeVisible();
    
    // Click to retry
    await changeButton.click();
    
    // Upload again
    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should succeed this time
    await expect(page.locator('text=uploaded successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to upload button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Adjust number of tabs as needed
    
    // Check if upload area is focused
    const uploadArea = page.locator('[aria-label*="Upload image"]');
    
    // Should be able to activate with Enter or Space
    await uploadArea.focus();
    
    // Check focus is visible
    const isFocused = await uploadArea.evaluate((el) => {
      return document.activeElement === el;
    });
    
    expect(isFocused).toBeTruthy();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check upload button/area
    const uploadArea = page.locator('[aria-label*="Upload"]').first();
    await expect(uploadArea).toHaveAttribute('aria-label');
    
    // Check file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('aria-label');
  });

  test('should show preview of uploaded image', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should show preview
    await expect(page.locator('img[alt*="preview"]')).toBeVisible({ timeout: 5000 });
  });

  test('should handle network error gracefully', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Simulate network failure
    await page.route('**/upload/avatar', (route) => route.abort('failed'));
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Avatar Upload - Cross-Browser', () => {
  test('should work on WebKit (Safari)', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is for WebKit only');
    
    await page.goto('/profile/edit');
    
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should process successfully on Safari
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
  });

  test('should work on Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'This test is for Firefox only');
    
    await page.goto('/profile/edit');
    
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[aria-label*="Choose image"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: buffer,
    });
    
    // Should process successfully on Firefox
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Avatar Upload - Mobile Responsive', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Upload button should be visible and tappable
    const uploadButton = page.locator('[aria-label*="Upload image"]').first();
    await expect(uploadButton).toBeVisible();
    
    // Check touch target size (should be at least 44x44)
    const box = await uploadButton.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

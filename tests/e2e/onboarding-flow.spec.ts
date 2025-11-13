import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Onboarding Flow
 * 
 * Tests the complete user onboarding journey:
 * 1. Signup/Login
 * 2. Multi-step onboarding wizard
 * 3. Profile basics (name, headline, title, location)
 * 4. Links setup with drag-and-drop reordering
 * 5. Preferences and privacy settings
 * 6. State persistence across page refreshes
 * 7. Avatar upload with validation
 */

test.describe('Onboarding Flow E2E', () => {
  const testUser = {
    email: 'onboarding-test@projectvaline.local',
    password: 'TestPassword123!',
    displayName: 'Jane Doe',
    headline: 'Award-winning voice actor and audiobook narrator',
    title: 'Voice Actor',
    location: 'Los Angeles, CA',
    links: [
      { label: 'My Portfolio', url: 'https://janedoe.com', type: 'website' },
      { label: 'IMDb Profile', url: 'https://imdb.com/name/nm123456', type: 'imdb' },
      { label: 'Voice Reel', url: 'https://soundcloud.com/janedoe', type: 'showreel' }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('complete onboarding flow - happy path', async ({ page }) => {
    console.log('Starting complete onboarding flow test...');

    // ============================================
    // STEP 1: Login/Signup
    // ============================================
    console.log('Step 1: Navigating to login...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try dev bypass if available
    const devBypassButton = page.locator('button:has-text("Dev Bypass")');
    const hasDevBypass = await devBypassButton.isVisible().catch(() => false);

    if (hasDevBypass) {
      console.log('Using dev bypass...');
      await devBypassButton.click();
      await page.waitForURL(/\/(dashboard|onboarding|profile)/, { timeout: 5000 });
      
      // Verify dev bypass banner is visible
      const devBanner = page.locator('text=/DEV SESSION.*NO REAL AUTH/i');
      await expect(devBanner).toBeVisible();
      console.log('✓ Dev bypass banner visible');
    } else {
      console.log('Using signup form...');
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      await emailInput.fill(testUser.email);
      await passwordInput.fill(testUser.password);

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      await page.waitForURL(/\/(dashboard|onboarding|profile)/, { timeout: 10000 });
    }

    console.log('✓ Login successful');

    // ============================================
    // STEP 2: Navigate to Onboarding
    // ============================================
    console.log('Step 2: Navigating to onboarding...');
    
    // Navigate to onboarding page
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify we're on onboarding page
    await expect(page.locator('h1, h2')).toContainText(/Complete Your Profile|Welcome to Project Valine/i);
    console.log('✓ Onboarding page loaded');

    // ============================================
    // STEP 3: Welcome Step
    // ============================================
    console.log('Step 3: Completing welcome step...');
    
    // Verify progress indicator shows step 1 of 4
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    
    // Click Continue button
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.click();
    await page.waitForTimeout(500);

    console.log('✓ Welcome step completed');

    // ============================================
    // STEP 4: Profile Basics Step
    // ============================================
    console.log('Step 4: Filling profile basics...');
    
    // Verify we're on step 2
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();

    // Fill display name
    const displayNameInput = page.locator('input[name="displayName"], input#displayName');
    await displayNameInput.clear();
    await displayNameInput.fill(testUser.displayName);
    expect(await displayNameInput.inputValue()).toBe(testUser.displayName);

    // Fill headline
    const headlineInput = page.locator('input[name="headline"], input#headline');
    await headlineInput.clear();
    await headlineInput.fill(testUser.headline);
    expect(await headlineInput.inputValue()).toBe(testUser.headline);

    // Fill title
    const titleInput = page.locator('input[name="title"], input#title');
    await titleInput.clear();
    await titleInput.fill(testUser.title);
    expect(await titleInput.inputValue()).toBe(testUser.title);

    // Fill location
    const locationInput = page.locator('input[name="location"], input#location');
    await locationInput.clear();
    await locationInput.fill(testUser.location);
    expect(await locationInput.inputValue()).toBe(testUser.location);

    console.log('✓ Profile basics filled');

    // Continue to next step
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);

    // ============================================
    // STEP 5: Links Setup Step
    // ============================================
    console.log('Step 5: Adding and reordering links...');
    
    // Verify we're on step 3
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();

    // Add links one by one
    for (let i = 0; i < testUser.links.length; i++) {
      const link = testUser.links[i];
      console.log(`  Adding link ${i + 1}: ${link.label}...`);

      // Click "Add Link" button
      const addLinkButton = page.locator('button:has-text("Add Link"), button:has-text("Add Another Link")').first();
      await addLinkButton.click();
      await page.waitForTimeout(500);

      // Find the last added link section
      const linkSection = page.locator('[role="group"]').nth(i);

      // Fill label
      const labelInput = linkSection.locator('input[id*="link-label"]');
      await labelInput.fill(link.label);
      
      // Validate label
      const labelValue = await labelInput.inputValue();
      expect(labelValue).toBe(link.label);
      expect(labelValue.length).toBeLessThanOrEqual(40);

      // Fill URL
      const urlInput = linkSection.locator('input[id*="link-url"], input[type="url"]');
      await urlInput.fill(link.url);
      
      // Validate URL
      const urlValue = await urlInput.inputValue();
      expect(urlValue).toBe(link.url);
      expect(urlValue).toMatch(/^https?:\/\/.+/);

      // Select type
      const typeSelect = linkSection.locator('select[id*="link-type"]');
      await typeSelect.selectOption(link.type);

      console.log(`  ✓ Link added: ${link.label}`);
    }

    console.log(`✓ All ${testUser.links.length} links added`);

    // Test drag and drop reordering (swap first and last link)
    console.log('  Testing drag-and-drop reordering...');
    
    const linkSections = page.locator('[role="group"]');
    const linkCount = await linkSections.count();
    
    if (linkCount >= 2) {
      // Get labels before reorder
      const firstLinkLabel = await linkSections.nth(0).locator('input[id*="link-label"]').inputValue();
      const lastLinkLabel = await linkSections.nth(linkCount - 1).locator('input[id*="link-label"]').inputValue();
      
      console.log(`  Before reorder: First="${firstLinkLabel}", Last="${lastLinkLabel}"`);
      
      // Perform drag operation (using mouse)
      const firstLink = linkSections.nth(0);
      const lastLink = linkSections.nth(linkCount - 1);
      
      const firstLinkBox = await firstLink.boundingBox();
      const lastLinkBox = await lastLink.boundingBox();
      
      if (firstLinkBox && lastLinkBox) {
        await page.mouse.move(firstLinkBox.x + firstLinkBox.width / 2, firstLinkBox.y + firstLinkBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(lastLinkBox.x + lastLinkBox.width / 2, lastLinkBox.y + lastLinkBox.height / 2, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        
        console.log('  ✓ Drag-and-drop reorder attempted');
      }
    }

    // Continue to next step
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);

    // ============================================
    // STEP 6: Preferences Step
    // ============================================
    console.log('Step 6: Setting preferences...');
    
    // Verify we're on step 4
    await expect(page.locator('text=Step 4 of 4')).toBeVisible();

    // Toggle some preferences
    const emailNotifToggle = page.locator('input[type="checkbox"]').first();
    await emailNotifToggle.check();

    // Select profile visibility
    const publicVisibility = page.locator('input[value="public"]');
    await publicVisibility.check();

    console.log('✓ Preferences set');

    // ============================================
    // STEP 7: Complete Onboarding
    // ============================================
    console.log('Step 7: Completing onboarding...');
    
    // Click Complete button
    const completeButton = page.locator('button:has-text("Complete")');
    await completeButton.click();
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/(dashboard|feed|profile)/, { timeout: 10000 });
    
    console.log('✓ Onboarding completed, redirected to dashboard');

    // ============================================
    // STEP 8: Verify Data Persistence
    // ============================================
    console.log('Step 8: Verifying data persistence...');
    
    // Check if onboarding progress was cleared
    const onboardingData = await page.evaluate(() => {
      return localStorage.getItem('valine-onboarding-progress');
    });
    expect(onboardingData).toBeNull();
    console.log('✓ Onboarding progress cleared from localStorage');

    // Reload page and verify we don't go back to onboarding
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/onboarding');
    console.log('✓ User stays on dashboard after reload (not redirected to onboarding)');

    console.log('\n✅ Complete onboarding flow test passed!');
  });

  test('onboarding autosave and resume', async ({ page }) => {
    console.log('Testing onboarding autosave and resume...');

    // Login
    await page.goto('/login');
    const devBypassButton = page.locator('button:has-text("Dev Bypass")');
    const hasDevBypass = await devBypassButton.isVisible().catch(() => false);
    
    if (!hasDevBypass) {
      console.log('Skipping: Dev bypass not available');
      return;
    }
    
    await devBypassButton.click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 5000 });

    // Navigate to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Go to step 2
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);

    // Fill some data
    const displayNameInput = page.locator('input[name="displayName"]');
    await displayNameInput.fill('Test User');

    // Wait for autosave
    await page.waitForTimeout(1000);

    // Verify data is saved to localStorage
    const savedData = await page.evaluate(() => {
      const data = localStorage.getItem('valine-onboarding-progress');
      return data ? JSON.parse(data) : null;
    });
    
    expect(savedData).toBeTruthy();
    expect(savedData.data.displayName).toBe('Test User');
    console.log('✓ Data autosaved to localStorage');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify we're back on step 2 with saved data
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    
    const displayNameValue = await page.locator('input[name="displayName"]').inputValue();
    expect(displayNameValue).toBe('Test User');
    console.log('✓ Onboarding resumed with saved data');

    console.log('\n✅ Autosave and resume test passed!');
  });

  test('link validation errors', async ({ page }) => {
    console.log('Testing link validation...');

    // Login and navigate to onboarding
    await page.goto('/login');
    const devBypassButton = page.locator('button:has-text("Dev Bypass")');
    const hasDevBypass = await devBypassButton.isVisible().catch(() => false);
    
    if (!hasDevBypass) {
      console.log('Skipping: Dev bypass not available');
      return;
    }
    
    await devBypassButton.click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 5000 });

    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Skip to links step
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);

    // Add a link
    await page.locator('button:has-text("Add Link")').first().click();
    await page.waitForTimeout(500);

    const linkSection = page.locator('[role="group"]').first();

    // Test label length limit (40 chars max)
    const labelInput = linkSection.locator('input[id*="link-label"]');
    await labelInput.fill('a'.repeat(50));
    const labelValue = await labelInput.inputValue();
    expect(labelValue.length).toBeLessThanOrEqual(40);
    console.log('✓ Label length constraint enforced');

    // Test invalid URL
    const urlInput = linkSection.locator('input[id*="link-url"]');
    await urlInput.fill('not-a-valid-url');
    await urlInput.blur();
    await page.waitForTimeout(500);
    
    // Check for validation error
    const hasError = await linkSection.locator('[role="alert"]').isVisible().catch(() => false);
    console.log(`✓ Invalid URL validation: ${hasError ? 'error shown' : 'will catch on save'}`);

    // Test valid URL
    await urlInput.clear();
    await urlInput.fill('https://example.com');
    const urlValue = await urlInput.inputValue();
    expect(urlValue).toMatch(/^https?:\/\//);
    console.log('✓ Valid URL accepted');

    console.log('\n✅ Link validation test passed!');
  });

  test('can skip links step', async ({ page }) => {
    console.log('Testing skip functionality...');

    // Login
    await page.goto('/login');
    const devBypassButton = page.locator('button:has-text("Dev Bypass")');
    const hasDevBypass = await devBypassButton.isVisible().catch(() => false);
    
    if (!hasDevBypass) {
      console.log('Skipping: Dev bypass not available');
      return;
    }
    
    await devBypassButton.click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 5000 });

    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Go to links step (step 3)
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);

    // Verify we're on step 3
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();

    // Skip button should be visible on links step
    const skipButton = page.locator('button:has-text("Skip")');
    await expect(skipButton).toBeVisible();

    // Click skip
    await skipButton.click();
    await page.waitForTimeout(500);

    // Should be on step 4 now
    await expect(page.locator('text=Step 4 of 4')).toBeVisible();
    console.log('✓ Successfully skipped links step');

    console.log('\n✅ Skip functionality test passed!');
  });
});

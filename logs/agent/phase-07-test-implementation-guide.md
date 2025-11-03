# Phase 07: Test Implementation Guide

**Created:** 2025-11-03T03:27:07.930Z  
**Status:** Implementation Guide  
**Priority:** High (Quality Assurance)  
**Estimated Effort:** 6-10 hours

---

## Current State

**Test Infrastructure:** None currently exists  
**Test Framework:** None configured  
**Coverage:** 0%

---

## Recommended Testing Stack

### Unit & Integration Tests
- **Framework:** Vitest (fast, Vite-native, Jest-compatible API)
- **React Testing:** @testing-library/react
- **Utilities:** @testing-library/user-event, @testing-library/jest-dom
- **Mocking:** vi (Vitest built-in), msw (Mock Service Worker)

### E2E Tests
- **Framework:** Playwright
- **Why:** Cross-browser, reliable, great debugging, screenshots/videos

---

## Phase 1: Setup Test Infrastructure (1-2 hours)

### Step 1: Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npm install -D @playwright/test
```

### Step 2: Configure Vitest

Create `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.js',
        '**/*.test.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `tests/setup.js`:

```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

### Step 3: Configure Playwright

```bash
npx playwright install
```

Create `playwright.config.js`:

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 4: Update package.json

Add test scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

---

## Phase 2: Unit Tests (2-3 hours)

### Priority Tests

#### 1. AuthContext Tests

Create `tests/unit/AuthContext.test.jsx`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as authService from '@/services/authService';

vi.mock('@/services/authService');

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with no user', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logs in successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User' };
    authService.login.mockResolvedValue({ user: mockUser, token: 'test-token' });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login failure gracefully', async () => {
    authService.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await expect(
      act(async () => {
        await result.current.login('test@example.com', 'wrong');
      })
    ).rejects.toThrow();

    expect(result.current.user).toBeNull();
  });

  it('logs out successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    authService.login.mockResolvedValue({ user: mockUser, token: 'test-token' });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
```

#### 2. useApiFallback Hook Tests

Create `tests/unit/useApiFallback.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApiFallback } from '@/hooks/useApiFallback';

describe('useApiFallback', () => {
  it('returns data on successful API call', async () => {
    const mockApiCall = vi.fn().mockResolvedValue({ data: 'success' });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ data: 'success' });
    expect(result.current.usingFallback).toBe(false);
  });

  it('returns fallback data on network error', async () => {
    const mockApiCall = vi.fn().mockRejectedValue({ code: 'ERR_NETWORK' });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ data: 'fallback' });
    expect(result.current.usingFallback).toBe(true);
  });

  it('returns fallback data on 5xx error', async () => {
    const mockApiCall = vi.fn().mockRejectedValue({
      response: { status: 500 },
    });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ data: 'fallback' });
    expect(result.current.usingFallback).toBe(true);
  });

  it('does not use fallback for 4xx errors', async () => {
    const mockApiCall = vi.fn().mockRejectedValue({
      response: { status: 404 },
      message: 'Not found',
    });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.usingFallback).toBe(false);
  });
});
```

#### 3. PostCard Component Tests

Create `tests/unit/PostCard.test.jsx`:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PostCard from '@/components/PostCard';

const mockPost = {
  id: '1',
  content: 'Test post content',
  author: {
    displayName: 'Test User',
    username: 'testuser',
    avatar: 'https://example.com/avatar.jpg',
  },
  createdAt: '2024-01-01T00:00:00Z',
  likes: 10,
  comments: 5,
  isLiked: false,
};

describe('PostCard', () => {
  it('renders post content', () => {
    render(
      <BrowserRouter>
        <PostCard post={mockPost} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test post content')).toBeInTheDocument();
  });

  it('renders author information', () => {
    render(
      <BrowserRouter>
        <PostCard post={mockPost} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('displays like and comment counts', () => {
    render(
      <BrowserRouter>
        <PostCard post={mockPost} />
      </BrowserRouter>
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
```

#### 4. ThemeToggle Component Tests

Create `tests/unit/ThemeToggle.test.jsx`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '@/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders theme toggle button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('toggles theme on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await user.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme preference', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
```

---

## Phase 3: E2E Tests (3-4 hours)

### Critical User Flows

#### 1. Authentication Flow

Create `tests/e2e/auth.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign up and complete profile setup', async ({ page }) => {
    await page.goto('/join');

    // Fill registration form
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="displayName"]', 'Test User');
    await page.fill('[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to profile setup
    await expect(page).toHaveURL('/setup');

    // Complete profile setup
    await page.fill('[name="bio"]', 'Test bio');
    await page.click('button:has-text("Complete Profile")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('user can login with existing credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('dev login works in development mode', async ({ page }) => {
    await page.goto('/login');

    // Click dev login button
    await page.click('button:has-text("Dev Login")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });
});
```

#### 2. Reels Interaction Flow

Create `tests/e2e/reels.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Reels', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.click('button:has-text("Dev Login")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can navigate to reels page', async ({ page }) => {
    await page.click('a[href="/reels"]');
    await expect(page).toHaveURL('/reels');

    // Wait for video to load
    await expect(page.locator('video')).toBeVisible();
  });

  test('can navigate reels with arrow keys', async ({ page }) => {
    await page.goto('/reels');

    // Get initial reel
    const initialCaption = await page.textContent('.reel-caption');

    // Press arrow down
    await page.keyboard.press('ArrowDown');

    // Wait for next reel to load
    await page.waitForTimeout(500);

    const nextCaption = await page.textContent('.reel-caption');
    expect(nextCaption).not.toBe(initialCaption);
  });

  test('can like a reel', async ({ page }) => {
    await page.goto('/reels');

    // Get initial like count
    const likeButton = page.locator('[aria-label="Like"]');
    const initialLikes = await page.textContent('.like-count');

    // Click like
    await likeButton.click();

    // Verify like count increased
    const newLikes = await page.textContent('.like-count');
    expect(parseInt(newLikes)).toBe(parseInt(initialLikes) + 1);

    // Verify button state changed
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('can mute/unmute reel', async ({ page }) => {
    await page.goto('/reels');

    const muteButton = page.locator('[aria-label*="mute" i]');
    const video = page.locator('video');

    // Initially muted
    await expect(video).toHaveAttribute('muted', '');

    // Click to unmute
    await muteButton.click();
    await expect(video).not.toHaveAttribute('muted');

    // Click to mute
    await muteButton.click();
    await expect(video).toHaveAttribute('muted', '');
  });
});
```

#### 3. Messaging Flow

Create `tests/e2e/messaging.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Dev Login")');
  });

  test('can view conversations', async ({ page }) => {
    await page.goto('/inbox');

    await expect(page.locator('.conversation')).toHaveCount.greaterThan(0);
  });

  test('can search conversations', async ({ page }) => {
    await page.goto('/inbox');

    await page.fill('input[placeholder*="Search" i]', 'Sarah');

    // Should filter conversations
    await expect(page.locator('.conversation:has-text("Sarah")')).toBeVisible();
  });

  test('can send a message', async ({ page }) => {
    await page.goto('/inbox');

    // Click first conversation
    await page.click('.conversation:first-child');

    // Type message
    await page.fill('textarea[placeholder*="message" i]', 'Test message');

    // Send message
    await page.click('button:has-text("Send")');

    // Verify message appears
    await expect(page.locator('text=Test message')).toBeVisible();
  });
});
```

---

## Phase 4: CI Integration (1 hour)

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Testing Checklist

### Setup
- [ ] Install Vitest and testing libraries
- [ ] Install Playwright
- [ ] Configure vitest.config.js
- [ ] Configure playwright.config.js
- [ ] Create tests/setup.js
- [ ] Update package.json scripts

### Unit Tests
- [ ] AuthContext tests
- [ ] useApiFallback hook tests
- [ ] PostCard component tests
- [ ] PostComposer component tests
- [ ] ThemeToggle component tests
- [ ] Reels controls tests

### E2E Tests
- [ ] Sign up flow test
- [ ] Login flow test
- [ ] Reels navigation test
- [ ] Reels interaction test (like, mute)
- [ ] Messaging test
- [ ] Notifications test

### CI Integration
- [ ] Create GitHub Actions workflow
- [ ] Configure coverage reporting
- [ ] Setup test reports
- [ ] Add PR checks

---

## Success Criteria

- [ ] At least 60% code coverage
- [ ] All critical user flows have E2E tests
- [ ] Tests run in CI on every PR
- [ ] Tests complete in under 5 minutes
- [ ] Zero flaky tests

---

## Notes

- **Focus on critical paths first** - Authentication, Reels, Messaging
- **Use MSW for API mocking** - Provides realistic API testing
- **Keep tests fast** - Unit tests should complete in seconds
- **E2E tests should be reliable** - Use proper waits, not arbitrary timeouts
- **Test user behavior, not implementation** - Focus on what users do, not how components work internally

---

## Estimated Time Breakdown

| Task | Time |
|------|------|
| Setup infrastructure | 1-2 hours |
| Write unit tests | 2-3 hours |
| Write E2E tests | 3-4 hours |
| CI integration | 1 hour |
| **Total** | **7-10 hours** |

---

## Decision: Document and Continue

Per user request, Phase 07 testing is documented here. Implementation can be done later when time permits. Moving forward to Phase 08 (CI/CD) and beyond.

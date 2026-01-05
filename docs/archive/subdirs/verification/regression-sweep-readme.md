# Frontend Regression & Accessibility Sweep

## Overview

This comprehensive test suite validates PRs 155-185 for:
- ✅ Accessibility compliance (WCAG AA)
- ✅ Visual regression across browsers
- ✅ CSP/XSS security compliance
- ✅ Negative flow handling (errors, timeouts, rate limits)
- ✅ Avatar upload end-to-end
- ✅ Cross-browser compatibility (Chromium, WebKit, Firefox)

## Quick Start

### Prerequisites

```powershell
# Install dependencies
npm install

# Install Playwright browsers (if not already installed)
npx playwright install chromium webkit firefox
```

### Run Full Test Suite

```powershell
# Run the complete regression sweep
./tests/e2e/run-regression-sweep.sh
```

### Run Individual Test Suites

```powershell
# Accessibility tests only
npx playwright test tests/e2e/accessibility-sweep.spec.ts

# Visual regression tests only
npx playwright test tests/e2e/visual-regression.spec.ts

# CSP compliance tests only
npx playwright test tests/e2e/csp-compliance.spec.ts

# Negative flow tests only
npx playwright test tests/e2e/negative-flows.spec.ts

# Avatar upload tests only
npx playwright test tests/e2e/avatar-upload.spec.ts

# Onboarding flow tests only
npx playwright test tests/e2e/onboarding-flow.spec.ts
```

### Run Tests for Specific Browser

```powershell
# Run on Chromium only
npx playwright test --project=chromium

# Run on WebKit (Safari) only
npx playwright test --project=webkit

# Run on Firefox only
npx playwright test --project=firefox
```

## Test Suites

### 1. Accessibility Sweep (`accessibility-sweep.spec.ts`)

Tests all main user flows with axe-core for WCAG AA compliance:

**Coverage:**
- Marketing pages (Home, About, Features)
- Authentication flows (Login, Signup, 2FA, Reset Password)
- Dashboard and authenticated pages
- Profile pages (view, edit)
- Settings page
- Onboarding wizard

**Output:**
- Prioritized list of violations (critical → serious → moderate → minor)
- File pointers for affected components
- Suggested fixes for each violation
- WCAG guideline references

**Example Output:**
```
==========================================================
Accessibility Report: Login Page
==========================================================
Critical: 0
Serious: 1
Moderate: 3
Minor: 2
Total: 6

--- Violations by Priority ---

1. [SERIOUS] color-contrast
   Description: Elements must have sufficient color contrast
   Help: Ensure text has sufficient contrast ratio
   More info: https://dequeuniversity.com/rules/axe/4.0/color-contrast
   Affected nodes: 2
   Node 1:
     Selector: button.submit-button
     HTML: <button class="text-gray-500 bg-white">Sign In</button>
     Issue: Element has insufficient color contrast of 2.1 (foreground color: #777777, background color: #ffffff, font size: 14.0pt, font weight: normal). Expected contrast ratio of 4.5:1
```

### 2. Visual Regression (`visual-regression.spec.ts`)

Captures screenshots of key components and pages across all browsers:

**Components Tested:**
- Header component
- Button variants (primary, secondary, outline)
- Card component
- Onboarding wizard steps
- Profile edit form

**Full Page Snapshots:**
- Home page
- Login page
- Dashboard
- Settings page
- Profile edit page

**Viewports Tested:**
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)

**Output:**
- Baseline screenshots on first run
- Diff images on subsequent runs
- Per-pixel comparison with configurable threshold

### 3. CSP Compliance (`csp-compliance.spec.ts`)

Validates Content Security Policy readiness and XSS protection:

**Checks:**
- ❌ Inline `<script>` tags
- ❌ Event handler attributes (`onclick`, `onload`, etc.)
- ❌ Inline `<style>` tags
- ❌ `style=""` attributes
- ✅ DOMPurify usage for user content
- ✅ External resource whitelisting
- ✅ XSS payload rejection in forms
- ✅ URL parameter sanitization

**Output:**
- Count of violations by type
- File pointers for each violation
- Recommended CSP header configuration
- Remediation steps with priority

### 4. Negative Flow Testing (`negative-flows.spec.ts`)

Tests error handling and edge cases:

**Scenarios:**
- Expired auth tokens (login, refresh, verification)
- Wrong 2FA codes (single attempt, multiple attempts → lockout)
- Rate limiting (login, password reset, API calls)
- Network errors (timeout, offline, server errors)
- Concurrent requests (login spam, token refresh race)
- Invalid state transitions (completed onboarding, missing tokens)

**Example Tests:**
```typescript
✅ Login with expired auth token → redirects to login
✅ Wrong 2FA code 5 times → account locked for 15 minutes
✅ Login rate limit → "Too many attempts" after 3 failures
✅ Network timeout → shows user-friendly error
✅ Multiple simultaneous logins → prevents duplicates
```

### 5. Avatar Upload E2E (`avatar-upload.spec.ts`)

End-to-end testing of avatar upload flow:

**Coverage:**
- File picker upload (valid image)
- Drag-and-drop upload
- File type validation (reject PDFs, etc.)
- File size validation (reject > 5MB)
- Progress indicator during upload
- Cancel upload mid-flight
- Retry after failed upload
- Preview image display
- Cross-browser compatibility
- Mobile responsive touch targets
- Keyboard accessibility
- ARIA attributes

### 6. Onboarding Flow (`onboarding-flow.spec.ts`)

Multi-step onboarding wizard testing:

**Steps Tested:**
1. Welcome screen
2. Profile basics (name, headline, title, location)
3. Links setup (add, edit, remove, reorder via drag-and-drop)
4. Preferences and privacy settings

**Features:**
- Autosave to localStorage
- Resume after page refresh
- Skip optional steps
- Validation (label length, URL format)
- State persistence
- Completion redirect

## Configuration

### Playwright Config (`playwright.config.js`)

```javascript
{
  timeout: 120000,
  workers: 2, // Rate limit friendly
  retries: 2, // Retry flaky tests in CI
  browsers: ['chromium', 'webkit', 'firefox'],
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure'
}
```

### Environment Variables

```powershell
# Base URL for tests
PW_BASE_URL=http://localhost:3000

# Enable/disable auth enforcement
VITE_ENABLE_AUTH=false

# Enable/disable backend API integration
VITE_ENABLE_PROFILE_LINKS_API=true
```

## Test Artifacts

After running tests, find artifacts in:

```
test-results/
├── accessibility/
│   └── results.json          # axe-core violations
├── visual-regression/
│   └── results.json          # screenshot diffs
├── csp-compliance/
│   └── results.json          # CSP violations
├── negative-flows/
│   └── results.json          # error handling results
├── consolidated-report.json  # Full JSON report
└── *.png                     # Screenshots and diffs

playwright-report/
└── index.html                # Interactive HTML report
```

## Viewing Reports

### HTML Report (Recommended)

```powershell
# Open interactive report
npx playwright show-report playwright-report
```

The HTML report includes:
- Test results with filtering
- Screenshots and videos
- Traces for debugging
- Performance metrics
- Error stack traces

### Generate Markdown Report

```powershell
# Generate consolidated markdown report
node scripts/generate-regression-report.mjs
```

Output: `REGRESSION_SWEEP_REPORT.md`

Contains:
- Executive summary
- Prioritized issue list
- Fix recommendations
- Draft PR payloads
- Detailed findings per category

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Regression & A11y Sweep

on:
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Build
        run: npm run build
      
      - name: Run regression sweep
        run: ./tests/e2e/run-regression-sweep.sh
      
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
          retention-days: 30
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: regression-report
          path: REGRESSION_SWEEP_REPORT.md
```

## Troubleshooting

### Browsers Not Installed

```powershell
npx playwright install chromium webkit firefox --with-deps
```

### Tests Timing Out

Increase timeout in test or config:

```typescript
test('my test', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes
  // ...
});
```

### Dev Server Not Starting

Start manually in a separate terminal:

```powershell
npm run dev
```

Then run tests with existing server:

```powershell
PW_BASE_URL=http://localhost:3000 npx playwright test
```

### Visual Regression Diffs Failing

Update snapshots after intentional changes:

```powershell
npx playwright test --update-snapshots
```

### Rate Limiting in CI

Set workers to 1 to avoid parallel requests:

```powershell
npx playwright test --workers=1
```

## Contributing

When adding new tests:

1. Follow existing test structure and naming
2. Use descriptive test names
3. Add console.log statements for debugging
4. Document expected behaviors
5. Test both success and error cases
6. Update this README with new test coverage

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

## Support

For issues or questions:
1. Check existing test output logs
2. Review playwright-report/index.html
3. Check test-results/ for detailed JSON
4. Review REGRESSION_SWEEP_REPORT.md

---

**Last Updated:** 2025-11-06
**Test Suite Version:** 1.0.0
**Task ID:** fe-post-merge-regression-and-a11y-sweep-155-185

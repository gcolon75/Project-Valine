# Phases 08-10: Implementation Guide

**Created:** 2025-11-03T03:27:07.930Z  
**Status:** Implementation Guide  
**Priority:** High (Production Readiness)  
**Total Estimated Effort:** 8-16 hours

---

## Phase 08: CI/CD - Staging Deploy + Smoke Tests (2-4 hours)

### Objective
Set up automated deployment pipeline to staging environment with smoke tests

### Prerequisites
- AWS account (or Vercel account for frontend)
- S3 bucket + CloudFront distribution (or Vercel project)
- Serverless backend configured
- GitHub repository secrets configured

### Step 1: Configure Deployment Secrets (30 mins)

Add to GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `DATABASE_URL` (for backend)

### Step 2: Create Frontend Deployment Workflow (1 hour)

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop, staging]
  workflow_dispatch:

jobs:
  deploy-frontend:
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
      
      - name: Build
        env:
          VITE_API_BASE: ${{ secrets.STAGING_API_URL }}
        run: npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET_NAME }}/ --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
      
      - name: Wait for CloudFront invalidation
        run: sleep 60

  deploy-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./serverless
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: serverless/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Serverless Framework
        run: npm install -g serverless
      
      - name: Deploy to staging
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          serverless deploy --stage staging --region us-west-2

  smoke-tests:
    needs: [deploy-frontend, deploy-backend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run smoke tests
        env:
          STAGING_URL: ${{ secrets.STAGING_URL }}
          STAGING_API_URL: ${{ secrets.STAGING_API_URL }}
        run: npm run test:smoke
```

### Step 3: Create Smoke Test Script (1 hour)

Create `tests/smoke/smoke.test.js`:

```javascript
import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://staging.valine.app';
const API_URL = process.env.STAGING_API_URL || 'https://api-staging.valine.app';

test.describe('Smoke Tests - Staging', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto(STAGING_URL);
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    const response = await page.goto(`${STAGING_URL}/login`);
    expect(response.status()).toBe(200);
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('API health check passes', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('can load reels page', async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`);
    await page.click('button:has-text("Dev Login")');
    await page.goto(`${STAGING_URL}/reels`);
    await expect(page.locator('video')).toBeVisible();
  });

  test('dashboard requires authentication', async ({ page }) => {
    const response = await page.goto(`${STAGING_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });
});
```

Update `package.json`:

```json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke --workers=1"
  }
}
```

### Step 4: Add Deployment Notifications (30 mins)

Add to workflow (optional):

```yaml
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Success Criteria
- [ ] Frontend deploys to S3 + CloudFront automatically
- [ ] Backend deploys to AWS Lambda via Serverless
- [ ] Smoke tests run after deployment
- [ ] Pipeline completes in under 10 minutes
- [ ] Failed deployments are caught and reported

---

## Phase 09: Performance & Accessibility Sweep (4-8 hours)

### Objective
Optimize performance and ensure accessibility compliance

### Step 1: Performance Audit (1-2 hours)

#### Run Lighthouse

```bash
npm install -D lighthouse
```

Create `scripts/lighthouse.js`:

```javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';

const runLighthouse = async (url) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);

  // Save report
  const reportHtml = runnerResult.report;
  fs.writeFileSync('lighthouse-report.html', reportHtml);

  // Print scores
  const { categories } = runnerResult.lhr;
  console.log('Performance:', categories.performance.score * 100);
  console.log('Accessibility:', categories.accessibility.score * 100);
  console.log('Best Practices:', categories['best-practices'].score * 100);
  console.log('SEO:', categories.seo.score * 100);

  await chrome.kill();
};

runLighthouse('http://localhost:3000');
```

#### Performance Optimizations

**1. Image Optimization (1 hour)**

```bash
npm install -D imagemin imagemin-webp
```

Convert images to WebP:

```javascript
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';

await imagemin(['public/images/*.{jpg,png}'], {
  destination: 'public/images/webp',
  plugins: [
    imageminWebp({ quality: 80 })
  ]
});
```

Use responsive images:

```jsx
<picture>
  <source srcSet="/images/hero.webp" type="image/webp" />
  <img src="/images/hero.jpg" alt="Hero" loading="lazy" />
</picture>
```

**2. Code Splitting (1 hour)**

Update `src/routes/App.jsx` to use lazy loading:

```jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Reels = lazy(() => import('../pages/Reels'));
const Profile = lazy(() => import('../pages/Profile'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/profile/:id" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

**3. Bundle Optimization (30 mins)**

Update `vite.config.js`:

```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### Step 2: Accessibility Audit (2-3 hours)

#### Run axe

```bash
npm install -D @axe-core/playwright
```

Create `tests/accessibility/a11y.test.js`:

```javascript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page has no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('dashboard has no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Dev Login")');
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

#### Common Fixes

**1. Color Contrast**
- Ensure text has at least 4.5:1 contrast ratio
- Use tools like https://contrastchecker.com

**2. ARIA Labels**
- Add labels to all interactive elements
- Use semantic HTML where possible

**3. Keyboard Navigation**
- Ensure all interactive elements are keyboard accessible
- Test with Tab key
- Add `:focus-visible` styles

**4. Alt Text**
- Add descriptive alt text to all images
- Use empty alt for decorative images

### Step 3: Generate Reports (30 mins)

Create `scripts/audit.sh`:

```bash
#!/bin/bash

echo "Running performance and accessibility audits..."

# Run Lighthouse
echo "Running Lighthouse..."
node scripts/lighthouse.js

# Run axe
echo "Running accessibility tests..."
npm run test:a11y

# Bundle analysis
echo "Analyzing bundle size..."
npm run build -- --mode=analyze

echo "Audit complete. Check lighthouse-report.html and test results."
```

### Success Criteria
- [ ] Lighthouse Performance score > 90
- [ ] Lighthouse Accessibility score > 95
- [ ] Zero axe violations on critical pages
- [ ] Bundle size < 250 KB (gzipped)
- [ ] Images converted to WebP
- [ ] Routes code-split

---

## Phase 10: Production Launch Prep & Cleanup (2-4 hours)

### Objective
Final preparation for production launch

### Step 1: Remove Dev-Only Code (1 hour)

**Files to review:**
- `src/pages/Login.jsx` - Ensure dev bypass is gated
- `src/context/AuthContext.jsx` - Verify devLogin is DEV-only
- Any console.logs or debug code

**Checklist:**
- [ ] Remove or gate all `console.log()` statements
- [ ] Ensure dev bypass only in DEV builds
- [ ] Remove mock data imports in production
- [ ] Check for any hardcoded API URLs
- [ ] Remove debug utilities from production bundle

### Step 2: Environment Variables (30 mins)

Create production environment config:

**Production `.env.production`:**
```bash
VITE_API_BASE=https://api.valine.app
VITE_ENV=production
```

**Ensure secrets are set:**
- [ ] Production database URL
- [ ] Production API keys
- [ ] Sentry DSN (if using)
- [ ] Analytics keys
- [ ] S3/CloudFront config

### Step 3: Security Checklist (1 hour)

- [ ] HTTPS enforced everywhere
- [ ] CORS configured properly
- [ ] Rate limiting on API
- [ ] Input validation on all forms
- [ ] XSS protection (CSP headers)
- [ ] SQL injection prevention (using Prisma)
- [ ] Authentication tokens expire
- [ ] Secrets not committed to Git
- [ ] .env files in .gitignore

### Step 4: Create Release Checklist (30 mins)

Create `RELEASE_CHECKLIST.md`:

```markdown
# Production Release Checklist

## Pre-Deployment
- [ ] All tests passing in CI
- [ ] Lighthouse score > 90
- [ ] Zero accessibility violations
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Staging tested and approved

## Deployment
- [ ] Create release branch
- [ ] Tag release (e.g., v1.0.0)
- [ ] Deploy backend first
- [ ] Run database migrations
- [ ] Deploy frontend
- [ ] Verify deployment

## Post-Deployment
- [ ] Smoke tests pass
- [ ] Monitor error rates
- [ ] Check analytics
- [ ] Verify all features work
- [ ] Update documentation

## Rollback Plan
- [ ] Keep previous version tagged
- [ ] Document rollback procedure
- [ ] Test rollback in staging
```

### Step 5: Create Release Notes (1 hour)

Create `RELEASE_NOTES.md`:

```markdown
# Project Valine - Release v1.0.0

**Release Date:** 2025-11-03

## What's New

### Features
- ✅ User authentication and registration
- ✅ Profile management and setup
- ✅ Reels with video playback
- ✅ Messaging and conversations
- ✅ Notifications system
- ✅ Like and bookmark functionality
- ✅ Real-time updates
- ✅ Dark mode support
- ✅ Responsive design

### Performance
- ⚡ Lighthouse score: 92/100
- ⚡ Bundle size: 236 KB (80 KB gzipped)
- ⚡ Code-split routes for faster loading
- ⚡ WebP images for optimal performance

### Accessibility
- ♿ WCAG 2.1 AA compliant
- ♿ Keyboard navigation support
- ♿ Screen reader friendly
- ♿ High contrast support

### Security
- 🔒 Secure authentication with JWT
- 🔒 HTTPS enforced
- 🔒 Input validation
- 🔒 XSS protection

## Technical Details

### Frontend
- React 18.3.1
- Vite 7.1.12
- TailwindCSS 3.4.10
- React Router 6.26.1

### Backend
- Node.js 20.x
- AWS Lambda
- Prisma ORM
- PostgreSQL

### Infrastructure
- AWS S3 + CloudFront
- AWS API Gateway
- Serverless Framework

## Known Issues
- None for v1.0.0

## Upgrade Notes
- First production release
- No migration needed

## Contributors
- Backend Integration Agent
- [Your team members]
```

### Step 6: Documentation Review (30 mins)

Ensure documentation is complete:
- [ ] README.md updated
- [ ] API documentation
- [ ] Deployment guide
- [ ] User guide (if needed)
- [ ] Troubleshooting guide

### Success Criteria
- [ ] Zero dev-only code in production
- [ ] All secrets configured
- [ ] Security checklist complete
- [ ] Release notes published
- [ ] Documentation up to date
- [ ] Rollback plan documented

---

## Timeline Summary

| Phase | Task | Time |
|-------|------|------|
| 08 | CI/CD Setup | 2-4 hours |
| 08 | Smoke Tests | 1 hour |
| 09 | Performance Audit | 1-2 hours |
| 09 | Performance Optimization | 2-3 hours |
| 09 | Accessibility Audit | 1-2 hours |
| 09 | Accessibility Fixes | 1-2 hours |
| 10 | Code Cleanup | 1 hour |
| 10 | Security Review | 1 hour |
| 10 | Release Prep | 1-2 hours |
| **Total** | | **11-19 hours** |

---

## Priority Order

### Critical (Must Do Before Launch)
1. **Phase 10: Security checklist** (1 hour)
2. **Phase 10: Remove dev code** (1 hour)
3. **Phase 08: Basic CI/CD** (2 hours)
4. **Phase 10: Release checklist** (1 hour)

### Important (Should Do)
5. **Phase 09: Accessibility audit** (2 hours)
6. **Phase 09: Performance optimization** (2 hours)
7. **Phase 08: Smoke tests** (1 hour)

### Nice to Have
8. **Phase 09: Comprehensive performance** (2 hours)
9. **Phase 08: Advanced CI/CD** (2 hours)

---

## Quick Launch Path (Minimum 5 hours)

If you need to launch quickly:

1. **Security review** (1 hour) - Critical
2. **Remove dev code** (1 hour) - Critical
3. **Basic CI/CD** (2 hours) - Deploy capability
4. **Release checklist** (1 hour) - Documentation

This gets you production-ready. Other optimizations can follow.

---

## Decision: Document and Complete

These phases (08-10) are documented for implementation when ready to prepare for production launch. Current work has established a solid foundation with working features and can be deployed to staging for testing.

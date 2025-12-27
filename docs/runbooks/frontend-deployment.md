# Frontend Deployment Runbook

> 📘 **Note**: This runbook covers frontend-specific deployment procedures. For comprehensive production operations including backend deployment, routing, WAF configuration, and security hardening, see the canonical **[Production Deployment & Routing Runbook](./prod-deploy-and-routing.md)**.

## Overview
Production deployment checklist and procedures for Project Valine frontend application. This runbook covers environment configuration, build process, S3 deployment, CloudFront cache invalidation, and common deployment issues.

**Last Updated**: 2025-11-12  
**Owner**: Frontend & Operations Team  
**Risk Level**: Medium  
**Estimated Time**: 15-20 minutes

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Post-Deployment Verification](#post-deployment-verification)
- [Common Issues](#common-issues)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)
- [12. Local Dev Bypass](#12-local-dev-bypass)

---

## Prerequisites

### Required Access
- [x] AWS CLI configured with appropriate IAM permissions
- [x] AWS S3:PutObject, S3:DeleteObject permissions
- [x] AWS CloudFront:CreateInvalidation permission
- [x] Repository access with latest code

### Required Tools
```powershell
# Verify Node.js (v18+)
node --version
# Expected: v18.x.x or v20.x.x

# Verify npm (v9+)
npm --version
# Expected: v9.x.x or v10.x.x

# Verify AWS CLI
aws --version
# Expected: aws-cli/2.x.x

# Verify AWS credentials
aws sts get-caller-identity
```

### Required Environment Variables

> ⚠️ **Critical**: Frontend environment variables must be set BEFORE running `npm run build`.

Create `.env.production` file:

```powershell
# .env.production
# ============================================
# Production Frontend Configuration
# ============================================

# API Base URL - MUST be API Gateway URL, NOT CloudFront
# ❌ WRONG: https://valine.app (CloudFront CDN)
# ✅ CORRECT: https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

# Disable registration in production (security)
VITE_ENABLE_REGISTRATION=false

# Enable real API integration
VITE_API_INTEGRATION=true

# Enable cookie-based authentication
VITE_ENABLE_AUTH=true

# Enable CSRF protection
VITE_CSRF_ENABLED=true

# Disable MSW (Mock Service Worker) in production
VITE_USE_MSW=false

# Profile Links API (if backend is ready)
VITE_ENABLE_PROFILE_LINKS_API=true

# Session Tracking (if backend feature is enabled)
VITE_USE_SESSION_TRACKING=false

# Two-Factor Authentication (if backend feature is enabled)
VITE_TWO_FACTOR_ENABLED=false

# Legal Pages (enabled by default)
LEGAL_PAGES_ENABLED=true
```

### AWS Infrastructure Details

```yaml
# S3 Bucket
Bucket Name: valine-frontend-prod
Region: us-west-2
Website Hosting: Enabled

# CloudFront Distribution
Distribution ID: dkmxy676d3vgc
Domain: valine.app
Origin: valine-frontend-prod.s3.us-west-2.amazonaws.com

# API Gateway
API ID: i72dxlcfcc
Region: us-west-2
Endpoint: https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
```

---

## Pre-Deployment Checklist

### 1. Code Quality Checks

```powershell
# Run linter (if configured)
npm run lint || echo "No lint script configured"

# Run tests
npm run test:run

# Expected: All tests pass
# ✅ Test Files  X passed (X)
# ✅ Tests  X passed | X failed | X skipped (X)
```

### 2. Verify Environment Configuration

```powershell
# Check .env.production exists
if [ -f .env.production ]; then
  echo "✅ .env.production found"
  Get-Content .env.production
else
  echo "❌ .env.production missing!"
  exit 1
fi

# Verify VITE_API_BASE is API Gateway URL (NOT CloudFront)
Select-String "VITE_API_BASE" .env.production | Select-String -q "execute-api" && \
  echo "✅ VITE_API_BASE correctly set to API Gateway" || \
  echo "❌ WARNING: VITE_API_BASE should be API Gateway URL!"

# Verify registration is disabled
Select-String "VITE_ENABLE_REGISTRATION=false" .env.production && \
  echo "✅ Registration disabled" || \
  echo "⚠️ WARNING: Registration may be enabled!"
```

### 3. Review Recent Changes

```powershell
# Check what changed since last deployment
git log --oneline -10

# Review uncommitted changes
git status

# Ensure working directory is clean
if [ -z "$(git status --porcelain)" ]; then
  echo "✅ Working directory clean"
else
  echo "⚠️ WARNING: Uncommitted changes detected"
  git status
fi
```

### 4. Backup Current Production

```powershell
# Create backup of current production build
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

aws s3 sync s3://valine-frontend-prod/ \
  s3://valine-frontend-backups/backup-${BACKUP_DATE}/ \
  --region us-west-2

echo "✅ Backup created: s3://valine-frontend-backups/backup-${BACKUP_DATE}/"
```

---

## Step-by-Step Deployment

### Step 1: Clean Previous Build

```powershell
# Remove previous build artifacts
rm -rf dist/
rm -rf node_modules/.vite/

echo "✅ Previous build artifacts removed"
```

### Step 2: Install Dependencies

```powershell
# Ensure all dependencies are installed
npm ci

# Verify critical dependencies
npm list react react-dom react-router-dom axios
```

**Expected Output:**
```
valine-client@0.0.1
├── react@18.3.1
├── react-dom@18.3.1
├── react-router-dom@6.26.1
└── axios@1.7.2
```

### Step 3: Build for Production

```powershell
# Build with production environment
NODE_ENV=production npm run build

# Build script runs:
# 1. npm run seo:generate (OG images, favicons)
# 2. vite build (bundle app)
# 3. npm run seo:build (sitemap, robots.txt)
```

**Expected Output:**
```
vite v5.x.x building for production...
✓ X modules transformed.
dist/index.html                   X.XX kB │ gzip: X.XX kB
dist/assets/index-XXXXXXXX.css   XX.XX kB │ gzip: XX.XX kB
dist/assets/index-XXXXXXXX.js   XXX.XX kB │ gzip: XX.XX kB
✓ built in Xs
```

### Step 4: Verify Build Output

```powershell
# Check dist/ directory structure
ls -lh dist/

# Verify critical files exist
required_files=(
  "index.html"
  "assets/index-*.js"
  "assets/index-*.css"
  "favicon.ico"
  "robots.txt"
  "sitemap.xml"
)

for file in "${required_files[@]}"; do
  if ls dist/$file 1> /dev/null 2>&1; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing!"
  fi
done
```

### Step 5: Verify API Base in Build

> 🔍 **Critical Check**: Ensure build contains correct API Gateway URL.

```powershell
# Search for API Gateway URL in compiled JavaScript
Select-String -r "execute-api" dist/assets/*.js && \
  echo "✅ API Gateway URL found in build" || \
  echo "❌ ERROR: API Gateway URL NOT in build! Check .env.production"

# Verify CloudFront URL is NOT in API calls
Select-String -r "https://valine.app/auth" dist/assets/*.js && \
  echo "❌ ERROR: Using CloudFront URL for API!" || \
  echo "✅ Not using CloudFront URL for API"
```

### Step 6: Deploy to S3

```powershell
# Sync build to S3 bucket
aws s3 sync dist/ s3://valine-frontend-prod/ \
  --region us-west-2 \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "sitemap.xml" \
  --exclude "robots.txt"

# Upload index.html with no-cache (for immediate updates)
aws s3 cp dist/index.html s3://valine-frontend-prod/index.html \
  --region us-west-2 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8"

# Upload sitemap and robots with short cache
aws s3 cp dist/sitemap.xml s3://valine-frontend-prod/sitemap.xml \
  --region us-west-2 \
  --cache-control "public, max-age=3600"

aws s3 cp dist/robots.txt s3://valine-frontend-prod/robots.txt \
  --region us-west-2 \
  --cache-control "public, max-age=3600"
```

**Expected Output:**
```
upload: dist/index.html to s3://valine-frontend-prod/index.html
upload: dist/assets/index-abc123.js to s3://valine-frontend-prod/assets/index-abc123.js
upload: dist/assets/index-def456.css to s3://valine-frontend-prod/assets/index-def456.css
...
```

### Step 7: Invalidate CloudFront Cache

> ⚠️ **Important**: CloudFront cache MUST be invalidated for users to see new version.

```powershell
# Create CloudFront invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id dkmxy676d3vgc \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ Invalidation created: $INVALIDATION_ID"

# Monitor invalidation status
aws cloudfront get-invalidation \
  --distribution-id dkmxy676d3vgc \
  --id "$INVALIDATION_ID" \
  --query 'Invalidation.Status' \
  --output text
```

**Expected Status Progression:**
- `InProgress` → Wait 1-5 minutes
- `Completed` → Deployment complete

```powershell
# Wait for invalidation to complete
while true; do
  STATUS=$(aws cloudfront get-invalidation \
    --distribution-id dkmxy676d3vgc \
    --id "$INVALIDATION_ID" \
    --query 'Invalidation.Status' \
    --output text)
  
  echo "$(date -Iseconds) - Invalidation Status: $STATUS"
  
  if [ "$STATUS" = "Completed" ]; then
    echo "✅ CloudFront cache invalidated!"
    break
  fi
  
  sleep 30
done
```

---

## Post-Deployment Verification

### Test 1: Homepage Loads

```powershell
# Test homepage
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts/{id}" -Method Get
```

**Expected Response:**
```
HTTP/2 200
content-type: text/html
cache-control: no-cache, no-store, must-revalidate
x-amz-cf-id: ...
```

### Test 2: Static Assets Load

```powershell
# Get main JS bundle from homepage
Invoke-RestMethod -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get

# Test asset loads
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get
```

**Expected Response:**
```
HTTP/2 200
content-type: application/javascript
cache-control: public, max-age=31536000, immutable
```

### Test 3: API Calls Work

```powershell
# Open browser DevTools and check Network tab
# Visit: https://valine.app
# Expected API calls should go to:
# ✅ https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/...
# ❌ NOT https://valine.app/auth/...

# Test login endpoint directly
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"test123"}' -ContentType 'application/json'
```

**Expected Behavior:**
- Request goes to API Gateway (visible in Network tab)
- CORS headers present
- Response from Lambda backend

### Test 4: Registration is Disabled

```powershell
# Visit signup page (should show message or hide form)
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Get
```

**Expected:**
- Signup page shows "Registration is currently closed"
- Or signup route redirects to login

### Test 5: Critical User Flows

Manual testing checklist:

- [ ] Homepage loads without errors
- [ ] Login page accessible
- [ ] Login with valid credentials works
- [ ] Dashboard/profile loads for authenticated user
- [ ] Navigation works (header, footer links)
- [ ] Images load correctly
- [ ] No console errors in browser DevTools
- [ ] Mobile responsive layout works

### Test 6: Check Browser Console

```javascript
// Open browser DevTools Console (F12)
// Run these checks:

// 1. No errors
console.log('Check for errors above');

// 2. API base is correct
console.log('API Base:', import.meta.env.VITE_API_BASE);
// Expected: https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

// 3. Registration disabled
console.log('Registration enabled:', import.meta.env.VITE_ENABLE_REGISTRATION);
// Expected: "false" or undefined
```

---

## Common Issues

### Issue 1: API 404 Errors

**Symptoms:**
```
GET https://valine.app/auth/me → 404 Not Found
```

**Root Cause:**
- `VITE_API_BASE` set to CloudFront URL instead of API Gateway URL

**Diagnosis:**
```powershell
# Check what API base was baked into build
Select-String -o "VITE_API_BASE[^\"]*" dist/assets/*.js | head -1
```

**Solution:**
```powershell
# Update .env.production
Get-Content > .env.production << 'EOF'
VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
VITE_ENABLE_REGISTRATION=false
EOF

# Rebuild and redeploy
rm -rf dist/
NODE_ENV=production npm run build
aws s3 sync dist/ s3://valine-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id dkmxy676d3vgc --paths "/*"
```

### Issue 2: CORS Errors

**Symptoms:**
```
Access to fetch at 'https://i72dxlcfcc...' from origin 'https://valine.app' 
has been blocked by CORS policy
```

**Root Cause:**
- API Gateway CORS not configured
- Wrong origin in CORS headers

**Solution:**
```powershell
# Verify CORS headers from API
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get -Headers @{
    "Origin" = "https://valine.app"
    "Access-Control-Request-Method" = "POST"
}
```

**If CORS headers missing**, update backend Lambda CORS configuration.

### Issue 3: Old Version Still Showing

**Symptoms:**
- Users see old version after deployment
- Changes not visible

**Root Cause:**
- CloudFront cache not invalidated
- Browser cache

**Solution:**
```powershell
# 1. Verify CloudFront invalidation completed
aws cloudfront get-invalidation \
  --distribution-id dkmxy676d3vgc \
  --id "$INVALIDATION_ID" \
  --query 'Invalidation.Status' \
  --output text

# 2. Hard refresh in browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 3. Clear browser cache

# 4. Test in incognito/private window

# 5. Verify S3 has new files
aws s3 ls s3://valine-frontend-prod/assets/ --recursive | tail -5
```

### Issue 4: Registration Form Still Visible

**Symptoms:**
- Signup page shows registration form
- Should be hidden in production

**Root Cause:**
- `VITE_ENABLE_REGISTRATION` not set to false

**Diagnosis:**
```powershell
# Check build environment
Select-String "VITE_ENABLE_REGISTRATION" dist/assets/*.js
```

**Solution:**
```powershell
# Ensure .env.production has correct setting
echo "VITE_ENABLE_REGISTRATION=false" >> .env.production

# Rebuild
rm -rf dist/
NODE_ENV=production npm run build

# Redeploy
aws s3 sync dist/ s3://valine-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id dkmxy676d3vgc --paths "/*"
```

### Issue 5: Blank Page or "Cannot GET /"

**Symptoms:**
- https://valine.app shows blank page
- https://valine.app/dashboard shows "Cannot GET /dashboard"

**Root Cause:**
- S3 website hosting not configured for SPA routing
- CloudFront not configured to serve index.html for all routes

**Solution:**
```powershell
# Verify S3 website hosting configuration
aws s3api get-bucket-website \
  --bucket valine-frontend-prod \
  --region us-west-2

# Expected:
# {
#   "IndexDocument": { "Suffix": "index.html" },
#   "ErrorDocument": { "Key": "index.html" }
# }

# If not configured, enable website hosting:
aws s3api put-bucket-website \
  --bucket valine-frontend-prod \
  --region us-west-2 \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'
```

### Issue 6: Build Fails

**Symptoms:**
```
ERROR: Top-level await is not available in the configured target environment
```

**Root Cause:**
- Node.js version incompatibility
- Missing dependencies

**Solution:**
```powershell
# 1. Verify Node.js version
node --version
# Must be v18+ or v20+

# 2. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Clear npm cache
npm cache clean --force

# 4. Retry build
npm run build
```

---

## Rollback Procedures

### Quick Rollback to Previous Version

```powershell
# List available backups
aws s3 ls s3://valine-frontend-backups/ --region us-west-2

# Restore from backup
BACKUP_DATE="20251112_143000"  # Replace with backup to restore

aws s3 sync s3://valine-frontend-backups/backup-${BACKUP_DATE}/ \
  s3://valine-frontend-prod/ \
  --region us-west-2 \
  --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id dkmxy676d3vgc \
  --paths "/*"

echo "✅ Rolled back to backup: $BACKUP_DATE"
```

### Rollback via Git

```powershell
# Find previous working commit
git log --oneline -10

# Checkout previous version
PREVIOUS_COMMIT="abc1234"  # Replace with commit hash
git checkout $PREVIOUS_COMMIT

# Rebuild and deploy
rm -rf dist/
NODE_ENV=production npm run build
aws s3 sync dist/ s3://valine-frontend-prod/ --delete --region us-west-2
aws cloudfront create-invalidation --distribution-id dkmxy676d3vgc --paths "/*"

# Return to main branch
git checkout main
```

---

## Troubleshooting

### Debug Build Output

```powershell
# Inspect built index.html
Get-Content dist/index.html

# Check bundle sizes
du -sh dist/assets/*

# Verify environment variables were embedded
strings dist/assets/index-*.js | Select-String "execute-api"
strings dist/assets/index-*.js | Select-String "VITE_ENABLE_REGISTRATION"
```

### Verify S3 Bucket Permissions

```powershell
# Check bucket policy
aws s3api get-bucket-policy \
  --bucket valine-frontend-prod \
  --region us-west-2 \
  | jq -r '.Policy | fromjson'

# Check public access block
aws s3api get-public-access-block \
  --bucket valine-frontend-prod \
  --region us-west-2
```

### Monitor CloudFront Access Logs

```powershell
# Enable CloudFront logging (one-time setup)
aws cloudfront update-distribution \
  --id dkmxy676d3vgc \
  --distribution-config file:///tmp/cf-config-with-logging.json

# View recent access logs
aws s3 ls s3://valine-cloudfront-logs/ --recursive --human-readable \
  | tail -20
```

---

## Deployment Checklist (Quick Reference)

```powershell
# Complete deployment checklist
Get-Content > /tmp/deployment-checklist.md << 'EOF'
## Frontend Deployment Checklist

- [ ] Code reviewed and merged to main
- [ ] Tests passing locally
- [ ] .env.production configured correctly
- [ ] VITE_API_BASE = API Gateway URL (NOT CloudFront)
- [ ] VITE_ENABLE_REGISTRATION = false
- [ ] Backup current production created
- [ ] Build completed successfully
- [ ] API Gateway URL found in build output
- [ ] Deployed to S3
- [ ] CloudFront cache invalidated
- [ ] Invalidation status = Completed
- [ ] Homepage loads correctly
- [ ] API calls work (check DevTools)
- [ ] Login flow tested
- [ ] No console errors
- [ ] Mobile layout verified
- [ ] Deployment documented
EOF
Get-Content /tmp/deployment-checklist.md
```

---

## Automation Script

Save as `deploy-frontend.sh`:

```powershell
#!/bin/bash
set -e

echo "🚀 Project Valine Frontend Deployment"
echo "======================================"

# Verify environment
if [ ! -f .env.production ]; then
  echo "❌ .env.production not found!"
  exit 1
fi

# Verify API base URL
if ! Select-String -q "execute-api" .env.production; then
  echo "❌ VITE_API_BASE must use API Gateway URL!"
  exit 1
fi

# Create backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
echo "📦 Creating backup..."
aws s3 sync s3://valine-frontend-prod/ \
  s3://valine-frontend-backups/backup-${BACKUP_DATE}/ \
  --region us-west-2

# Build
echo "🔨 Building..."
rm -rf dist/
NODE_ENV=production npm run build

# Verify build
if [ ! -f dist/index.html ]; then
  echo "❌ Build failed - dist/index.html not found!"
  exit 1
fi

# Deploy to S3
echo "☁️ Deploying to S3..."
aws s3 sync dist/ s3://valine-frontend-prod/ \
  --region us-west-2 \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "sitemap.xml" \
  --exclude "robots.txt"

aws s3 cp dist/index.html s3://valine-frontend-prod/index.html \
  --region us-west-2 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8"

# Invalidate CloudFront
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id dkmxy676d3vgc \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ Deployment complete!"
echo "📋 Invalidation ID: $INVALIDATION_ID"
echo "🔗 URL: https://valine.app"
echo "💾 Backup: s3://valine-frontend-backups/backup-${BACKUP_DATE}/"
```

**Usage:**
```powershell
# Note: chmod not needed in PowerShell
./deploy-frontend.sh
```

---

## 12. Local Dev Bypass

### Overview

The **Dev Bypass** feature enables rapid UX iteration during local development by bypassing authentication. This is a **localhost-only** feature with multiple security safeguards to prevent accidental production exposure.

⚠️ **CRITICAL**: Dev Bypass MUST be disabled in all production deployments.

---

### Enabling Dev Bypass

**Step 1: Set Environment Variables**

Create or update `.env.local`:

```powershell
# Enable dev bypass (localhost only)
VITE_ENABLE_DEV_BYPASS=true

# Frontend URL (must be localhost for dev bypass)
VITE_FRONTEND_URL=http://localhost:5173
```

**Step 2: Start Development Server**

```powershell
npm run dev
# or
npm start
```

**Step 3: Access Login Page**

Navigate to `http://localhost:5173/login`

You should see a purple/pink gradient "Dev Bypass" button below the login form.

---

### Security Safeguards

Dev Bypass has **three layers of protection** to prevent production exposure:

#### 1. Hostname Check (Runtime)
```javascript
window.location.hostname === 'localhost'
```
Button only renders on localhost. If you access via IP (127.0.0.1) or domain, button is hidden.

#### 2. Environment Flag (Runtime)
```javascript
import.meta.env.VITE_ENABLE_DEV_BYPASS === 'true'
```
Must explicitly set flag in environment. Default is `false`.

#### 3. Build Guard (Build Time)
```javascript
// scripts/prebuild.js
if (VITE_ENABLE_DEV_BYPASS === 'true' && 
    /cloudfront\.net|projectvaline\.com/.test(VITE_FRONTEND_URL)) {
  throw new Error('Build failed: Dev bypass enabled for production domain!');
}
```
Build **fails** if dev bypass is enabled AND `VITE_FRONTEND_URL` contains:
- `cloudfront.net`
- `projectvaline.com`

---

### How It Works

**When Dev Bypass Button Clicked:**

1. Creates mock user object:
```javascript
{
  id: 'dev-user',
  email: 'dev@local',
  username: 'dev-bypass',
  displayName: 'Dev Bypass User',
  onboardingComplete: true,
  profileComplete: true,
  emailVerified: true,
  roles: ['DEV_BYPASS'], // Special role for banner
  avatar: 'https://i.pravatar.cc/150?img=68'
}
```

2. Saves to `localStorage` under key `devUserSession`

3. No backend token generated (pure frontend session)

4. Redirects to `/dashboard`

5. Shows prominent warning banner:
   - Purple/pink gradient
   - "DEV SESSION (NO REAL AUTH) - Localhost Only"
   - Visible on all authenticated pages

**On Logout:**
- Clears `devUserSession` from localStorage
- Returns to login page

**On Page Reload:**
- Dev session restored from localStorage (if on localhost)
- Banner reappears automatically

---

### Pre-Production Checklist

Before deploying to production, verify:

- [ ] `VITE_ENABLE_DEV_BYPASS=false` in `.env.production`
- [ ] `VITE_FRONTEND_URL` points to production domain (CloudFront or projectvaline.com)
- [ ] Run `npm run build` locally to test prebuild guard
- [ ] Verify no "Dev Bypass" button appears in production build preview
- [ ] Check that DEV SESSION banner never appears in production

---

### Troubleshooting

**Problem**: Dev Bypass button not showing on localhost

**Solutions**:
1. Verify `VITE_ENABLE_DEV_BYPASS=true` in `.env.local`
2. Ensure accessing via `http://localhost:5173` (not `http://127.0.0.1:5173`)
3. Restart dev server: `npm run dev`
4. Clear browser cache and localStorage

---

**Problem**: Build fails with "Dev bypass enabled for production domain"

**Solution**:
Set `VITE_ENABLE_DEV_BYPASS=false` in your environment file.

---

**Problem**: DEV SESSION banner stuck after disabling dev bypass

**Solution**:
1. Go to browser DevTools → Application → Local Storage
2. Delete `devUserSession` key
3. Reload page

---

### Removal Instructions (if deprecating feature)

1. Remove env vars from `.env.example`:
   - `VITE_ENABLE_DEV_BYPASS`
   - `VITE_FRONTEND_URL`

2. Remove dev bypass code:
   - `scripts/prebuild.js`
   - Dev bypass button in `src/pages/Login.jsx`
   - `devBypass()` function in `src/context/AuthContext.jsx`
   - Banner logic in `src/layouts/AppLayout.jsx`

3. Remove from package.json:
   - `prebuild` script
   - Update `build` script to just `vite build`

4. Update tests:
   - Remove dev bypass checks in `tests/e2e/onboarding-flow.spec.ts`

---

## Related Runbooks

- [Add User](./add-user.md) - User access management
- [Rotate JWT Secret](./rotate-jwt-secret.md) - Backend security
- [Update IP Allowlist](./update-ip-allowlist.md) - Network security

---

## Change Log

| Date | Change | Operator |
|------|--------|----------|
| 2025-11-12 | Initial runbook creation | Documentation Agent |


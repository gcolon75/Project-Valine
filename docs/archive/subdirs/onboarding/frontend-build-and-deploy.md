# Frontend Build and Deploy

This guide documents the frontend build pipeline and deployment process to AWS S3 + CloudFront. All commands use **PowerShell only**.

For complete deployment details, see the **[Frontend Deployment Guide](../DEPLOYMENT.md)**.

## Build Pipeline Overview

The frontend build process consists of multiple stages with validation at each step:

```
npm run build
    ↓
1. Prebuild Validation (scripts/prebuild.js)
   • Checks dev bypass is disabled for production
   • Validates API base configuration
   • Validates email allowlist configuration
    ↓
2. Vite Build (vite build)
   • Bundles React application
   • Generates hashed asset filenames (e.g., index-abc123.js)
   • Creates source maps for debugging
    ↓
3. Postbuild Validation (scripts/postbuild-validate.js)
   • Checks for corrupted module tags
   • Validates no local filesystem paths (C:\)
   • Verifies referenced files exist
    ↓
4. SEO Generation (scripts/seo/build-sitemap.mjs, build-robots.mjs)
   • Generates sitemap.xml
   • Generates robots.txt
    ↓
5. Output: dist/ directory ready for deployment
```

### Why Prebuild and Postbuild Validations Exist

**Purpose:** Prevent white screen issues in production

**Prebuild Validation:**
- Ensures `VITE_API_BASE` is set for production builds (required per `vite.config.js`)
- Prevents dev bypass from being accidentally deployed to production
- Validates allowlist configuration

**Postbuild Validation:**
- Detects corrupted builds with local filesystem paths (e.g., `C:\temp`)
- Ensures module script tags have valid `src` attributes
- Verifies referenced JS/CSS files actually exist in `dist/`

These validations have prevented multiple white screen incidents by catching build corruption before deployment.

## Build Locally

### Step 1: Set Environment Variables

**Production builds require `VITE_API_BASE`:**

```powershell
# Set API base URL (production API Gateway)
$env:VITE_API_BASE = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"

# Optional: Set other production variables
$env:VITE_ALLOWED_USER_EMAILS = "email1@example.com,email2@example.com"
$env:VITE_ENABLE_REGISTRATION = "false"
$env:VITE_ENABLE_DEV_BYPASS = "false"
```

**Alternatively, create `.env.production` file:**
```env
VITE_API_BASE=https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
VITE_ALLOWED_USER_EMAILS=email1@example.com,email2@example.com
VITE_ENABLE_REGISTRATION=false
VITE_ENABLE_DEV_BYPASS=false
```

See `.env.example` for complete variable reference.

### Step 2: Run Build

```powershell
# Run the production build
npm run build
```

**Expected Output:**
```
🔍 Running pre-build validation...
   Mode: production
   VITE_ENABLE_DEV_BYPASS: false
   VITE_FRONTEND_URL: https://dkmxy676d3vgc.cloudfront.net
✅ Pre-build validation passed

vite v5.x.x building for production...
✓ 1234 modules transformed.
dist/index.html                   0.50 kB │ gzip:  0.32 kB
dist/assets/index-abc123.js      150.00 kB │ gzip: 50.00 kB
dist/assets/index-xyz789.css      25.00 kB │ gzip:  8.00 kB
✓ built in 5.43s

🔍 Running post-build validation...
✓ Found 1 module script tag(s)
✓ Module script #1 src: /assets/index-abc123.js
✓ Referenced file exists: /assets/index-abc123.js
✓ Found 5 asset reference(s)

✅ Build validation passed - output looks good!
```

**Output Location:** `dist/` directory contains the production-ready build

### Step 3: Preview Build Locally (Optional)

```powershell
# Start a local preview server
npm run preview
```

Visit `http://localhost:3000/` to test the production build locally.

## Deployment to AWS

### Deployment Architecture

```
Developer
    ↓ npm run build
dist/ directory
    ↓ Upload to S3
Amazon S3 Bucket (valine-frontend-prod)
    ↓ Serve via
Amazon CloudFront Distribution
    ↓ CloudFront Function (spa-rewrite.js)
    ↓ Rewrite extension-less paths → /index.html
User's Browser
```

### Content-Type and Cache-Control Strategy

**Why This Matters:** Incorrect MIME types cause white screen issues. Browsers reject JavaScript files served as `text/html`.

**Proper Headers:**

| File Type | Content-Type | Cache-Control | Reason |
|-----------|--------------|---------------|--------|
| `index.html` | `text/html; charset=utf-8` | `no-cache, no-store, must-revalidate` | Always fetch latest version |
| `*.js` files | `application/javascript; charset=utf-8` | `public, max-age=31536000, immutable` | Hashed filenames never change |
| `*.css` files | `text/css; charset=utf-8` | `public, max-age=31536000, immutable` | Hashed filenames never change |
| Images | `image/<type>` | `public, max-age=31536000` | Long cache, may update |
| `manifest.json` | `application/json` | `public, max-age=86400` | 24-hour cache |

See the [Deployment Guide](../DEPLOYMENT.md#cache-strategy) for complete cache strategy documentation.

### Deployment Methods

#### Method 1: Automated Deployment Script (Recommended)

**Note:** Deployment script location needs confirmation. Check `scripts/deployment/` directory.

```powershell
# Navigate to project root
cd C:\path\to\Project-Valine

# Run deployment script (if available)
.\scripts\deployment\deploy-frontend.ps1 `
    -BucketName "valine-frontend-prod" `
    -DistributionId "E16LPJDBIL5DEE"
```

#### Method 2: Manual Deployment with AWS CLI

**Prerequisites:**
- AWS CLI installed and configured
- Appropriate IAM permissions for S3 and CloudFront

```powershell
# Upload index.html with no-cache headers
aws s3 cp dist/index.html s3://valine-frontend-prod/index.html `
    --content-type "text/html; charset=utf-8" `
    --cache-control "no-cache, no-store, must-revalidate"

# Upload JS files with immutable cache
aws s3 sync dist/assets s3://valine-frontend-prod/assets `
    --exclude "*" --include "*.js" `
    --content-type "application/javascript; charset=utf-8" `
    --cache-control "public, max-age=31536000, immutable"

# Upload CSS files
aws s3 sync dist/assets s3://valine-frontend-prod/assets `
    --exclude "*" --include "*.css" `
    --content-type "text/css; charset=utf-8" `
    --cache-control "public, max-age=31536000, immutable"

# Upload remaining files
aws s3 sync dist s3://valine-frontend-prod `
    --exclude "index.html" `
    --exclude "assets/*.js" `
    --exclude "assets/*.css" `
    --delete
```

**Note:** PowerShell uses backtick (`` ` ``) for line continuation (not backslash).

### CloudFront Cache Invalidation

After uploading to S3, create a CloudFront invalidation to ensure users get the new version:

```powershell
# Create invalidation for all paths
aws cloudfront create-invalidation `
    --distribution-id E16LPJDBIL5DEE `
    --paths "/*"
```

**Wait for completion:**
```powershell
# List invalidations to check status
aws cloudfront list-invalidations `
    --distribution-id E16LPJDBIL5DEE

# Output shows status: InProgress → Completed (5-15 minutes)
```

### SPA Routing via CloudFront Function

**Purpose:** Enable client-side routing by rewriting extension-less paths to `/index.html`

**Example:**
- User visits `https://yourdomain.com/join`
- CloudFront Function rewrites request to `/index.html`
- React Router displays the Join page component

**Function Location:** `infra/cloudfront/functions/spa-rewrite.js`

**Status:** See [CloudFront SPA Migration Status](../cloudfront-spa-migration-status.md) for:
- Function association checklist
- Verification commands
- Troubleshooting steps

## Double-Check Before You Deploy

Use this checklist before deploying to production:

- [ ] `VITE_API_BASE` is set to production API Gateway URL (not CloudFront)
- [ ] `VITE_ENABLE_DEV_BYPASS` is `false` (prebuild validation will fail if true)
- [ ] `VITE_ALLOWED_USER_EMAILS` matches backend configuration
- [ ] Build completes successfully with no validation errors
- [ ] Preview build locally (`npm run preview`) and test key routes
- [ ] Verify no local filesystem paths in `dist/index.html` (`C:\`, `cd=""`)
- [ ] CloudFront Function is associated with distribution (SPA routing)
- [ ] S3 bucket policy allows CloudFront OAI (Origin Access Identity) read access

## Troubleshooting

### Build Fails with "VITE_API_BASE is required"

**Cause:** `VITE_API_BASE` environment variable not set in production mode

**Solution:**
```powershell
# Set the variable before building
$env:VITE_API_BASE = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
npm run build
```

See `vite.config.js` line 18-24 for the validation logic.

### Build Fails with "Dev Bypass Security Check"

**Cause:** `VITE_ENABLE_DEV_BYPASS=true` with production `VITE_FRONTEND_URL`

**Solution:** Set `VITE_ENABLE_DEV_BYPASS=false` in `.env.production` or unset the variable

See `scripts/prebuild.js` for the validation logic.

### White Screen After Deployment

**Symptoms:** Users see blank white screen, browser console shows module loading errors

**Common Causes:**
1. Incorrect Content-Type headers (JS files served as `text/html`)
2. Missing CloudFront Function association (404 on routes)
3. Corrupted build output (local filesystem paths in HTML)
4. CloudFront cache serving old version

**Diagnosis and Solutions:** See the [White Screen Runbook](../white-screen-runbook.md)

### CloudFront Still Serving Old Version

**Cause:** Invalidation not complete or browser cache

**Solutions:**
```powershell
# Check invalidation status
aws cloudfront list-invalidations --distribution-id E16LPJDBIL5DEE

# Hard refresh in browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Verify headers in browser DevTools → Network tab
# Content-Type should be "application/javascript" for JS files
```

## CI/CD Integration

The frontend deployment is automated via GitHub Actions in `.github/workflows/client-deploy.yml`.

**Workflow Triggers:**
- Push to `main` branch
- Manual dispatch via Actions tab
- Discord bot command: `/deploy-client`

**Workflow Steps:**
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Set production environment variables (from GitHub Secrets)
5. Run build (`npm run build`)
6. Upload to S3 with correct MIME types
7. Create CloudFront invalidation
8. Post deployment notification

See the [CI/CD Overview](ci-cd-overview.md) for complete workflow documentation.

## Next Steps

- **[Backend Build and Deploy](backend-build-and-deploy.md)** - Deploy the serverless backend
- **[CI/CD Overview](ci-cd-overview.md)** - Understand automated workflows
- **[CloudFront SPA Migration Status](../cloudfront-spa-migration-status.md)** - SPA routing setup

## Additional Resources

- **[Frontend Deployment Guide](../DEPLOYMENT.md)** - Complete deployment documentation with troubleshooting
- **[Project Bible - Frontend Deployment](../PROJECT_BIBLE.md#frontend-deployment)** - Deployment procedures and verification
- **[White Screen Runbook](../white-screen-runbook.md)** - Diagnose and fix frontend loading issues
- **[CloudFront SPA Migration Status](../cloudfront-spa-migration-status.md)** - SPA routing verification procedures

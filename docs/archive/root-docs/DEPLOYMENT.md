> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Deployment Guide

> **Note**: This documentation uses PowerShell commands. Archived documentation may contain bash examples for historical reference.


## Overview

This guide explains how to deploy the Project Valine frontend to S3 and CloudFront with correct MIME types and cache headers to prevent white screen issues.

## Prerequisites

- AWS CLI installed and configured
- Build completed successfully (`npm run build`)
- S3 bucket for static hosting
- CloudFront distribution (optional but recommended)

## Why Correct MIME Types and Cache Headers Matter

### The White Screen Problem

When JavaScript files are served with incorrect MIME types (e.g., `text/html` instead of `application/javascript`), browsers reject them with errors like:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html"
```

This results in a blank white screen for users.

### Caching Issues

Without proper cache headers:
- `index.html` can be cached indefinitely, serving stale versions
- Asset files without immutable caching waste bandwidth
- CloudFront may serve outdated content even after deployment

## Deployment Process

### Step 1: Build the Application

```powershell
npm run build
```

This will:
1. Run prebuild validation (checks for dev bypass in production)
2. Build the application with Vite
3. Generate SEO files (sitemap, robots.txt)
4. Run postbuild validation (checks for corrupted module tags and local paths)

### Step 2: Deploy to S3 with Correct MIME Types

**Option A: Using the deployment script (recommended)**

```powershell
# With environment variables
S3_BUCKET=your-bucket-name \
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC \
./scripts/deploy-static-with-mime.sh

# Or with command-line arguments
./scripts/deploy-static-with-mime.sh your-bucket-name E1234567890ABC
```

**Option B: Manual deployment**

If you prefer to deploy manually:

```powershell
# Upload index.html with no-cache headers
aws s3 cp dist/index.html s3://your-bucket/index.html \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache, no-store, must-revalidate"

# Upload JS files with immutable cache
aws s3 sync dist/assets s3://your-bucket/assets \
  --exclude "*" --include "*.js" \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable"

# Upload CSS files
aws s3 sync dist/assets s3://your-bucket/assets \
  --exclude "*" --include "*.css" \
  --content-type "text/css; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable"

# Upload other files
aws s3 sync dist s3://your-bucket \
  --exclude "index.html" \
  --exclude "assets/*.js" \
  --exclude "assets/*.css" \
  --delete
```

### Step 3: Invalidate CloudFront Cache

After uploading to S3, create a CloudFront invalidation to ensure users get the new version:

```powershell
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

**Important:** Wait 5-15 minutes for the invalidation to complete before testing.

## Cache Strategy

### index.html
- **Cache-Control:** `no-cache, no-store, must-revalidate`
- **Why:** Always fetch the latest version to ensure users get updated asset references

### Hashed Assets (JS, CSS)
- **Cache-Control:** `public, max-age=31536000, immutable`
- **Why:** Filenames include content hash, so they never change. Safe to cache forever.

### Images and Fonts
- **Cache-Control:** `public, max-age=31536000`
- **Why:** Long cache but not immutable (may be updated)

### manifest.json
- **Cache-Control:** `public, max-age=86400` (24 hours)
- **Why:** Updates occasionally but not critical

## Troubleshooting

### Users Still See White Screen After Deployment

1. **Check CloudFront invalidation status:**
   ```powershell
   aws cloudfront list-invalidations --distribution-id E1234567890ABC
   ```

2. **Verify MIME types in CloudFront:**
   - Open browser DevTools → Network tab
   - Load your site
   - Check `Content-Type` header for JS files
   - Should be `application/javascript`, not `text/html`

3. **Hard refresh in browser:**
   - Chrome/Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - This bypasses browser cache

4. **Check for corrupted build:**
   ```powershell
   Select-String -r "C:\\\\" dist/
   Select-String -r 'cd=""' dist/
   ```
   If found, the build is corrupted. Check your build environment.

### Deployment Script Errors

**Error: AWS CLI not found**
```powershell
# Install AWS CLI
Invoke-RestMethod -Uri "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -Method Get
unzip awscliv2.zip
sudo ./aws/install
```

**Error: Access Denied**
- Verify AWS credentials: `aws sts get-caller-identity`
- Check S3 bucket permissions
- Verify CloudFront distribution access

### Source Maps

Source maps are generated and uploaded to help debug production errors. They should:
- Be uploaded to S3 alongside JS files
- Have `Content-Type: application/json`
- Not be blocked by CORS (if using error tracking service)

To skip source map upload (not recommended):
- Edit `vite.config.js` and set `build.sourcemap: false`

## Client-Side Error Monitoring

The application includes error instrumentation that:
1. Captures JavaScript errors via `window.onerror`
2. Captures unhandled promise rejections
3. Batches and rate-limits errors
4. POSTs to `/internal/observability/log` endpoint
5. Logs to CloudWatch for debugging

Check CloudWatch logs to see client-side errors:
```powershell
aws logs tail /aws/lambda/pv-api-prod-logEvent --follow
```

## CI/CD Integration

To integrate deployment into your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml example
- name: Build
  run: npm run build

- name: Deploy to S3
  env:
    S3_BUCKET: ${{ secrets.S3_BUCKET }}
    CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
  run: ./scripts/deploy-static-with-mime.sh

- name: Wait for CloudFront
  run: sleep 60

- name: Smoke test
  run: curl -f https://your-domain.com
```

## Rollback Procedure

If deployment causes issues:

1. **Revert S3 to previous version:**
   ```powershell
   # List versions
   aws s3api list-object-versions --bucket your-bucket --prefix index.html
   
   # Copy previous version
   aws s3api copy-object \
     --bucket your-bucket \
     --copy-source your-bucket/index.html?versionId=VERSION_ID \
     --key index.html
   ```

2. **Invalidate CloudFront again:**
   ```powershell
   aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
   ```

## Additional Resources

- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [Vite Build Configuration](https://vitejs.dev/config/build-options.html)

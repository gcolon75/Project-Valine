# SPA Deployment Recovery & Troubleshooting Guide

This guide covers operational recovery steps for common SPA delivery issues, including metadata repair and bundle mismatch scenarios.

## Table of Contents

1. [Metadata Repair](#metadata-repair)
2. [Bundle Mismatch Recovery](#bundle-mismatch-recovery)
3. [Backslash Key Issues](#backslash-key-issues)
4. [Cache Header Problems](#cache-header-problems)
5. [Diagnostic Tools](#diagnostic-tools)

---

## Metadata Repair

### Problem
Assets in S3 have incorrect Content-Type or Cache-Control headers, causing:
- JavaScript bundles served as `text/javascript` instead of `application/javascript`
- Missing or incorrect cache headers (e.g., `public, max-age=300` instead of `immutable`)
- White screen issues due to incorrect MIME types

### Solution

**Option 1: Use deploy script with RepairHeaders flag**

```powershell
# Windows PowerShell
.\scripts\deploy-frontend.ps1 `
  -Bucket valine-frontend-prod `
  -DistributionId E16LPJDBIL5DEE `
  -RepairHeaders `
  -SkipBuild
```

This will:
1. Find all hashed bundles in S3 (`assets/index-*.js` and `assets/index-*.css`)
2. Use `copy-object` with `REPLACE` metadata directive to update headers
3. Set correct MIME types:
   - `.js` → `application/javascript; charset=utf-8`
   - `.css` → `text/css; charset=utf-8`
4. Set immutable cache: `public, max-age=31536000, immutable`

**Option 2: Manual AWS CLI repair**

```powershell
# For a specific bundle
aws s3api copy-object \
  --bucket valine-frontend-prod \
  --copy-source valine-frontend-prod/assets/index-ABC123.js \
  --key assets/index-ABC123.js \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/assets/index-ABC123.js"
```

### Verification

```powershell
# Check S3 metadata
aws s3api head-object \
  --bucket valine-frontend-prod \
  --key assets/index-ABC123.js

# Check CloudFront headers
node scripts/diagnose-white-screen.js \
  --domain your-domain.com \
  --bundle /assets/index-ABC123.js \
  --verbose
```

---

## Bundle Mismatch Recovery

### Problem
The current bundle referenced in `dist/index.html` does not exist in S3, causing:
- 404 errors when loading the application
- White screen with console errors
- Deploy script may try to prune the actual current bundle

### Symptoms
```
[ERROR] Current main JS bundle not found in S3: assets/index-ABC123.js
[ERROR] Aborting pruning to avoid deleting wrong bundles
[ERROR] This may indicate a mismatch between dist/index.html and S3 state
```

### Root Causes
1. **Partial deployment**: Build succeeded but upload failed
2. **Manual S3 deletion**: Someone deleted the current bundle
3. **Stale dist folder**: Local `dist/` not matching production state

### Solution

**Step 1: Identify the actual current bundle in production**

```powershell
# Check what index.html is currently served
Invoke-RestMethod -Uri "-s" -Method Get

# List all bundles in S3
aws s3 ls s3://valine-frontend-prod/assets/ | Select-String 'index-.*\.js'
```

**Step 2: Choose recovery approach**

**Approach A: Re-deploy** (recommended if you have working code)

```powershell
# Full rebuild and deploy
.\scripts\deploy-frontend.ps1 `
  -Bucket valine-frontend-prod `
  -DistributionId E16LPJDBIL5DEE
```

**Approach B: Upload missing bundle** (if you have the exact build artifacts)

```powershell
# Upload the missing bundle from local dist/
aws s3api put-object \
  --bucket valine-frontend-prod \
  --key assets/index-ABC123.js \
  --body dist/assets/index-ABC123.js \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable"

# Upload CSS if it exists
aws s3api put-object \
  --bucket valine-frontend-prod \
  --key assets/index-ABC123.css \
  --body dist/assets/index-ABC123.css \
  --content-type "text/css; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/assets/index-ABC123.js" "/assets/index-ABC123.css"
```

**Approach C: Emergency rollback** (use previous working bundle)

```powershell
# Find a recent working bundle
aws s3api list-objects-v2 \
  --bucket valine-frontend-prod \
  --prefix assets/index- \
  --query 'reverse(sort_by(Contents, &LastModified))[:5].[Key, LastModified]' \
  --output table

# Update index.html to point to known-good bundle
# (Replace index-ABC123.js with index-XYZ789.js)
# Then upload updated index.html
aws s3api put-object \
  --bucket valine-frontend-prod \
  --key index.html \
  --body dist/index.html \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache, must-revalidate"

# Invalidate
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/index.html"
```

### Prevention
- Always use the deploy script for deployments
- Use `--DryRun` flag to preview changes before executing
- Monitor deploy script output for errors
- Keep recent build artifacts for rollback

---

## Backslash Key Issues

### Problem
On Windows, files uploaded to S3 with backslash keys like `assets\index-ABC123.js` instead of `assets/index-ABC123.js`, causing:
- 404 errors through CloudFront (which uses forward slashes)
- Bundle mismatch errors

### Solution

The deploy script now automatically normalizes all keys to forward slashes:

```powershell
# In deploy-frontend.ps1
$key = ($rel -replace '\\','/')
```

If you have existing backslash keys in S3:

```powershell
# List objects with backslashes (may appear as URL-encoded %5C)
aws s3api list-objects-v2 \
  --bucket valine-frontend-prod \
  --prefix assets/ \
  --query 'Contents[?contains(Key, `\\`)].[Key]' \
  --output table

# Copy to correct key (for each file)
aws s3api copy-object \
  --bucket valine-frontend-prod \
  --copy-source "valine-frontend-prod/assets\index-ABC123.js" \
  --key assets/index-ABC123.js \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Delete old backslash key
aws s3api delete-object \
  --bucket valine-frontend-prod \
  --key "assets\index-ABC123.js"
```

---

## Cache Header Problems

### Problem
Assets not cached properly, causing:
- Slow page loads (re-downloading unchanged bundles)
- Excessive CloudFront costs
- Users seeing stale content

### Expected Headers

| File Type | Content-Type | Cache-Control |
|-----------|-------------|---------------|
| `index.html` | `text/html; charset=utf-8` | `no-cache, must-revalidate` |
| `index-*.js` (hashed) | `application/javascript; charset=utf-8` | `public, max-age=31536000, immutable` |
| `index-*.css` (hashed) | `text/css; charset=utf-8` | `public, max-age=31536000, immutable` |
| Other assets | Varies | `public, max-age=3600` |

### Solution

1. **Fix at source**: Deploy with correct headers
   ```powershell
   .\scripts\deploy-frontend.ps1 -Bucket valine-frontend-prod -DistributionId E16LPJDBIL5DEE
   ```

2. **Repair existing files**: Use `-RepairHeaders` flag
   ```powershell
   .\scripts\deploy-frontend.ps1 `
     -Bucket valine-frontend-prod `
     -DistributionId E16LPJDBIL5DEE `
     -RepairHeaders `
     -SkipBuild
   ```

3. **Invalidate CloudFront cache**: Force clients to fetch new headers
   ```powershell
   aws cloudfront create-invalidation \
     --distribution-id E16LPJDBIL5DEE \
     --paths "/*"
   ```

---

## Diagnostic Tools

### diagnose-white-screen.js

Comprehensive diagnostic tool that checks:
- SPA route handling
- Bundle MIME types and cache headers
- S3 metadata (if credentials available)
- CloudFront configuration

```powershell
# Basic usage
node scripts/diagnose-white-screen.js --domain your-domain.com

# With bundle auto-detection
node scripts/diagnose-white-screen.js --domain your-domain.com --verbose

# With explicit bundle path
node scripts/diagnose-white-screen.js \
  --domain your-domain.com \
  --bundle /assets/index-ABC123.js

# Full diagnostics (requires AWS credentials)
node scripts/diagnose-white-screen.js \
  --domain your-domain.com \
  --bucket valine-frontend-prod \
  --distribution-id E16LPJDBIL5DEE \
  --verbose
```

### assert-headers (PowerShell)

Validates HTTP headers for index.html and bundles:

```powershell
# Check index.html headers
.\scripts\assert-headers.ps1 -Domain your-domain.com

# Check bundle headers
.\scripts\assert-headers.ps1 `
  -Domain your-domain.com `
  -Bundle "/assets/index-ABC123.js"

# Strict mode (fail on warnings)
.\scripts\assert-headers.ps1 `
  -Domain your-domain.com `
  -Bundle "/assets/index-ABC123.js" `
  -Strict
```

### guard-cloudfront-config (PowerShell)

Validates CloudFront distribution configuration:

```powershell
# Basic check
.\scripts\guard-cloudfront-config.ps1 -DistributionId E16LPJDBIL5DEE

# Strict mode (fail on warnings)
.\scripts\guard-cloudfront-config.ps1 `
  -DistributionId E16LPJDBIL5DEE `
  -Strict

# Verbose output
.\scripts\guard-cloudfront-config.ps1 `
  -DistributionId E16LPJDBIL5DEE `
  -Verbose
```

---

## Common Scenarios

### Scenario 1: White screen after deployment

**Symptoms**: Application shows white screen, console shows 404 for bundle

**Steps**:
1. Run diagnostics:
   ```powershell
   node scripts/diagnose-white-screen.js --domain your-domain.com --verbose
   ```

2. Check if bundle exists in S3:
   ```powershell
   aws s3 ls s3://valine-frontend-prod/assets/ | Select-String 'index-'
   ```

3. If bundle missing, re-deploy:
   ```powershell
   .\scripts\deploy-frontend.ps1 -Bucket valine-frontend-prod -DistributionId E16LPJDBIL5DEE
   ```

4. If bundle exists but wrong MIME type, repair:
   ```powershell
   .\scripts\deploy-frontend.ps1 `
     -Bucket valine-frontend-prod `
     -DistributionId E16LPJDBIL5DEE `
     -RepairHeaders `
     -SkipBuild
   ```

### Scenario 2: Retention pruning deleted current bundle

**Symptoms**: Deploy script aborts with "Current main JS bundle not found in S3"

**Steps**:
1. This is a safety guard preventing wrong deletions
2. Verify your local `dist/index.html` is current
3. Re-deploy to upload missing bundle:
   ```powershell
   .\scripts\deploy-frontend.ps1 -Bucket valine-frontend-prod -DistributionId E16LPJDBIL5DEE
   ```

### Scenario 3: Windows backslash upload issue

**Symptoms**: Files uploaded but CloudFront returns 404

**Steps**:
1. Check for backslash keys in S3
2. Use updated deploy script (automatically normalizes paths)
3. Re-deploy to fix keys:
   ```powershell
   .\scripts\deploy-frontend.ps1 -Bucket valine-frontend-prod -DistributionId E16LPJDBIL5DEE
   ```

---

## Emergency Contacts

If you encounter issues not covered here:
1. Check CloudWatch Logs for CloudFront errors
2. Review CloudFront access logs in S3
3. Check AWS CloudFormation stack events (if using IaC)
4. Escalate to infrastructure team with diagnostic output

## Related Documentation

- [CloudFront SPA Routing Guide](CLOUDFRONT_SPA_ROUTING.md)
- [White Screen Troubleshooting](WHITE_SCREEN_FIX_SUMMARY.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

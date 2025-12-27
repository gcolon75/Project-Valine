# CloudFront SPA Migration Status

## Overview

This document tracks the implementation status of CloudFront Function-based SPA routing for Project Valine and provides verification procedures.

## Implementation Status

✅ **Completed**
- CloudFront Function source file: `infra/cloudfront/functions/spa-rewrite.js`
- Association helper script: `scripts/cloudfront-associate-spa-function.ps1`
- Local verification script: `scripts/verify-spa-rewrite.js`
- Header assertion script: `scripts/assert-headers.js`
- Documentation updates

🔄 **In Progress**
- Manual association of function to production CloudFront distribution
- Deployment script updates for dynamic invalidation

## CloudFront Function Association Checklist

This section provides step-by-step verification commands to ensure the CloudFront Function is properly associated and working.

### 1. List CloudFront Functions

Check if the `spaRewrite` function exists:

```powershell
aws cloudfront list-functions --stage LIVE
```

Look for `spaRewrite` in the output. If it doesn't exist, create it using the helper script.

### 2. Describe Function Details

Get details about the LIVE stage of the function:

```powershell
aws cloudfront describe-function --name spaRewrite --stage LIVE
```

**Important fields to verify:**
- `FunctionMetadata.FunctionARN` - Copy this ARN for association
- `FunctionMetadata.Stage` - Must be `LIVE`
- `FunctionMetadata.Status` - Should be `PUBLISHED`

Example output:
```json
{
  "FunctionSummary": {
    "Name": "spaRewrite",
    "Status": "PUBLISHED",
    "FunctionMetadata": {
      "FunctionARN": "arn:aws:cloudfront::579939802800:function/spaRewrite",
      "Stage": "LIVE",
      "CreatedTime": "2025-01-15T10:30:00Z",
      "LastModifiedTime": "2025-01-15T10:30:00Z"
    }
  }
}
```

### 3. Extract Current Bundle Name (Dynamic Parsing)

Instead of hard-coding bundle names, parse them dynamically from `dist/index.html`:

```powershell
# After building the frontend
Select-String -oP 'src="/assets/index-[^"]+\.js"' dist/index.html | sed 's/src="//;s/"//'
```

Example output: `/assets/index-yrgN6q4Q.js`

**Alternative using PowerShell:**
```powershell
$indexContent = Get-Content dist/index.html -Raw
$indexContent -match '/assets/index-[^"]+\.js' | Out-Null
$bundlePath = $matches[0]
Write-Host "Current bundle: $bundlePath"
```

**Store this value** for invalidation and verification commands.

### 4. Verify Distribution Function Association

Check if the function is associated with the default cache behavior:

```powershell
aws cloudfront get-distribution-config --id E16LPJDBIL5DEE | \
  jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations'
```

Expected output:
```json
{
  "Quantity": 1,
  "Items": [
    {
      "FunctionARN": "arn:aws:cloudfront::579939802800:function/spaRewrite",
      "EventType": "viewer-request"
    }
  ]
}
```

**If not associated**, use the helper script:
```powershell
.\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE
```

### 5. Test Function Association

After the distribution is deployed (Status: Deployed), test SPA routing:

```powershell
# Test extension-less route (should return index.html with 200)
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get

# Expected:
# HTTP/2 200
# content-type: text/html
```

```powershell
# Test asset path (should return 404 if file doesn't exist)
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get

# Expected:
# HTTP/2 404
# (Not 200 with HTML content!)
```

```powershell
# Test API path (should pass through - may 404 if backend not configured)
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get

# Should NOT return index.html
```

### 6. Verify Asset Headers

Use the header assertion script:

```powershell
# Parse current bundle
BUNDLE_PATH=$(Select-String -oP '/assets/index-[^"]+\.js' dist/index.html | head -1)

# Verify headers
node scripts/assert-headers.js \
  --domain dkmxy676d3vgc.cloudfront.net \
  --bundle "$BUNDLE_PATH"
```

Expected output:
```
✅ All header checks passed!
```

## Function File Location

**Source File:** `infra/cloudfront/functions/spa-rewrite.js`

**Key Features:**
- Rewrites extension-less paths (e.g., `/join`, `/profile`) to `/index.html`
- Preserves API requests (`/api/*`)
- Preserves asset requests (`/assets/*`)
- Preserves favicon (`/favicon.ico`)
- Preserves any file with an extension (contains `.`)
- Future-ready for `/.well-known/*` exclusion

**Test Locally:**
```powershell
node scripts/verify-spa-rewrite.js
```

## Helper Script Usage

### Create and Associate Function

Basic usage (creates function if missing, publishes to LIVE, associates with distribution):

```powershell
.\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE
```

### Add 404 Fallback (Temporary)

**Warning:** This is a temporary fallback and should only be used during migration or debugging. The CloudFront Function is the preferred approach.

```powershell
.\scripts\cloudfront-associate-spa-function.ps1 `
  -DistributionId E16LPJDBIL5DEE `
  -Add404Fallback
```

This adds a custom error response: `404 → /index.html` (ResponseCode: 200, TTL: 0)

### Remove 404 Fallback

After confirming the CloudFront Function works correctly:

```powershell
.\scripts\cloudfront-associate-spa-function.ps1 `
  -DistributionId E16LPJDBIL5DEE `
  -Remove404Fallback
```

### Dry Run Mode

Preview changes without applying them:

```powershell
.\scripts\cloudfront-associate-spa-function.ps1 `
  -DistributionId E16LPJDBIL5DEE `
  -DryRun
```

## Dynamic Invalidation

After deploying new builds, invalidate the cache for updated files.

### Parse Bundle and Create Invalidation

```powershell
# Extract current bundle path from dist/index.html
BUNDLE_PATH=$(Select-String -oP '/assets/index-[^"]+\.js' dist/index.html | head -1)

# Extract CSS path
CSS_PATH=$(Select-String -oP '/assets/index-[^"]+\.css' dist/index.html | head -1)

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/index.html" "$BUNDLE_PATH" "$CSS_PATH" "/theme-init.js"
```

### Using PowerShell

```powershell
# Parse index.html
$indexContent = Get-Content dist/index.html -Raw

# Extract bundle
$indexContent -match '/assets/index-[^"]+\.js' | Out-Null
$bundlePath = $matches[0]

# Extract CSS
$indexContent -match '/assets/index-[^"]+\.css' | Out-Null
$cssPath = $matches[0]

# Create invalidation
aws cloudfront create-invalidation `
  --distribution-id E16LPJDBIL5DEE `
  --paths "/index.html" "$bundlePath" "$cssPath" "/theme-init.js"
```

## Temporary Fallback Procedure

**⚠️ Use only during migration or debugging ⚠️**

If you need immediate SPA routing while setting up the CloudFront Function:

1. Add 404 fallback:
   ```powershell
   .\scripts\cloudfront-associate-spa-function.ps1 `
     -DistributionId E16LPJDBIL5DEE `
     -Add404Fallback
   ```

2. Wait for distribution to deploy (5-15 minutes)

3. Test SPA routes work

4. Create and associate CloudFront Function:
   ```powershell
   .\scripts\cloudfront-associate-spa-function.ps1 `
     -DistributionId E16LPJDBIL5DEE
   ```

5. Wait for distribution to deploy again

6. Remove 404 fallback:
   ```powershell
   .\scripts\cloudfront-associate-spa-function.ps1 `
     -DistributionId E16LPJDBIL5DEE `
     -Remove404Fallback
   ```

**Why remove the fallback?**
- The 404 fallback masks real errors (missing assets return 200 HTML instead of 404)
- CloudFront Function is more precise (only rewrites extension-less paths)
- Better debugging when assets are actually missing

## Bundle Retention

When deploying new builds, keep previous bundles for a grace period (7 days by default) to prevent 404s for users with cached `index.html`.

**Current Bundle Extraction** (never delete this):
```powershell
CURRENT_BUNDLE=$(Select-String -oP 'index-[^"]+\.js' dist/index.html | head -1)
echo "Current bundle: $CURRENT_BUNDLE"
```

**Prune Old Bundles** (older than 7 days, excluding current):
```powershell
# List all bundles in S3
aws s3api list-objects-v2 \
  --bucket valine-frontend-prod \
  --prefix assets/index- \
  --query "Contents[?LastModified<'2025-01-08'].Key" \
  --output text

# Verify current bundle is NOT in the list, then delete
```

## Troubleshooting

### Issue: Extension-less routes return 404

**Symptom:** Navigating to `/join` returns 404 instead of index.html

**Diagnosis:**
1. Check if function is associated:
   ```powershell
   aws cloudfront get-distribution-config --id E16LPJDBIL5DEE | \
     jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations'
   ```

2. Check distribution status:
   ```powershell
   aws cloudfront get-distribution --id E16LPJDBIL5DEE | jq '.Distribution.Status'
   # Should be "Deployed", not "InProgress"
   ```

**Solution:** Run the association script and wait for deployment.

### Issue: Assets return HTML instead of proper files

**Symptom:** Browser console shows "Unexpected token '<'" when loading JS

**Diagnosis:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get
# If starts with <!DOCTYPE or <html, wrong content is being served
```

**Root Causes:**
1. 404 custom error response is active (wrong)
2. CloudFront Function incorrectly rewrites asset paths (function bug)
3. WAF blocks request → 403 → error response serves HTML

**Solution:**
1. Remove custom error responses:
   ```powershell
   .\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE -Remove404Fallback
   ```

2. Test function locally:
   ```powershell
   node scripts/verify-spa-rewrite.js
   # All tests should pass
   ```

3. Create invalidation:
   ```powershell
   aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
   ```

### Issue: Wrong Content-Type or Cache-Control headers

**Symptom:** Assets have incorrect MIME types or cache headers

**Diagnosis:**
```powershell
node scripts/assert-headers.js \
  --domain dkmxy676d3vgc.cloudfront.net \
  --bundle /assets/index-<current-hash>.js
```

**Solution:** Fix S3 object metadata:
```powershell
# Copy object to itself with corrected metadata
aws s3api copy-object \
  --bucket valine-frontend-prod \
  --copy-source valine-frontend-prod/assets/index-<hash>.js \
  --key assets/index-<hash>.js \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE
```

Then invalidate the CloudFront cache for that path.

## References

- Main Documentation: [CLOUDFRONT_SPA_ROUTING.md](../CLOUDFRONT_SPA_ROUTING.md)
- Function Source: [infra/cloudfront/functions/spa-rewrite.js](../infra/cloudfront/functions/spa-rewrite.js)
- Association Script: [scripts/cloudfront-associate-spa-function.ps1](../scripts/cloudfront-associate-spa-function.ps1)
- Verification Script: [scripts/verify-spa-rewrite.js](../scripts/verify-spa-rewrite.js)
- Header Assertion: [scripts/assert-headers.js](../scripts/assert-headers.js)

## Next Steps

1. ✅ Function and scripts implemented
2. ⏳ Run association script on production distribution
3. ⏳ Wait for deployment to complete
4. ⏳ Test SPA routing in production
5. ⏳ Remove 404 fallback if previously added
6. ⏳ Update CI/CD pipeline with dynamic invalidation
7. ⏳ Monitor CloudWatch metrics for 4xx errors

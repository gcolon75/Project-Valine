# White Screen Runbook

> **Note**: This documentation uses PowerShell commands. Archived documentation may contain bash examples for historical reference.


## Quick Reference

**Symptoms:** Blank white screen, no content loading, or "Unexpected token '<'" JavaScript errors.

**Common Causes:**
1. Deep links not rewritten to `/index.html` (missing CloudFront viewer-request function)
2. Cached `index.html` references pruned/missing bundles → 404 for main module
3. Wrong MIME type on JavaScript bundles (served as HTML)
4. Incorrect Cache-Control headers causing stale content

**Fast Diagnosis:** Run diagnostic script
```powershell
# Bash (Linux/Mac)
./scripts/diagnose-white-screen.sh --domain your-domain.com

# Node.js (Cross-platform)
node scripts/diagnose-white-screen.js --domain your-domain.com

# PowerShell (Windows)
.\scripts\diagnose-white-screen.ps1 -Domain "your-domain.com"
```

---

## Decision Tree

```
White Screen Issue?
│
├─> Can you see any content? ────────> NO ────┐
│                                              │
├─> Do you see errors in console? ────> YES ──┤
│   │                                          │
│   ├─> "Unexpected token '<'" ───────────────┤
│   ├─> "Failed to load module" ──────────────┤
│   └─> "MIME type of text/html" ─────────────┤
│                                              │
└─> First time loading or refresh? ───────────┘
    │
    ├─> First time (deep link) ──> Check SPA Routing (Section 1)
    │
    ├─> After deployment ────────> Check Bundle Issues (Section 2)
    │
    └─> After hard refresh ──────> Check Cache Issues (Section 3)
```

---

## 1. SPA Routing Issues (Deep Links)

### Symptom
- Accessing `/join`, `/feed`, `/settings` etc. directly shows blank screen or S3 XML error
- Works fine when navigating from home page `/`

### Root Cause
CloudFront doesn't have viewer-request function to rewrite extension-less paths to `/index.html`

### Quick Fix (PowerShell)
```powershell
# 1. Verify current config
.\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC"

# 2. If viewer-request function is missing, attach it
.\scripts\cloudfront-associate-spa-function.ps1 -DistributionId "E1234567890ABC"

# 3. Wait 2-5 minutes for propagation, then test
Invoke-RestMethod -Uri "https://your-domain.com/join" -Method Get
# Should return HTML (200), not XML (403/404)
```

### Quick Fix (Bash)
```powershell
# 1. Check current config
aws cloudfront get-distribution-config --id E1234567890ABC \
  --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[?EventType==`viewer-request`]'

# 2. If empty, need to attach function (use PowerShell script or manual AWS console)

# 3. Test
Invoke-RestMethod -Uri "-I" -Method Get
# Should return: HTTP/2 200, content-type: text/html
```

### Verification
```powershell
node scripts/diagnose-white-screen.js --domain your-domain.com
# Should pass: "✅ /join → 200 HTML"
```

---

## 2. Bundle Issues (Module Not Loading)

### Symptom
- Console shows: `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"`
- Or: `Uncaught SyntaxError: Unexpected token '<'`
- Network tab shows 404 for `/assets/index-<hash>.js` or returns HTML instead of JS

### Root Cause
- Bundle not uploaded to S3
- Wrong MIME type on bundle (text/html instead of application/javascript)
- Cached broken bundle in CloudFront

### Quick Fix (PowerShell)
```powershell
# 1. Rebuild and deploy with correct MIME types
npm run build

.\scripts\deploy-static-with-mime.ps1 `
  -S3Bucket "your-frontend-bucket" `
  -CloudFrontDistributionId "E1234567890ABC"

# 2. Invalidate CloudFront cache
aws cloudfront create-invalidation `
  --distribution-id E1234567890ABC `
  --paths "/*"

# 3. Wait 5-15 minutes, then test in incognito window
```

### Quick Fix (Bash)
```powershell
# 1. Rebuild and deploy
npm run build

./scripts/deploy-static-with-mime.sh \
  your-frontend-bucket \
  E1234567890ABC

# 2. Verify S3 bundle MIME type
BUNDLE_KEY=$(ls dist/assets/index-*.js | head -1 | xargs basename | sed 's|^|assets/|')
aws s3api head-object \
  --bucket your-frontend-bucket \
  --key "$BUNDLE_KEY" \
  --query '[ContentType,CacheControl]' \
  --output table

# Expected:
# ContentType: application/javascript; charset=utf-8
# CacheControl: public, max-age=31536000, immutable
```

### Verification
```powershell
node scripts/diagnose-white-screen.js \
  --domain your-domain.com \
  --bucket your-frontend-bucket

# Should pass:
# ✅ Bundle checks → OK
# ✅ S3 metadata → OK
```

---

## 3. Cache Issues (Stale Content)

### Symptom
- Deployment succeeded but users still see old version or white screen
- Browser shows 304 Not Modified for index.html
- index.html references old bundle hash that no longer exists

### Root Cause
- CloudFront cache not invalidated after deployment
- Browser cache serving stale index.html
- CDN edge serving old content

### Quick Fix (PowerShell)
```powershell
# 1. Invalidate CloudFront cache completely
aws cloudfront create-invalidation `
  --distribution-id E1234567890ABC `
  --paths "/*"

# 2. Check invalidation status
aws cloudfront list-invalidations `
  --distribution-id E1234567890ABC `
  --max-items 1

# 3. Have users hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
#    or provide "Clear cache & reload" button in error UI
```

### Quick Fix (Bash)
```powershell
# 1. Create invalidation
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"

# 2. Monitor invalidation progress
INVALIDATION_ID="I1234567890ABC"  # From above output
aws cloudfront get-invalidation \
  --distribution-id E1234567890ABC \
  --id "$INVALIDATION_ID" \
  --query 'Invalidation.Status'

# Wait for: "Completed"
```

### Verification
```powershell
# Test with cache-busting
Invoke-RestMethod -Uri "-I" -Method Get

# Should return:
# HTTP/2 200
# cache-control: no-cache, no-store, must-revalidate
# content-type: text/html
```

---

## 4. Emergency Rollback

If a deployment caused the white screen:

### PowerShell
```powershell
# 1. List recent S3 versions
aws s3api list-object-versions `
  --bucket your-frontend-bucket `
  --prefix index.html `
  --max-items 5

# 2. Restore previous version
$PREVIOUS_VERSION = "..." # VersionId from above

aws s3api copy-object `
  --bucket your-frontend-bucket `
  --copy-source "your-frontend-bucket/index.html?versionId=$PREVIOUS_VERSION" `
  --key index.html `
  --content-type "text/html; charset=utf-8" `
  --cache-control "no-cache, no-store, must-revalidate" `
  --metadata-directive REPLACE

# 3. Invalidate CloudFront
aws cloudfront create-invalidation `
  --distribution-id E1234567890ABC `
  --paths "/index.html"

# 4. Verify
Start-Sleep -Seconds 60
Invoke-RestMethod -Uri "https://your-domain.com" -Method Get
```

### Bash
```powershell
# 1. List recent versions
aws s3api list-object-versions \
  --bucket your-frontend-bucket \
  --prefix index.html \
  --max-items 5 \
  --query 'Versions[*].[VersionId,LastModified]' \
  --output table

# 2. Restore previous version
PREVIOUS_VERSION="..."  # VersionId from above

aws s3api copy-object \
  --bucket your-frontend-bucket \
  --copy-source "your-frontend-bucket/index.html?versionId=$PREVIOUS_VERSION" \
  --key index.html \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

# 3. Invalidate
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/index.html"

# 4. Verify
sleep 60
Invoke-RestMethod -Uri "-I" -Method Get
```

---

## 5. Advanced Diagnostics

### Check CloudFront Logs
```powershell
# Enable logging in CloudFront (if not already)
aws cloudfront get-distribution-config \
  --id E1234567890ABC \
  --query 'DistributionConfig.Logging'

# Download recent logs
aws s3 sync s3://your-cloudfront-logs-bucket/ ./cf-logs/ \
  --exclude "*" \
  --include "$(date +%Y-%m-%d)*"

# Check for 404s on bundles
Select-String "404" cf-logs/*.gz | zcat | Select-String "assets/index-"
```

### Check Browser Console Errors
In Chrome DevTools Console:
```javascript
// See what scripts are loaded
performance.getEntriesByType('resource')
  .filter(r => r.initiatorType === 'script')
  .map(r => ({ url: r.name, status: r.responseStatus }))

// Check if app mounted
window.__appMounted ? 'App mounted ✓' : 'App NOT mounted ✗'

// Manually log error for testing
window.__errorInstrumentation.logError(
  new Error('Test error'),
  { source: 'manual-test' }
)
```

### Check Backend Error Logs
```powershell
# Tail CloudWatch logs for client errors
aws logs tail /aws/lambda/pv-api-prod-logEvent \
  --follow \
  --filter-pattern "source:client"

# Or query recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/pv-api-prod-logEvent \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

---

## 6. Preventive Measures

### Before Every Deployment

1. **Build validation**
   ```powershell
   npm run build
   # Postbuild validation runs automatically
   # Should output: "✅ Build validation passed"
   ```

2. **CloudFront config check**
   ```powershell
   .\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC"
   # Should output: "✅ Configuration looks good!"
   ```

3. **Test in staging first**
   ```powershell
   # Deploy to staging
   ./scripts/deploy-static-with-mime.sh staging-bucket STAGING_DIST_ID
   
   # Run diagnostics
   node scripts/diagnose-white-screen.js --domain staging.your-domain.com
   
   # If all pass, deploy to production
   ```

### Monitoring Setup

1. **Enable CloudWatch alarms**
   ```powershell
   # Create alarm for 4xx errors
   aws cloudwatch put-metric-alarm \
     --alarm-name frontend-4xx-errors \
     --metric-name 4xxErrorRate \
     --namespace AWS/CloudFront \
     --statistic Average \
     --period 300 \
     --threshold 5 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 2
   ```

2. **Client-side error monitoring**
   - Errors automatically batched and sent to `/internal/observability/log`
   - Check CloudWatch logs: `/aws/lambda/pv-api-prod-logEvent`
   - Set up alerts on error count spikes

3. **Regular health checks**
   ```powershell
   # Add to cron or GitHub Actions
   */30 * * * * node /path/to/scripts/diagnose-white-screen.js --domain your-domain.com
   ```

---

## 6.5. Subresource Integrity (SRI)

### What is SRI?

Subresource Integrity (SRI) is a security feature that allows browsers to verify that files they fetch (e.g., from a CDN) are delivered without unexpected manipulation. It uses cryptographic hashes to ensure the integrity of JavaScript and CSS files.

### How SRI Works in This Project

After building the project, SRI hashes are automatically generated for the main JS and CSS bundles and injected into `index.html`:

```html
<script type="module" src="/assets/index-abc123.js" 
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"></script>
```

### SRI in Build Pipeline

1. **Generate SRI hashes** (automatically run after build):
   ```powershell
   npm run build:sri
   # Or manually:
   node scripts/generate-sri.js
   ```

2. **Verify SRI hashes** (in CI/CD):
   ```powershell
   npm run verify:sri
   # Or manually:
   node scripts/verify-sri.js
   ```

### Troubleshooting SRI Issues

#### Symptom: "Failed to find a valid digest in the 'integrity' attribute"

**Cause:** The SRI hash in `index.html` doesn't match the actual file content.

**Solutions:**

1. **Regenerate SRI hashes:**
   ```powershell
   npm run build
   node scripts/generate-sri.js
   npm run verify:sri
   ```

2. **Check for file modification after SRI generation:**
   - SRI hashes must be generated AFTER the final build
   - Don't modify files in `dist/` after running `generate-sri.js`

3. **Disable SRI temporarily (emergency only):**
   ```powershell
   # Remove integrity attributes from dist/index.html
   sed -i 's/ integrity="[^"]*"//g' dist/index.html
   sed -i 's/ crossorigin="anonymous"//g' dist/index.html
   
   # Redeploy
   ./scripts/deploy-static-with-mime.sh bucket dist-id
   ```

#### Symptom: "Cross-Origin Resource Sharing (CORS) error" with SRI

**Cause:** `crossorigin="anonymous"` requires proper CORS headers from CloudFront.

**Solution:**
Ensure CloudFront response headers include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```

Check headers:
```powershell
./scripts/assert-headers.sh --domain your-domain.com
```

### SRI and Deployment Retention

The retention guard in deployment scripts checks SRI status before pruning old bundles:

```powershell
# scripts/deploy-frontend.js (excerpt)
if (!verifySRI()) {
  console.error('SRI verification failed - aborting deployment');
  process.exit(1);
}
```

This prevents:
- Deploying bundles with mismatched SRI hashes
- Pruning bundles that are still referenced by cached `index.html`

### Best Practices

1. **Always run SRI generation as part of build:**
   ```json
   "scripts": {
     "build": "vite build && node scripts/generate-sri.js"
   }
   ```

2. **Verify SRI in CI/CD:**
   - Frontend hardening workflow automatically verifies SRI
   - Fails build if hashes don't match

3. **Monitor SRI failures:**
   - Browser console will show clear errors if SRI check fails
   - Set up client-side error monitoring to catch these

4. **Document SRI hashes:**
   - SRI hashes change with every build
   - Track hashes in deployment logs for debugging

---

## 7. Contact & Support

### Escalation Path
1. Run diagnostics and collect output
2. Check recent deployments and changes
3. Review CloudWatch logs for errors
4. If issue persists, rollback to last known good version
5. Open incident ticket with diagnostic output

### Useful Links
- **Auth Backend Investigation:** `docs/AUTH_BACKEND_INVESTIGATION.md` - Diagnose auth endpoint connectivity issues
- Deployment Guide: `docs/DEPLOYMENT.md`
- Testing Guide: `docs/WHITE_SCREEN_FIX_TESTING.md`
- CloudFront SPA Migration: `docs/cloudfront-spa-migration-status.md`
- Frontend Deployment Runbook: `docs/runbooks/frontend-deployment.md`

### Auth Backend Issues

If you're experiencing authentication failures with `net::ERR_NAME_NOT_RESOLVED` errors:

```powershell
# Run auth backend diagnostics
node scripts/check-auth-backend.js --domain fb9pxd6m09.execute-api.us-west-2.amazonaws.com

# Test login credentials
$env:TEST_EMAIL = "user@example.com"
$env:TEST_PASSWORD = "password123"
./scripts/test-auth-login.sh
```

See the **[Auth Backend Investigation Runbook](./AUTH_BACKEND_INVESTIGATION.md)** for detailed troubleshooting steps.

### Common Commands Quick Reference

```powershell
# Diagnosis (Bash)
./scripts/diagnose-white-screen.sh --domain your-domain.com
./scripts/assert-headers.sh --domain your-domain.com
./scripts/guard-cloudfront-config.sh --distribution-id E123

# Diagnosis (Node.js - cross-platform)
node scripts/diagnose-white-screen.js --domain your-domain.com

# Build with SRI
npm run build:sri

# Verify SRI hashes
npm run verify:sri

# Deploy
./scripts/deploy-static-with-mime.sh bucket-name dist-id

# Invalidate
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"

# Rollback
aws s3api copy-object --bucket bucket --copy-source "bucket/index.html?versionId=V123" --key index.html

# Check logs
aws logs tail /aws/lambda/pv-api-prod-logEvent --follow
```

---

## Related Documentation

- [API Base Validation Guide](API_BASE_VALIDATION.md) - Validate API configuration
- [Auth Backend Investigation](AUTH_BACKEND_INVESTIGATION.md) - Authentication diagnostics
- [Deployment Guide](DEPLOYMENT.md) - Full deployment procedures

---

**Last Updated:** 2025-11-19  
**Version:** 2.1  
**Maintained by:** DevOps Team

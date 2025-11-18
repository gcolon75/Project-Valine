# White Screen Runbook

## Quick Reference

**Symptoms:** Blank white screen, no content loading, or "Unexpected token '<'" JavaScript errors.

**Common Causes:**
1. Deep links not rewritten to `/index.html` (missing CloudFront viewer-request function)
2. Cached `index.html` references pruned/missing bundles → 404 for main module
3. Wrong MIME type on JavaScript bundles (served as HTML)
4. Incorrect Cache-Control headers causing stale content

**Fast Diagnosis:** Run diagnostic script
```bash
# Node.js
node scripts/diagnose-white-screen.js --domain your-domain.com

# PowerShell
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
curl https://your-domain.com/join
# Should return HTML (200), not XML (403/404)
```

### Quick Fix (Bash)
```bash
# 1. Check current config
aws cloudfront get-distribution-config --id E1234567890ABC \
  --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[?EventType==`viewer-request`]'

# 2. If empty, need to attach function (use PowerShell script or manual AWS console)

# 3. Test
curl -I https://your-domain.com/join
# Should return: HTTP/2 200, content-type: text/html
```

### Verification
```bash
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
```bash
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
```bash
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
```bash
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
```bash
# Test with cache-busting
curl -I "https://your-domain.com/?nocache=$(date +%s)"

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
curl https://your-domain.com
```

### Bash
```bash
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
curl -I https://your-domain.com
```

---

## 5. Advanced Diagnostics

### Check CloudFront Logs
```bash
# Enable logging in CloudFront (if not already)
aws cloudfront get-distribution-config \
  --id E1234567890ABC \
  --query 'DistributionConfig.Logging'

# Download recent logs
aws s3 sync s3://your-cloudfront-logs-bucket/ ./cf-logs/ \
  --exclude "*" \
  --include "$(date +%Y-%m-%d)*"

# Check for 404s on bundles
grep "404" cf-logs/*.gz | zcat | grep "assets/index-"
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
```bash
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
   ```bash
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
   ```bash
   # Deploy to staging
   ./scripts/deploy-static-with-mime.sh staging-bucket STAGING_DIST_ID
   
   # Run diagnostics
   node scripts/diagnose-white-screen.js --domain staging.your-domain.com
   
   # If all pass, deploy to production
   ```

### Monitoring Setup

1. **Enable CloudWatch alarms**
   ```bash
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
   ```bash
   # Add to cron or GitHub Actions
   */30 * * * * node /path/to/scripts/diagnose-white-screen.js --domain your-domain.com
   ```

---

## 7. Contact & Support

### Escalation Path
1. Run diagnostics and collect output
2. Check recent deployments and changes
3. Review CloudWatch logs for errors
4. If issue persists, rollback to last known good version
5. Open incident ticket with diagnostic output

### Useful Links
- Deployment Guide: `docs/DEPLOYMENT.md`
- Testing Guide: `docs/WHITE_SCREEN_FIX_TESTING.md`
- CloudFront SPA Migration: `docs/cloudfront-spa-migration-status.md`
- Frontend Deployment Runbook: `docs/runbooks/frontend-deployment.md`

### Common Commands Quick Reference

```bash
# Diagnosis
node scripts/diagnose-white-screen.js --domain your-domain.com

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

**Last Updated:** 2024-11-18  
**Version:** 1.0  
**Maintained by:** DevOps Team

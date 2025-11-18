# CloudFront SPA Routing and Asset Deployment Fix

## Overview

This document explains the CloudFront configuration changes needed to fix asset delivery issues and implement proper SPA routing for Project Valine.

## Problem Summary

The production CloudFront distribution (ID: `E16LPJDBIL5DEE`) was experiencing issues:

1. **Custom Error Responses** were mapping 403/404 → 200 /index.html, masking real errors
2. **WAF WebACL** (`AllowOnlyMyIP-CloudFront`) was blocking legitimate asset requests
3. **Deployment process** replaced index.html without retaining legacy hashed bundles
4. **No targeted SPA fallback** - global error mapping broke module script requests

## Solution Components

### 1. CloudFront Function for SPA Routing

**File**: `infra/cloudfront/functions/spaRewrite.js`

A CloudFront Function attached to the viewer-request event that:
- Rewrites extension-less paths (e.g., `/about`, `/users/123`) to `/index.html`
- Preserves actual file requests (`.js`, `.css`, `.png`, etc.)
- Skips API paths (`/api/*`)

**Testing**: Run `node infra/cloudfront/functions/spaRewrite.test.js` to verify logic

### 2. Deployment Scripts with Bundle Retention

**PowerShell**: `scripts/deploy-frontend.ps1`
**Node.js**: `scripts/deploy-frontend.js`

Features:
- Builds frontend (`npm ci && npm run build`)
- Parses `dist/index.html` for module script and stylesheet paths
- Uploads with correct Content-Type and Cache-Control headers
- **Retains previous bundles** for 7 days (configurable)
- Prunes bundles older than retention period
- Optional CloudFront invalidation
- Generates `deploy-report.json`

**Usage**:
```powershell
# PowerShell
.\scripts\deploy-frontend.ps1 -S3Bucket "valine-frontend-prod" -CloudFrontDistributionId "E16LPJDBIL5DEE"

# Or with environment variables
$env:S3_BUCKET="valine-frontend-prod"
$env:CLOUDFRONT_DISTRIBUTION_ID="E16LPJDBIL5DEE"
.\scripts\deploy-frontend.ps1
```

```bash
# Node.js
node scripts/deploy-frontend.js --bucket valine-frontend-prod --distribution E16LPJDBIL5DEE

# Or with environment variables
export S3_BUCKET="valine-frontend-prod"
export CLOUDFRONT_DISTRIBUTION_ID="E16LPJDBIL5DEE"
node scripts/deploy-frontend.js
```

### 3. Diagnostic Tools

**PowerShell**: `scripts/check-cloudfront.ps1`
**Node.js**: `scripts/check-cloudfront.js`

Check CloudFront distribution status:
- Distribution configuration (WAF, custom errors)
- Recent invalidations
- Bundle delivery (Content-Type, first bytes)
- Critical paths accessibility

**Usage**:
```powershell
# PowerShell
.\scripts\check-cloudfront.ps1 -DistributionId "E16LPJDBIL5DEE" -BundlePath "/assets/index-yrgN6q4Q.js" -CloudFrontDomain "dkmxy676d3vgc.cloudfront.net"
```

```bash
# Node.js
node scripts/check-cloudfront.js --distribution E16LPJDBIL5DEE --bundle /assets/index-yrgN6q4Q.js --domain dkmxy676d3vgc.cloudfront.net
```

### 4. CI/CD Verification

**GitHub Actions**: `.github/workflows/frontend-verify.yml`

Automated verification after deployment:
- Fetches index.html from S3 and extracts bundle path
- Verifies bundle exists in S3 with correct metadata
- Tests CloudFront serves bundle with `application/javascript` Content-Type
- Confirms first character is not `<` (HTML)
- Tests SPA routing fallback for extension-less paths
- Tests asset paths don't fallback to HTML

**Trigger manually**:
```bash
gh workflow run frontend-verify.yml
```

## Manual CloudFront Configuration Steps

Since the distribution already exists, these changes must be applied manually via AWS Console or CLI:

### Step 1: Remove Custom Error Responses

**Current State** (from `updated-distribution-config.json`):
```json
"CustomErrorResponses": {
  "Quantity": 0
}
```

✅ **Already removed** - no action needed.

### Step 2: Detach or Update WAF WebACL

**Current State**:
```json
"WebACLId": "arn:aws:wafv2:us-east-1:579939802800:global/webacl/AllowOnlyMyIP-CloudFront/136aae39-43db-4bf4-a93a-8e8c63cce450"
```

**Option A: Detach WAF** (recommended for testing)
```bash
aws cloudfront get-distribution-config --id E16LPJDBIL5DEE > dist-config.json

# Edit dist-config.json: set WebACLId to empty string ""

aws cloudfront update-distribution \
  --id E16LPJDBIL5DEE \
  --if-match <ETag from get-distribution-config> \
  --distribution-config file://dist-config.json
```

**Option B: Add ALLOW Rule for Assets**

Update WAF WebACL `AllowOnlyMyIP-CloudFront` to add explicit ALLOW rule:
```bash
# Get current WebACL
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --id 136aae39-43db-4bf4-a93a-8e8c63cce450 \
  --name AllowOnlyMyIP-CloudFront \
  --region us-east-1 > webacl.json

# Add rule (priority 0, before IP restriction):
# Rule Name: AllowAssets
# Statement: ByteMatch on URI
# Positional Constraint: STARTS_WITH
# Values: /assets/, /theme-init.js, /manifest.json, /*.js, /*.css, /*.png
# Action: ALLOW

# Update WebACL with new rule
aws wafv2 update-web-acl \
  --scope CLOUDFRONT \
  --id 136aae39-43db-4bf4-a93a-8e8c63cce450 \
  --name AllowOnlyMyIP-CloudFront \
  --region us-east-1 \
  --cli-input-json file://webacl-updated.json
```

### Step 3: Create and Attach CloudFront Function

**Create function**:
```bash
aws cloudfront create-function \
  --name spaRewrite \
  --function-config Comment="SPA routing fallback for Project Valine",Runtime=cloudfront-js-1.0 \
  --function-code fileb://infra/cloudfront/functions/spaRewrite.js
```

**Publish function**:
```bash
# Get ETag from create-function output
aws cloudfront publish-function \
  --name spaRewrite \
  --if-match <ETag>
```

**Attach to distribution** (default cache behavior):
```bash
aws cloudfront get-distribution-config --id E16LPJDBIL5DEE > dist-config.json

# Edit dist-config.json: Add to DefaultCacheBehavior.FunctionAssociations:
# {
#   "Quantity": 1,
#   "Items": [{
#     "FunctionARN": "arn:aws:cloudfront::579939802800:function/spaRewrite",
#     "EventType": "viewer-request"
#   }]
# }

aws cloudfront update-distribution \
  --id E16LPJDBIL5DEE \
  --if-match <ETag> \
  --distribution-config file://dist-config.json
```

### Step 4: Verify S3 Bucket Policy

**Current bucket policy** (from `bucket-policy.json`) is correct:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalList",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::valine-frontend-prod",
      "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::579939802800:distribution/E16LPJDBIL5DEE" } }
    },
    {
      "Sid": "AllowCloudFrontServicePrincipalGet",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::valine-frontend-prod/*",
      "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::579939802800:distribution/E16LPJDBIL5DEE" } }
    }
  ]
}
```

✅ **Correct** - Origin Access Control (OAC) `E1PT224NIQ2YRB` is properly configured.

## Deployment Workflow

### New Deployment Process

1. **Build**: `npm run build` (creates `dist/` with hashed bundles)
2. **Deploy**: Use `scripts/deploy-frontend.ps1` or `.js`
   - Uploads all files with correct headers
   - Retains previous bundles (7 days)
   - Prunes old bundles
3. **Invalidate**: Script optionally creates CloudFront invalidation
4. **Verify**: Run `frontend-verify.yml` workflow or manual checks

### Manual Validation Commands

**Check bundle in S3**:
```bash
aws s3api head-object \
  --bucket valine-frontend-prod \
  --key assets/index-yrgN6q4Q.js

# Should show:
# ContentType: application/javascript; charset=utf-8
# CacheControl: public, max-age=31536000, immutable
```

**Check bundle via CloudFront**:
```bash
# Get headers
curl -I https://dkmxy676d3vgc.cloudfront.net/assets/index-yrgN6q4Q.js

# Should return:
# HTTP/2 200
# content-type: application/javascript; charset=utf-8
# cache-control: public, max-age=31536000, immutable

# Get first line (should be JavaScript, not HTML)
curl -s https://dkmxy676d3vgc.cloudfront.net/assets/index-yrgN6q4Q.js | head -c 100

# Should start with: import, export, function, var, const, /*, or //
# Should NOT start with: <!DOCTYPE or <html
```

**Test SPA routing**:
```bash
# Extension-less paths should return index.html
curl -I https://dkmxy676d3vgc.cloudfront.net/about
# Should return 200 with content-type: text/html

curl -I https://dkmxy676d3vgc.cloudfront.net/users/123
# Should return 200 with content-type: text/html

# Asset paths should pass through
curl -I https://dkmxy676d3vgc.cloudfront.net/manifest.json
# Should return 200 with content-type: application/json

curl -I https://dkmxy676d3vgc.cloudfront.net/theme-init.js
# Should return 200 with content-type: application/javascript
```

## Bundle Retention Policy

### Why Retention Matters

When you deploy a new build:
1. Vite generates new hashed bundles (e.g., `index-DtPNJsgH.js`)
2. `index.html` references the new bundle
3. Users with cached `index.html` may still request the old bundle (`index-yrgN6q4Q.js`)

**Without retention**: Immediate 404 for cached users
**With retention**: Old bundle remains accessible for grace period (7 days)

### Configuration

Default: **7 days** retention

Change via environment variable or flag:
```bash
# PowerShell
.\scripts\deploy-frontend.ps1 -RetentionDays 14

# Node.js
node scripts/deploy-frontend.js --retention-days 14
```

### How Pruning Works

1. List all `assets/index-*.js` files in S3
2. For each bundle:
   - Skip current bundle (referenced in new `index.html`)
   - Check LastModified date
   - Delete if older than retention period
3. Log pruned bundles to `deploy-report.json`

## Troubleshooting

### Issue: Assets Return 404

**Symptoms**: `GET /assets/index-yrgN6q4Q.js` returns 404

**Diagnosis**:
```bash
# Check if file exists in S3
aws s3api head-object --bucket valine-frontend-prod --key assets/index-yrgN6q4Q.js

# Check if CloudFront has cached the 404
curl -I https://dkmxy676d3vgc.cloudfront.net/assets/index-yrgN6q4Q.js
# Look for X-Cache: Hit from cloudfront
```

**Solution**:
1. Deploy with retention: `node scripts/deploy-frontend.js`
2. Invalidate if needed: `aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/assets/*"`
3. Wait for invalidation to complete (5-10 minutes)

### Issue: Assets Return HTML Instead of JS

**Symptoms**: Browser console shows "Unexpected token '<'" when loading JS

**Diagnosis**:
```bash
curl -s https://dkmxy676d3vgc.cloudfront.net/assets/index-yrgN6q4Q.js | head -c 100
# If starts with <!DOCTYPE or <html, CloudFront is serving index.html
```

**Root Causes**:
1. Custom Error Responses still active (403/404 → /index.html)
2. SPA rewrite function incorrectly triggers on asset paths
3. WAF blocks request → 403 → error response serves HTML

**Solution**:
1. Verify custom error responses removed: `aws cloudfront get-distribution-config --id E16LPJDBIL5DEE | jq '.DistributionConfig.CustomErrorResponses'`
2. Test CloudFront Function: `node infra/cloudfront/functions/spaRewrite.test.js`
3. Check WAF: Detach or add ALLOW rule for assets
4. Invalidate: `aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"`

### Issue: SPA Routes Return 404

**Symptoms**: Direct navigation to `/about` returns 404

**Diagnosis**:
```bash
curl -I https://dkmxy676d3vgc.cloudfront.net/about
# Should return 200, not 404
```

**Root Cause**: CloudFront Function not attached or not working

**Solution**:
1. Verify function attached: `aws cloudfront get-distribution-config --id E16LPJDBIL5DEE | jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations'`
2. Check function ARN: Should be `arn:aws:cloudfront::579939802800:function/spaRewrite`
3. Test function locally: `node infra/cloudfront/functions/spaRewrite.test.js`
4. Redeploy distribution if needed

## Security Considerations

### Content-Type Headers

**Critical**: Always set correct Content-Type for assets
- JavaScript: `application/javascript; charset=utf-8`
- CSS: `text/css; charset=utf-8`
- JSON: `application/json; charset=utf-8`

**Why**: Browsers enforce MIME type checking. Serving JS with `text/html` triggers errors.

### Cache-Control Headers

**HTML files** (`index.html`):
```
Cache-Control: no-cache, no-store, must-revalidate
```
Ensures users always get latest SPA shell.

**Assets** (`.js`, `.css`, etc.):
```
Cache-Control: public, max-age=31536000, immutable
```
Hashed filenames allow aggressive caching.

**Manifest.json**:
```
Cache-Control: public, max-age=300
```
Short cache for PWA updates.

### WAF Considerations

**Risk**: Overly restrictive WAF rules block legitimate traffic

**Recommendation**:
1. **For development/testing**: Detach WAF
2. **For production**: Add explicit ALLOW rules for:
   - `/assets/*`
   - `/*.js`
   - `/*.css`
   - `/*.json`
   - `/*.png`, `/*.jpg`, `/*.svg`, etc.

**Rule Priority**: Place ALLOW rules before IP restriction rules

## Monitoring

### CloudFront Access Logs

Enable CloudFront standard access logs:
```bash
aws cloudfront get-distribution-config --id E16LPJDBIL5DEE > dist-config.json

# Edit: Set Logging.Enabled = true, specify S3 bucket and prefix

aws cloudfront update-distribution \
  --id E16LPJDBIL5DEE \
  --if-match <ETag> \
  --distribution-config file://dist-config.json
```

**Log fields to monitor**:
- `sc-status` = 404 (asset not found)
- `sc-status` = 403 (WAF blocked)
- `cs-uri-stem` = `/assets/*` with 4xx status
- `sc-content-type` = `text/html` for `/assets/*` requests (wrong MIME type)

### CloudWatch Metrics

Monitor:
- `4xxErrorRate`: Spike indicates missing assets or WAF blocks
- `5xxErrorRate`: Origin (S3) errors
- `CacheHitRate`: Should be high for assets (>95%)

### Alerts

Set up CloudWatch Alarms:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "CloudFront-High-4xx-Rate" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --dimensions Name=DistributionId,Value=E16LPJDBIL5DEE \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Migration Checklist

- [ ] **Backup**: Export current CloudFront distribution config
- [ ] **Test CloudFront Function**: `node infra/cloudfront/functions/spaRewrite.test.js`
- [ ] **Remove Custom Error Responses**: Via console or CLI
- [ ] **Detach WAF** (or add ALLOW rules): Via console or CLI
- [ ] **Create CloudFront Function**: `aws cloudfront create-function`
- [ ] **Publish Function**: `aws cloudfront publish-function`
- [ ] **Attach Function**: Update distribution config
- [ ] **Deploy Frontend**: `node scripts/deploy-frontend.js`
- [ ] **Verify**: `gh workflow run frontend-verify.yml` or manual checks
- [ ] **Monitor**: Check CloudWatch metrics and logs
- [ ] **Document**: Update runbooks and deployment guides

## References

- [CloudFront Functions Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html)
- [S3 Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [WAF WebACL Management](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html)
- [CloudFront Cache Behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesCacheBehavior)

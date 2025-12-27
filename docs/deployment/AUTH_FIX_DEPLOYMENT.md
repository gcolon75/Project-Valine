# Deployment Checklist: Authentication 401 Fix

**Branch:** `copilot/fix-authentication-401-regression`  
**Date:** 2025-12-27  
**Status:** Ready for Production Deployment

---

## Overview
This PR fixes the authentication 401 regression and adds safeguards to prevent environment variable configuration issues.

## What Was Fixed

### 1. Cookie Configuration (Already Correct) ✅
- **Finding:** The code already uses `SameSite=None; Secure` in production
- **Action:** Improved comments to clarify why this is critical for cross-site requests
- **Files:** `tokenManager.js`, `csrfMiddleware.js`

### 2. Environment Variable Validation (NEW) ✅
- **Problem:** Missing or corrupted env vars caused 503 errors
- **Solution:** Added runtime validation with fail-fast behavior
- **Files:** `envValidation.js` (new), `tokenManager.js`, `db/client.js`
- **Validates:**
  - `DATABASE_URL` - checks format, spaces, protocol
  - `JWT_SECRET` - checks length, rejects default in production
  - `NODE_ENV` - validates against allowed values

### 3. Documentation Updates ✅
- **Added:** `PROFILE_MEDIA_UPLOAD_GUIDE.md` with PowerShell verification scripts
- **Updated:** `serverless.yml` with clear env var documentation
- **Tests:** All 53 tests passing

---

## Pre-Deployment Checklist

### ☐ 1. Verify Environment Variables
Before deploying, ensure these are set in AWS Systems Manager Parameter Store or environment:

```bash
# Critical - MUST be set
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="<64-character-random-hex-string>"
NODE_ENV="production"

# Important - should be set
MEDIA_BUCKET="valine-media-uploads"
FRONTEND_URL="https://dkmxy676d3vgc.cloudfront.net"
API_BASE_URL="https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### ☐ 2. Verify Database Connection
Test DATABASE_URL before deploying:
```bash
psql "$DATABASE_URL" -c "SELECT 1;"
```

### ☐ 3. Run Tests Locally
```bash
cd serverless
npm install
npm test
# Should pass: 53/53 tests
```

### ☐ 4. Review Changes
```bash
git log --oneline origin/main..copilot/fix-authentication-401-regression
git diff origin/main..copilot/fix-authentication-401-regression
```

---

## Deployment Steps

### Deploy to Production
```bash
cd serverless

# Ensure environment variables are set
export AWS_PROFILE=production  # or your profile name

# Deploy
npm run deploy

# Verify deployment
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `pv-api-prod`)].FunctionName'
```

### Verify Each Lambda Has Environment Variables
```bash
# Check a few critical functions
aws lambda get-function-configuration \
  --function-name pv-api-prod-api \
  --query 'Environment.Variables.{DATABASE_URL: DATABASE_URL, JWT_SECRET: JWT_SECRET, NODE_ENV: NODE_ENV}'

aws lambda get-function-configuration \
  --function-name pv-api-prod-getUploadUrl \
  --query 'Environment.Variables.{DATABASE_URL: DATABASE_URL, JWT_SECRET: JWT_SECRET, NODE_ENV: NODE_ENV, MEDIA_BUCKET: MEDIA_BUCKET}'
```

---

## Post-Deployment Verification

### 1. Test Authentication Flow (PowerShell)
```powershell
$API_BASE = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"

# Login
$loginBody = @{
    email = "your-email@example.com"
    password = "your-password"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$API_BASE/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json" `
    -SessionVariable session

Write-Host "✅ Login successful: User ID = $($response.user.id)"

# Test authenticated endpoint
$meResponse = Invoke-RestMethod `
    -Uri "$API_BASE/auth/me" `
    -Method GET `
    -WebSession $session

Write-Host "✅ /auth/me successful: Email = $($meResponse.user.email)"
```

### 2. Verify Cookie Attributes in Browser
1. Open browser to `https://dkmxy676d3vgc.cloudfront.net`
2. Open DevTools → Application/Storage → Cookies
3. Login via the UI
4. Verify cookies:
   - `access_token`: Should have `SameSite=None`, `Secure`, `HttpOnly`
   - `refresh_token`: Should have `SameSite=None`, `Secure`, `HttpOnly`
   - `XSRF-TOKEN`: Should have `SameSite=None`, `Secure` (no HttpOnly)

### 3. Test from CloudFront (Browser)
1. Login at `https://dkmxy676d3vgc.cloudfront.net`
2. Navigate around the app
3. **Critical:** No 401 errors on authenticated endpoints
4. Check Network tab for successful requests to API Gateway

### 4. Check CloudWatch Logs
```bash
# Check for validation errors (should be none after deployment)
aws logs tail /aws/lambda/pv-api-prod-api --since 5m --filter-pattern "EnvValidation"

# Check for authentication errors
aws logs tail /aws/lambda/pv-api-prod-api --since 5m --filter-pattern "401"
```

### 5. Test Profile Update
Use the PowerShell script in `docs/diagnostics/PROFILE_MEDIA_UPLOAD_GUIDE.md`:
- Test 1: Verify authentication works ✅
- Test 2: Get current profile ✅
- Test 3: Update profile ✅

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# Option 1: Redeploy from main branch
git checkout main
cd serverless
npm run deploy

# Option 2: Use AWS Console
# Go to CloudFormation → pv-api-prod stack → "Stack actions" → "Roll back"
```

### Verify Rollback
```bash
# Check function versions
aws lambda list-versions-by-function --function-name pv-api-prod-api
```

---

## Known Issues & Notes

### Issue: Browser Shows "Blocked by SameSite Policy"
- **Cause:** Browser cached old cookies with `SameSite=Lax`
- **Resolution:** User must clear cookies and re-login
- **Prevention:** This PR ensures new cookies use `SameSite=None`

### Issue: 503 from Missing Environment Variable
- **Cause:** Lambda deployed without DATABASE_URL or JWT_SECRET
- **Resolution:** This PR now validates at startup and fails fast with clear error
- **Check Logs:** Look for `[EnvValidation]` messages

### Issue: Database Connection Fails
- **Cause:** Invalid DATABASE_URL or database unreachable
- **Resolution:** Check RDS security groups, verify URL format
- **Check:** `aws rds describe-db-instances` for RDS status

---

## Success Criteria

After deployment, these should all be true:

- [ ] ✅ Login works from CloudFront frontend
- [ ] ✅ `/auth/me` returns 200 (not 401)
- [ ] ✅ Browser cookies show `SameSite=None; Secure`
- [ ] ✅ Profile updates work without 401 errors
- [ ] ✅ No `[EnvValidation]` errors in CloudWatch logs
- [ ] ✅ All Lambda functions have required env vars

---

## Contact & Support

If deployment issues occur:
1. Check CloudWatch logs: `/aws/lambda/pv-api-prod-*`
2. Review this checklist
3. Consult `docs/diagnostics/PROFILE_MEDIA_UPLOAD_GUIDE.md`
4. Check existing runbooks in `docs/runbooks/`

**Emergency Rollback:** See "Rollback Plan" section above

# Runbook: Preventing Cross-Site Cookie Auth & Environment Drift Outages

**Last Updated:** 2025-12-27  
**Status:** Production Incident Response  
**Priority:** Critical

---

## Table of Contents

1. [Incident Summary](#incident-summary)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Prevention Checklist](#prevention-checklist)
4. [Post-Deploy Verification](#post-deploy-verification)
5. [Recovery Procedures](#recovery-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)

---

## Incident Summary

### What Happened

**Date:** 2025-12-27  
**Duration:** Multiple hours  
**Impact:** Complete authentication failure for production users

**Symptoms:**
- Frontend: `https://dkmxy676d3vgc.cloudfront.net`
- Backend: `https://wkndtj22ab.execute-api.us-west-2.amazonaws.com`
- Browser showed **401 Unauthorized** for all authenticated endpoints:
  - `/auth/me`
  - `/me/profile`
  - `/me/preferences`
  - `/feed`
- DevTools confirmed requests had **no `cookie:` request header** despite:
  - Axios configured with `withCredentials: true`
  - Cookies visible in Application/Storage tab
- Intermittent **503 Service Unavailable** errors from various Lambda functions
- Users unable to access any authenticated features

**Business Impact:**
- All authenticated users locked out of the platform
- Unable to view profiles, settings, or feed
- Complete service disruption for production environment

---

## Root Cause Analysis

### Primary Cause: Environment Variable Drift Across Lambda Functions

The CloudFormation stack `pv-api-prod` had **inconsistent environment variables** across Lambda functions:

#### Function: `pv-api-prod-authRouter`
```
✅ DATABASE_URL: <set>
✅ JWT_SECRET: <set>
❌ NODE_ENV: <empty/missing>
```

#### Functions: `pv-api-prod-profilesRouter`, `pv-api-prod-getFeed`, etc.
```
❌ DATABASE_URL: <missing>
✅ NODE_ENV: production
✅ JWT_SECRET: <set>
```

### How This Caused the Outage

#### 1. Missing `NODE_ENV=production` in authRouter

**Impact:** Auth cookies were set with **`SameSite=Lax`** instead of **`SameSite=None; Secure`**

**Explanation:**
- Our tokenManager.js code uses `NODE_ENV` to determine cookie attributes:
  ```javascript
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'None' : 'Lax';
  ```
- When `NODE_ENV` is missing/empty, it defaults to `'Lax'`
- **`SameSite=Lax`** blocks cross-site cookie transmission (CloudFront → API Gateway)
- Browsers require **`SameSite=None; Secure`** for cross-origin cookie auth
- Result: Auth cookies not sent with requests → **401 Unauthorized**

#### 2. Missing `DATABASE_URL` in Other Functions

**Impact:** Intermittent **503 errors** and Prisma initialization failures

**Explanation:**
- Functions like `profilesRouter`, `getFeed` require database access
- Without `DATABASE_URL`, Prisma client cannot initialize
- Cold starts would fail with database connection errors
- Inconsistent behavior as warm containers reused working connections
- Result: Random **503 Service Unavailable** responses

### Why Environment Drift Happened

**Suspected causes:**
1. Manual Lambda function updates via AWS Console
2. Partial CloudFormation stack updates (not all resources updated)
3. Copy/paste errors when manually setting env vars
4. Missing env vars in `serverless.yml` for specific functions
5. Infrastructure-as-Code not enforced for all changes

---

## Prevention Checklist

### Pre-Deployment: Environment Variable Validation

Before deploying to production, **always** verify env vars are consistent across ALL Lambda functions.

#### Step 1: List All Production Lambda Functions

```powershell
# Get all Lambda functions in the pv-api-prod stack
aws lambda list-functions `
  --query 'Functions[?starts_with(FunctionName, `pv-api-prod`)].FunctionName' `
  --output table

# Save function names for verification
$functions = aws lambda list-functions `
  --query 'Functions[?starts_with(FunctionName, `pv-api-prod`)].FunctionName' `
  --output json | ConvertFrom-Json
```

#### Step 2: Check Critical Environment Variables

Run this PowerShell script to check env vars across all functions:

```powershell
# Define critical environment variables
$criticalVars = @('NODE_ENV', 'DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'ALLOWED_USER_EMAILS')

# Get all prod functions
$functions = aws lambda list-functions `
  --query 'Functions[?starts_with(FunctionName, `pv-api-prod`)].FunctionName' `
  --output json | ConvertFrom-Json

Write-Host "`n=== Environment Variable Validation ===" -ForegroundColor Cyan
Write-Host "Checking $($functions.Count) Lambda functions`n"

$issues = @()

foreach ($functionName in $functions) {
    Write-Host "Checking: $functionName" -ForegroundColor Yellow
    
    $config = aws lambda get-function-configuration `
      --function-name $functionName `
      --output json | ConvertFrom-Json
    
    $envVars = $config.Environment.Variables
    
    foreach ($varName in $criticalVars) {
        $value = $envVars.$varName
        
        if ([string]::IsNullOrWhiteSpace($value)) {
            $issue = "❌ $functionName is missing $varName"
            Write-Host "  $issue" -ForegroundColor Red
            $issues += $issue
        } elseif ($varName -eq 'NODE_ENV' -and $value -ne 'production') {
            $issue = "⚠️  $functionName has NODE_ENV=$value (expected: production)"
            Write-Host "  $issue" -ForegroundColor Yellow
            $issues += $issue
        } elseif ($varName -eq 'DATABASE_URL' -and $value -match '\s') {
            $issue = "❌ $functionName DATABASE_URL contains spaces (will cause connection failures)"
            Write-Host "  $issue" -ForegroundColor Red
            $issues += $issue
        } else {
            Write-Host "  ✅ $varName is set" -ForegroundColor Green
        }
    }
    Write-Host ""
}

# Summary
Write-Host "`n=== Validation Summary ===" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "✅ All Lambda functions have consistent environment variables" -ForegroundColor Green
    Write-Host "Safe to deploy!" -ForegroundColor Green
} else {
    Write-Host "❌ Found $($issues.Count) issues:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  $_" }
    Write-Host "`n⚠️  DO NOT DEPLOY until these issues are resolved!" -ForegroundColor Red
    exit 1
}
```

**Save this script as:** `serverless/scripts/validate-env-vars.ps1`

#### Step 3: Fix Missing/Incorrect Environment Variables

If validation fails, update `serverless/serverless.yml`:

```yaml
provider:
  name: aws
  runtime: nodejs20.x
  stage: ${opt:stage, 'dev'}
  region: us-west-2
  environment:
    # REQUIRED: Set these for ALL functions
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}
    JWT_SECRET: ${env:JWT_SECRET}
    FRONTEND_URL: https://dkmxy676d3vgc.cloudfront.net
    ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS}
    API_BASE_URL: https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
    
    # Optional but recommended
    MEDIA_BUCKET: valine-media-uploads
    COOKIE_DOMAIN: .cloudfront.net
    RATE_LIMITING_ENABLED: true
    OBSERVABILITY_ENABLED: true
```

Then redeploy:

```powershell
cd serverless
serverless deploy --stage prod --region us-west-2 --force
```

---

### Post-Deployment: Cookie & Auth Verification

After deployment, verify cookies are set correctly and requests include cookies.

#### Step 1: Verify Cookie Attributes in Browser

1. Open browser to: `https://dkmxy676d3vgc.cloudfront.net`
2. Open DevTools → **Application** tab → **Cookies**
3. Login via the UI
4. Check cookie attributes:

**Expected Cookie Configuration:**

| Cookie Name | Value | SameSite | Secure | HttpOnly | Domain | Path |
|-------------|-------|----------|--------|----------|--------|------|
| `access_token` | `<jwt>` | **None** | ✅ Yes | ✅ Yes | `.cloudfront.net` | `/` |
| `refresh_token` | `<jwt>` | **None** | ✅ Yes | ✅ Yes | `.cloudfront.net` | `/` |
| `XSRF-TOKEN` | `<token>` | **None** | ✅ Yes | ❌ No | `.cloudfront.net` | `/` |

**❌ INCORRECT (will cause 401 errors):**
- `SameSite=Lax` or `SameSite=Strict` → Browser will NOT send cookies cross-site
- `Secure` not set → Browser will NOT send cookies over HTTPS in production

**If cookies are incorrect:**
1. Verify `NODE_ENV=production` is set in authRouter Lambda
2. Redeploy authRouter function
3. Clear browser cookies and re-login

#### Step 2: Verify Browser Sends Cookies (DevTools Network Tab)

1. Stay logged in at `https://dkmxy676d3vgc.cloudfront.net`
2. Open DevTools → **Network** tab
3. Navigate to Profile or Settings page (triggers `/me/profile` or `/me/preferences`)
4. Click on the request to API Gateway
5. Check **Request Headers** section

**Expected:**
```
cookie: access_token=eyJhbGc...; refresh_token=eyJhbGc...; XSRF-TOKEN=abc123...
```

**❌ If missing:**
- Cookies have wrong `SameSite` attribute → Clear cookies and re-login after fixing
- CORS not configured correctly → Check API Gateway CORS headers
- Browser blocking cookies due to privacy settings → Test in different browser

#### Step 3: Test Authenticated Endpoints (PowerShell)

Run this script to verify authentication works end-to-end:

```powershell
$API_BASE = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$FRONTEND_ORIGIN = "https://dkmxy676d3vgc.cloudfront.net"

Write-Host "`n=== Testing Authentication Flow ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "your-email@example.com"
    password = "your-password"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$API_BASE/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -Headers @{"Origin" = $FRONTEND_ORIGIN} `
        -SessionVariable session
    
    Write-Host "✅ Login successful: User ID = $($loginResponse.user.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Test /auth/me
Write-Host "`n2. Testing /auth/me..." -ForegroundColor Yellow
try {
    $meResponse = Invoke-RestMethod `
        -Uri "$API_BASE/auth/me" `
        -Method GET `
        -Headers @{"Origin" = $FRONTEND_ORIGIN} `
        -WebSession $session
    
    Write-Host "✅ /auth/me successful: Email = $($meResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "❌ /auth/me failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  This indicates cookies are not being sent!" -ForegroundColor Red
    exit 1
}

# 3. Test /me/profile
Write-Host "`n3. Testing /me/profile..." -ForegroundColor Yellow
try {
    $profileResponse = Invoke-RestMethod `
        -Uri "$API_BASE/me/profile" `
        -Method GET `
        -Headers @{"Origin" = $FRONTEND_ORIGIN} `
        -WebSession $session
    
    Write-Host "✅ /me/profile successful" -ForegroundColor Green
} catch {
    Write-Host "❌ /me/profile failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Test /me/preferences
Write-Host "`n4. Testing /me/preferences..." -ForegroundColor Yellow
try {
    $prefsResponse = Invoke-RestMethod `
        -Uri "$API_BASE/me/preferences" `
        -Method GET `
        -Headers @{"Origin" = $FRONTEND_ORIGIN} `
        -WebSession $session
    
    Write-Host "✅ /me/preferences successful" -ForegroundColor Green
} catch {
    Write-Host "❌ /me/preferences failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5. Test /feed
Write-Host "`n5. Testing /feed..." -ForegroundColor Yellow
try {
    $feedResponse = Invoke-RestMethod `
        -Uri "$API_BASE/feed?limit=10" `
        -Method GET `
        -Headers @{"Origin" = $FRONTEND_ORIGIN} `
        -WebSession $session
    
    Write-Host "✅ /feed successful: Returned $($feedResponse.posts.Count) posts" -ForegroundColor Green
} catch {
    Write-Host "❌ /feed failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== All Authentication Tests Passed! ===" -ForegroundColor Green
```

**Save this script as:** `serverless/scripts/test-auth-flow.ps1`

---

## Post-Deploy Verification

Add these checks to your deployment checklist:

### 1. Environment Variable Consistency Check

```powershell
# Run the validation script
.\serverless\scripts\validate-env-vars.ps1
```

**Expected Output:** All checks pass, no missing variables.

### 2. Cookie Verification

- Login to `https://dkmxy676d3vgc.cloudfront.net`
- Check DevTools → Application → Cookies
- Verify `SameSite=None; Secure` on all auth cookies

### 3. End-to-End Auth Test

```powershell
# Run the auth flow test
.\serverless\scripts\test-auth-flow.ps1
```

**Expected Output:** All 5 tests pass.

### 4. CloudWatch Logs Check

```powershell
# Check for any auth errors in the last 5 minutes
aws logs tail /aws/lambda/pv-api-prod-authRouter --since 5m --filter-pattern "401"
aws logs tail /aws/lambda/pv-api-prod-profilesRouter --since 5m --filter-pattern "401"

# Check for database errors
aws logs tail /aws/lambda/pv-api-prod-profilesRouter --since 5m --filter-pattern "Prisma"
```

**Expected Output:** No 401 errors, no Prisma connection failures.

---

## Recovery Procedures

### If 401 Errors Occur After Deployment

#### Symptom: Authenticated endpoints return 401, but login works

**Diagnosis:**
1. Check cookies in DevTools:
   - If `SameSite=Lax` → NODE_ENV is not set to "production"
   - If cookies missing → CORS issue or browser blocking
2. Check Network tab:
   - If no `cookie:` header in requests → Browser not sending cookies

**Recovery Steps:**

1. **Fix NODE_ENV on authRouter:**

```powershell
# Check current value
aws lambda get-function-configuration `
  --function-name pv-api-prod-authRouter `
  --query 'Environment.Variables.NODE_ENV'

# If empty or not "production", update serverless.yml and redeploy
cd serverless
# Edit serverless.yml: ensure NODE_ENV: production in provider.environment
serverless deploy function -f authRouter --stage prod --region us-west-2
```

2. **Clear browser cookies and re-login:**

Users must clear cookies because old `SameSite=Lax` cookies are cached:

```
DevTools → Application → Cookies → Right-click → Clear all cookies
```

Then re-login to get new `SameSite=None` cookies.

3. **Verify fix:**

```powershell
.\serverless\scripts\test-auth-flow.ps1
```

---

### If 503 Errors Occur

#### Symptom: Intermittent 503 Service Unavailable from Lambda functions

**Diagnosis:**
1. Check CloudWatch logs for Prisma errors:
   ```powershell
   aws logs tail /aws/lambda/pv-api-prod-profilesRouter --since 10m --follow
   ```
2. Look for: `PrismaClient initialization failed` or `DATABASE_URL not set`

**Recovery Steps:**

1. **Verify DATABASE_URL is set:**

```powershell
# Check all functions
$functions = @('authRouter', 'profilesRouter', 'getFeed', 'getPreferences')
foreach ($func in $functions) {
    Write-Host "`nChecking pv-api-prod-$func"
    aws lambda get-function-configuration `
      --function-name "pv-api-prod-$func" `
      --query 'Environment.Variables.DATABASE_URL'
}
```

2. **Update serverless.yml and redeploy:**

```powershell
cd serverless
# Edit serverless.yml: ensure DATABASE_URL is in provider.environment
serverless deploy --stage prod --region us-west-2 --force
```

3. **Verify fix:**

```powershell
.\serverless\scripts\validate-env-vars.ps1
```

---

### Emergency Rollback

If issues persist, rollback to previous deployment:

```powershell
# Option 1: Redeploy previous git commit
git log --oneline -5
git checkout <previous-working-commit>
cd serverless
serverless deploy --stage prod --region us-west-2 --force

# Option 2: Use CloudFormation rollback
aws cloudformation update-stack `
  --stack-name pv-api-prod `
  --use-previous-template `
  --capabilities CAPABILITY_NAMED_IAM
```

---

## Monitoring & Alerts

### Recommended CloudWatch Alarms

Create these alarms to detect similar issues early:

#### 1. High 401 Error Rate

```powershell
# Alarm if 401 errors exceed threshold
aws cloudwatch put-metric-alarm `
  --alarm-name "pv-api-prod-high-401-rate" `
  --alarm-description "Alert on high 401 unauthorized errors" `
  --metric-name 4XXError `
  --namespace AWS/ApiGateway `
  --statistic Sum `
  --period 300 `
  --threshold 10 `
  --comparison-operator GreaterThanThreshold `
  --evaluation-periods 1
```

#### 2. Lambda Initialization Failures

```powershell
# Alarm if Lambda cold starts fail
aws cloudwatch put-metric-alarm `
  --alarm-name "pv-api-prod-lambda-init-failures" `
  --alarm-description "Alert on Lambda initialization failures" `
  --metric-name Errors `
  --namespace AWS/Lambda `
  --statistic Sum `
  --period 60 `
  --threshold 5 `
  --comparison-operator GreaterThanThreshold `
  --evaluation-periods 1
```

### Manual Monitoring

Run these checks after every deployment:

```powershell
# Check API Gateway 4xx/5xx errors in last hour
aws cloudwatch get-metric-statistics `
  --namespace AWS/ApiGateway `
  --metric-name 4XXError `
  --start-time (Get-Date).AddHours(-1).ToUniversalTime() `
  --end-time (Get-Date).ToUniversalTime() `
  --period 300 `
  --statistics Sum

# Check Lambda errors in last hour
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Errors `
  --dimensions Name=FunctionName,Value=pv-api-prod-authRouter `
  --start-time (Get-Date).AddHours(-1).ToUniversalTime() `
  --end-time (Get-Date).ToUniversalTime() `
  --period 300 `
  --statistics Sum
```

---

## Canonical Configuration Reference

### Production Environment URLs

**Always use these exact URLs** (no variations):

| Component | URL |
|-----------|-----|
| **Frontend** | `https://dkmxy676d3vgc.cloudfront.net` |
| **API Gateway** | `https://wkndtj22ab.execute-api.us-west-2.amazonaws.com` |
| **Database** | `postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require` |

### Database URL Format

**⚠️ CRITICAL:** Database URL must have **NO SPACES**

Common mistakes:
- ❌ `postgres?sslmode=require` (space after `?`)
- ❌ `postgres ?sslmode=require` (space before `?`)
- ❌ Copy/paste adding hidden spaces

**Validation:**

```powershell
# Check for spaces
if ($env:DATABASE_URL -match '\s') {
    Write-Error "DATABASE_URL contains spaces! This will cause connection failures."
} else {
    Write-Host "DATABASE_URL format looks good" -ForegroundColor Green
}
```

### Required Environment Variables (Production)

```
NODE_ENV=production
DATABASE_URL=postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
JWT_SECRET=<generate-with-openssl-rand-base64-32>
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net
API_BASE_URL=https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
MEDIA_BUCKET=valine-media-uploads
COOKIE_DOMAIN=.cloudfront.net
```

---

## Related Documentation

- **Main Deployment Guide:** `docs/DEPLOYMENT_BIBLE.md`
- **Auth Fix Deployment:** `docs/deployment/AUTH_FIX_DEPLOYMENT.md`
- **Profile Media Upload Guide:** `docs/diagnostics/PROFILE_MEDIA_UPLOAD_GUIDE.md`
- **CloudWatch Setup:** `docs/ops/cloudwatch-setup.md`

---

## Lessons Learned

1. **Always enforce env var consistency** across all Lambda functions
2. **`NODE_ENV=production` is critical** for cookie security (SameSite=None)
3. **Missing DATABASE_URL** causes silent failures and intermittent 503s
4. **Never manually update Lambda env vars** via AWS Console (use IaC)
5. **Add pre-deployment validation** to catch drift before it reaches production
6. **Test cookie attributes in browser** after every deployment
7. **Document canonical URLs** to prevent copy/paste errors

---

**End of Runbook**

*Last reviewed: 2025-12-27*

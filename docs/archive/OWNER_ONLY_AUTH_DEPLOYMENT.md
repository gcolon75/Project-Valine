# Owner-Only Authentication Deployment Guide

This guide provides step-by-step instructions for deploying the owner-only authentication hotfix for Project Valine.

## Overview

This deployment implements a security lockdown where:
- The site is publicly viewable
- **ONLY** the owner (email: `ghawk075@gmail.com`) can sign up, log in, create a profile, and post
- All other users are blocked from registration and login with HTTP 403 responses
- Authentication works via CloudFront at `/api/*` with HttpOnly cookie-based sessions

## Prerequisites

- AWS CLI configured with credentials
- Access to AWS Console (CloudFront, API Gateway, Lambda, RDS)
- Node.js 20.x installed locally
- Serverless Framework 3.x installed globally

## Part A: Backend Deployment

### 1. Set Environment Variables in AWS Lambda

The Lambda functions need the following environment variables set. These can be configured via:
- AWS Console: Lambda → Configuration → Environment variables
- AWS CLI: `aws lambda update-function-configuration`
- serverless.yml (already configured with defaults, but override with actual values)

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://username:password@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/valine_db?sslmode=require

# JWT Secret (CRITICAL: Use a secure random string, not the default)
JWT_SECRET=<your-secure-jwt-secret-256-bits>

# Production URLs
NODE_ENV=production
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net
API_BASE_URL=https://dkmxy676d3vgc.cloudfront.net/api
COOKIE_DOMAIN=dkmxy676d3vgc.cloudfront.net

# Owner-Only Auth Configuration
ENABLE_REGISTRATION=false
ALLOWED_USER_EMAILS=ghawk075@gmail.com

# Security Settings
CSRF_ENABLED=false
RATE_LIMITING_ENABLED=true

# Media
MEDIA_BUCKET=valine-media-uploads

# Feature Flags (disabled for MVP)
EMAIL_ENABLED=false
TWO_FACTOR_ENABLED=false
```

### 2. Deploy Backend to AWS Lambda

```bash
# Navigate to serverless directory
cd serverless

# Install dependencies (includes Prisma client generation)
npm ci

# Generate Prisma client with Lambda-compatible binaries
npx prisma generate

# Deploy to AWS (prod stage)
serverless deploy --stage prod --region us-west-2 --verbose
```

**Expected Output:**
- All functions deployed successfully
- API Gateway endpoint: `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
- No Prisma client errors in deployment logs

### 3. Verify Prisma Client in Deployed Lambdas

After deployment, check one of the Lambda functions:

```bash
# Using AWS CLI
aws lambda get-function --function-name pv-api-prod-login --region us-west-2

# Check Lambda logs for Prisma initialization
aws logs tail /aws/lambda/pv-api-prod-login --follow --region us-west-2
```

**Expected:**
- No `@prisma/client did not initialize yet` errors
- No `libquery_engine` missing errors

## Part B: CloudFront Configuration

### 1. Verify CloudFront Function

The CloudFront function `stripApiPrefix` strips the `/api` prefix from requests before forwarding to API Gateway.

**Check Function Status:**

1. AWS Console → CloudFront → Functions
2. Find `stripApiPrefix` function
3. Verify it's **PUBLISHED** (not just saved)
4. Check code matches:

```javascript
function handler(event) {
  var req = event.request;
  if (req.uri.startsWith('/api/')) {
    // remove leading "/api"
    req.uri = req.uri.substring(4);
  }
  return req;
}
```

**Note:** If your API Gateway requires a stage prefix (e.g., `/prod`), update the function:

```javascript
function handler(event) {
  var req = event.request;
  if (req.uri.startsWith('/api/')) {
    // remove "/api" and prepend "/prod"
    req.uri = '/prod' + req.uri.substring(4);
  }
  return req;
}
```

### 2. Associate Function with CloudFront Behavior

1. AWS Console → CloudFront → Distributions
2. Select distribution `E16LPJDBIL5DEE` (dkmxy676d3vgc.cloudfront.net)
3. Go to **Behaviors** tab
4. Edit the `/api/*` behavior
5. Verify settings:
   - **Origin**: API Gateway origin (i72dxlcfcc.execute-api.us-west-2.amazonaws.com)
   - **Cache Policy**: `CachingDisabled`
   - **Origin Request Policy**: `AllViewerExceptHostHeader`
   - **Function associations**: 
     - **Viewer Request**: `stripApiPrefix` (LIVE version)
6. Save changes if any were made

### 3. Invalidate CloudFront Cache

```bash
# Create invalidation for all paths
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/*" \
  --region us-east-1

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id E16LPJDBIL5DEE \
  --region us-east-1
```

Wait for invalidation to complete (Status: `Completed`) before testing.

## Part C: Frontend Deployment

### 1. Build Frontend with Production Environment

```bash
# From project root
cd /home/runner/work/Project-Valine/Project-Valine

# Verify env.production has correct values
cat env.production
# Should show:
# VITE_API_BASE=https://dkmxy676d3vgc.cloudfront.net/api
# VITE_ENABLE_AUTH=true
# VITE_ENABLE_REGISTRATION=false
# VITE_API_USE_CREDENTIALS=true
# VITE_CSRF_ENABLED=false

# Build frontend (uses env.production)
NODE_ENV=production npm run build

# Verify build output
ls -la dist/
```

### 2. Deploy to S3

```bash
# Sync build to S3 bucket
aws s3 sync dist/ s3://valine-frontend-prod \
  --delete \
  --region us-west-2 \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# Deploy index.html with no-cache
aws s3 cp dist/index.html s3://valine-frontend-prod/index.html \
  --cache-control "no-cache,must-revalidate" \
  --region us-west-2
```

### 3. Invalidate CloudFront Cache (Again)

```bash
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/*" \
  --region us-east-1
```

## Part D: Testing & Verification

### 1. Test CloudFront → API Gateway Routing

**Test that /api/* returns JSON, not HTML:**

```powershell
# PowerShell
$response = Invoke-WebRequest -Uri "https://dkmxy676d3vgc.cloudfront.net/api/health" -Method GET
$response.Headers
$response.Content

# Expected:
# Content-Type: application/json
# Response body: {"status":"ok"}
```

```bash
# Bash/curl
curl -v https://dkmxy676d3vgc.cloudfront.net/api/health

# Expected:
# < HTTP/2 200
# < content-type: application/json
# {"status":"ok"}
```

### 2. Test Owner Registration (ALLOWED)

**Owner email should be able to register:**

```powershell
# PowerShell
$body = @{
  email = "ghawk075@gmail.com"
  password = "SecurePass123!"
  username = "gcolon75"
  displayName = "Guillermo Colon"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "https://dkmxy676d3vgc.cloudfront.net/api/auth/register" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -SessionVariable session

# Expected:
# StatusCode: 201
# Set-Cookie headers present (access_token, refresh_token)
# Response body: {"user":{...},"message":"Registration successful..."}

# Check cookies
$session.Cookies.GetCookies("https://dkmxy676d3vgc.cloudfront.net")
```

```bash
# Bash/curl
curl -v -X POST https://dkmxy676d3vgc.cloudfront.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "SecurePass123!",
    "username": "gcolon75",
    "displayName": "Guillermo Colon"
  }' \
  -c cookies.txt

# Expected:
# HTTP/2 201
# Set-Cookie: access_token=...; HttpOnly; Secure; ...
# Set-Cookie: refresh_token=...; HttpOnly; Secure; ...

# Check cookies
cat cookies.txt
```

### 3. Test Non-Owner Registration (BLOCKED)

**Non-owner email should be rejected with 403:**

```powershell
# PowerShell
$body = @{
  email = "hacker@evil.com"
  password = "password123"
  username = "hacker"
  displayName = "Evil Hacker"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "https://dkmxy676d3vgc.cloudfront.net/api/auth/register" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

# Expected:
# StatusCode: 403
# Response body: {"error":"Registration is currently disabled"}
# NO Set-Cookie headers
```

```bash
# Bash/curl
curl -v -X POST https://dkmxy676d3vgc.cloudfront.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@evil.com",
    "password": "password123",
    "username": "hacker",
    "displayName": "Evil Hacker"
  }'

# Expected:
# HTTP/2 403
# {"error":"Registration is currently disabled"}
```

### 4. Test Owner Login (ALLOWED)

**Owner email should be able to log in:**

```powershell
# PowerShell
$body = @{
  email = "ghawk075@gmail.com"
  password = "SecurePass123!"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "https://dkmxy676d3vgc.cloudfront.net/api/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -SessionVariable session

# Expected:
# StatusCode: 200
# Set-Cookie headers present
# Response body: {"user":{...},"csrfToken":"..."}
```

### 5. Test Non-Owner Login (BLOCKED)

**Even with correct password, non-allowlisted user should be blocked:**

First, manually create a test user in the database (bypassing allowlist), then try to log in:

```bash
# This should return 403 even if password is correct
curl -v -X POST https://dkmxy676d3vgc.cloudfront.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "correctpassword"
  }'

# Expected:
# HTTP/2 403
# {"error":"Account not authorized for access"}
```

### 6. Test Frontend UI

**Browser Test:**

1. Open browser in Incognito/Private mode
2. Navigate to: `https://dkmxy676d3vgc.cloudfront.net`
3. Click "Sign Up" or "Sign In"
4. Try registering with non-owner email → Should see error message
5. Register/login with `ghawk075@gmail.com` → Should succeed
6. Open DevTools → Application → Cookies
   - Verify `access_token` and `refresh_token` cookies are present
   - Domain: `dkmxy676d3vgc.cloudfront.net`
   - HttpOnly: ✓
   - Secure: ✓
   - SameSite: Strict
7. Navigate to dashboard/profile creation → Should work
8. Open DevTools → Network
   - Make any authenticated request (e.g., create profile)
   - Verify cookies are sent automatically
   - Verify request succeeds

### 7. Check Lambda Logs

**Verify logging for security monitoring:**

```bash
# Check login handler logs
aws logs tail /aws/lambda/pv-api-prod-login --follow --region us-west-2

# Should see for blocked attempts:
# "Login blocked: Email testuser@example.com not in allowlist. Allowed: ghawk075@gmail.com"

# Check register handler logs
aws logs tail /aws/lambda/pv-api-prod-register --follow --region us-west-2

# Should see for blocked attempts:
# "Registration blocked: ENABLE_REGISTRATION=false and email X not in allowlist"
# "Registration allowed for allowlisted email: ghawk075@gmail.com"
```

## Part E: Evidence Collection

### Evidence to Capture

1. **CloudFront Configuration:**
   - Screenshot of CloudFront Behaviors tab showing /api/* behavior
   - Screenshot of Function associations showing stripApiPrefix on Viewer Request
   - Copy of stripApiPrefix function code
   - Invalidation ID and completion timestamp

2. **API Request/Response Evidence:**
   - PowerShell/curl transcript of POST /api/auth/register (owner) → 201 with Set-Cookie
   - PowerShell/curl transcript of POST /api/auth/register (non-owner) → 403
   - PowerShell/curl transcript of POST /api/auth/login (owner) → 200 with Set-Cookie
   - PowerShell/curl transcript of POST /api/auth/login (non-owner) → 403
   - Headers showing Content-Type: application/json (not text/html)

3. **Lambda Logs:**
   - Snippet showing successful Prisma client initialization (no errors)
   - Log entry showing "Registration allowed for allowlisted email: ghawk075@gmail.com"
   - Log entry showing "Registration blocked: ..." for non-owner attempt
   - Log entry showing "Login blocked: Email X not in allowlist"

4. **Environment Configuration:**
   - Lambda environment variables (with JWT_SECRET and DATABASE_URL redacted)
   - Showing: `ALLOWED_USER_EMAILS=ghawk075@gmail.com`, `ENABLE_REGISTRATION=false`, `NODE_ENV=production`

5. **Browser Testing:**
   - Screenshot of successful owner login with DevTools showing cookies
   - Screenshot of failed non-owner registration attempt with error message
   - Network tab screenshot showing authenticated request with cookies

## Rollback Plan

If issues arise, rollback steps:

### 1. Revert Backend

```bash
# List recent deployments
serverless deploy list --stage prod --region us-west-2

# Rollback to previous version
serverless rollback --timestamp <timestamp> --stage prod --region us-west-2
```

### 2. Revert Frontend

```bash
# Restore previous S3 version
aws s3api list-object-versions --bucket valine-frontend-prod --prefix index.html

aws s3api copy-object \
  --bucket valine-frontend-prod \
  --copy-source valine-frontend-prod/index.html?versionId=<version-id> \
  --key index.html
```

### 3. Restore Environment Variables

Use AWS Console or CLI to restore previous Lambda environment variable values.

## Troubleshooting

### Issue: Prisma Client Error Persists

**Symptoms:** Lambda logs show `@prisma/client did not initialize yet`

**Solutions:**
1. Verify Prisma generate ran during deployment (check CI/CD logs)
2. SSH into Lambda (if available) or check CloudWatch logs for missing files
3. Manually verify node_modules/@prisma/client and .prisma/client exist in deployment
4. Check binaryTargets in schema.prisma includes `rhel-openssl-3.0.x`

### Issue: /api/* Returns HTML Instead of JSON

**Symptoms:** curl /api/health returns SPA index.html

**Solutions:**
1. Verify CloudFront function is PUBLISHED (not just saved)
2. Verify function is associated with /api/* behavior on Viewer Request (not Response)
3. Invalidate CloudFront cache: `aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"`
4. Check if API Gateway requires /prod stage prefix (update function accordingly)

### Issue: Cookies Not Set

**Symptoms:** No Set-Cookie headers in response

**Solutions:**
1. Verify NODE_ENV=production in Lambda environment
2. Verify COOKIE_DOMAIN=dkmxy676d3vgc.cloudfront.net
3. Check that requests go through CloudFront (not direct API Gateway)
4. Verify CORS headers include Access-Control-Allow-Credentials: true

### Issue: Owner Cannot Register

**Symptoms:** Owner email gets 403 on registration

**Solutions:**
1. Verify ALLOWED_USER_EMAILS=ghawk075@gmail.com in Lambda environment (check spelling!)
2. Check Lambda logs for exact error message
3. Verify ENABLE_REGISTRATION=false (paradoxically, this should allow owner via allowlist)
4. Check for typos in email address (case-sensitive comparison)

## Security Notes

1. **JWT Secret Exposed:** The problem statement notes the JWT secret was exposed in earlier commits. After this deployment succeeds, rotate the JWT secret:
   - Generate new secret: `openssl rand -base64 32`
   - Update JWT_SECRET in Lambda environment
   - Invalidate all existing sessions (users will need to re-login)

2. **Database Password:** Ensure DATABASE_URL is stored in AWS Secrets Manager or Parameter Store, not committed to code.

3. **Monitoring:** Set up CloudWatch alarms for:
   - Failed login attempts (rate limiting)
   - 403 responses on /api/auth/* (potential attack)
   - Lambda errors (Prisma failures, etc.)

## Success Criteria

✅ Owner (ghawk075@gmail.com) can:
- Register via /api/auth/register → 201
- Login via /api/auth/login → 200
- Receive HttpOnly cookies with correct domain
- Create profile and post content
- Access authenticated endpoints

✅ Non-owners cannot:
- Register → 403
- Login → 403 (even with valid password if they somehow exist in DB)

✅ Technical verification:
- No Prisma client errors in Lambda logs
- /api/* routes return JSON (not HTML)
- Cookies set with correct flags (HttpOnly, Secure, SameSite=Strict, Domain=cloudfront)
- Requests through CloudFront /api work end-to-end

---

**Deployment Date:** _[To be filled]_  
**Deployed By:** _[To be filled]_  
**Evidence Location:** _[To be filled]_

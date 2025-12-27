# Project Valine Deployment Bible 📖

**Version**: 1.0  
**Last Updated**: 2025-12-27  
**Status**: Canonical Deployment Guide

This is the **SINGLE SOURCE OF TRUTH** for deploying Project Valine to production. All other deployment docs are archived in `docs/archive/`.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Build Process](#build-process)
5. [One-Button Deploy](#one-button-deploy)
6. [Post-Deploy Verification](#post-deploy-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Common Issues & Fixes](#common-issues--fixes)
9. [Security Checklist](#security-checklist)

---

## Quick Start

**For experienced deployers:**

```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

This runs: validation → build → package → deploy → verify → smoke tests.

---

## Prerequisites

### Required Tooling

| Tool | Version | Check Command | Install Link |
|------|---------|---------------|--------------|
| Node.js | 20.x | `node --version` | [nodejs.org](https://nodejs.org) |
| npm | 10.x+ | `npm --version` | (included with Node.js) |
| AWS CLI | 2.x+ | `aws --version` | [AWS CLI Install](https://aws.amazon.com/cli/) |
| Serverless Framework | 3.x+ | `serverless --version` | `npm install -g serverless` |

### AWS Credentials

Configure AWS credentials with permissions for:
- Lambda (create, update, invoke)
- API Gateway (create, update, configure)
- CloudFormation (full access for stack management)
- S3 (deployment artifacts)
- CloudWatch Logs (view logs)

```powershell
# Option 1: AWS CLI configure
aws configure

# Option 2: Environment variables (PowerShell)
$env:AWS_ACCESS_KEY_ID = "your-access-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
$env:AWS_REGION = "us-west-2"
```

### Database

**Required**: PostgreSQL 13+ accessible from AWS Lambda

- AWS RDS PostgreSQL (recommended)
- AWS Aurora Serverless (PostgreSQL-compatible)
- External PostgreSQL with public endpoint + proper security groups

**Connection String Format**:
```
postgresql://username:password@hostname:5432/database?sslmode=require
```

**CRITICAL**: Special characters in password must be URL-encoded:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `&` → `%26`
- `%` → `%25`
- ` ` (space) → `%20`

**Example**:
```powershell
# Password: "P@ss#word!"
# Encoded: "P%40ss%23word%21"
$env:DATABASE_URL = "postgresql://user:P%40ss%23word%21@host.rds.amazonaws.com:5432/valine?sslmode=require"
```

### ⚠️ Copy/Paste Safety: Database URL Format

**CRITICAL**: URLs must NEVER contain spaces. Spaces in URLs cause connection failures and authentication errors.

**Common Mistakes:**
- ❌ `postgres? sslmode=require` (space after `?`)
- ❌ `rds. amazonaws.com` (space in hostname)
- ❌ Extra whitespace from copy/paste errors

**Canonical Database URL** (Production - Dev instance):
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

**Validation Checklist:**
- [ ] No spaces anywhere in the URL
- [ ] `?sslmode=require` has NO space between `?` and `sslmode`
- [ ] Hostname has NO spaces (e.g., `rds.amazonaws.com` not `rds. amazonaws.com`)
- [ ] If copying from documentation, use triple-click to select entire line
- [ ] After pasting, visually verify no extra spaces were introduced

**Quick Test:**
```powershell
# Check for spaces in your DATABASE_URL
if ($env:DATABASE_URL -match '\s') {
    Write-Error "DATABASE_URL contains spaces! This will cause connection failures."
} else {
    Write-Host "DATABASE_URL format looks good (no spaces detected)" -ForegroundColor Green
}
```

---

## Environment Configuration

### Required Environment Variables

All variables must be set in **BOTH** locations:
1. `serverless/.env.prod` (for build time / Prisma)
2. `serverless/serverless.yml` provider.environment (for Lambda runtime)

#### Core Variables

```powershell
# Database
$env:DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"

# Authentication
$env:JWT_SECRET = "<generate-with-openssl-rand-base64-32>"
$env:ALLOWED_USER_EMAILS = "ghawk075@gmail.com,valinejustin@gmail.com"
$env:ENABLE_REGISTRATION = "false"
$env:STRICT_ALLOWLIST = "0"

# Application
$env:NODE_ENV = "production"
$env:STAGE = "prod"
$env:API_BASE_URL = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$env:FRONTEND_URL = "https://dkmxy676d3vgc.cloudfront.net"

# Cookies
$env:COOKIE_DOMAIN = ".cloudfront.net"

# Storage
$env:MEDIA_BUCKET = "valine-media-uploads"

# Features (Production Defaults)
$env:EMAIL_ENABLED = "false"
$env:TWO_FACTOR_ENABLED = "false"
$env:CSRF_ENABLED = "false"
$env:RATE_LIMITING_ENABLED = "true"
$env:OBSERVABILITY_ENABLED = "true"
$env:ANALYTICS_ENABLED = "false"
$env:MODERATION_ENABLED = "false"
$env:REPORTS_ENABLED = "true"
```

### Generate Secure JWT Secret

```powershell
# Option 1: OpenSSL (recommended - cryptographically secure)
openssl rand -base64 32

# Option 2: PowerShell (cryptographically secure)
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### S3 Bucket Name

**IMPORTANT**: Use `valine-frontend-prod`, NOT `project-valine-frontend-prod`

The correct frontend bucket is:
- **Production**: `valine-frontend-prod`
- **CloudFront Distribution**: `dkmxy676d3vgc.cloudfront.net`

---

## Build Process

### 1. Install Dependencies

```powershell
cd serverless
npm ci --production
```

### 2. Build Prisma Layer

The Prisma layer contains the Prisma client and native binaries (~93MB compressed). It's shared across all Lambda functions to avoid exceeding the 250MB limit.

```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
```

**Output**: `serverless/layers/prisma-layer.zip` (~93MB)

**What it does**:
1. Creates temporary directory structure: `layers/nodejs/node_modules/`
2. Installs `@prisma/client` for Linux Lambda runtime
3. Generates Prisma client with native binaries
4. Creates ZIP archive with correct Lambda layer structure
5. Validates ZIP contents

**Troubleshooting**:
- If layer build fails, delete `layers/` folder and retry
- Ensure Prisma schema is valid: `npx prisma validate`
- Check Node version matches Lambda runtime (20.x)

### 3. Run Database Migrations (if needed)

```powershell
# Review pending migrations
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy
```

**IMPORTANT**: Always backup database before migrations!

```powershell
# Backup users table (requires pg_dump installed)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -h <rds-hostname> -U <username> -d <database> -t users -f "backup_$timestamp.sql"
```

---

## One-Button Deploy

### Using Deploy Script (Recommended)

```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

**What the script does**:
1. ✅ Validates required environment variables
2. ✅ Checks for Prisma layer ZIP (builds if missing)
3. ✅ Runs linter (optional, exits on critical errors)
4. ✅ Validates serverless.yml syntax
5. ✅ Packages functions with `serverless package`
6. ✅ Deploys to AWS with `serverless deploy`
7. ✅ Verifies deployed Lambda environment variables
8. ✅ Runs smoke tests against deployed endpoints
9. ✅ Prints deployment summary (NO SECRETS)

### Manual Deploy (Fallback)

If the script fails, deploy manually:

```powershell
cd serverless

# 1. Validate configuration
serverless print | Select-Object -First 20

# 2. Package functions
serverless package --stage prod --region us-west-2

# 3. Deploy
serverless deploy --stage prod --region us-west-2 --verbose

# 4. Get deployment info
serverless info --stage prod --region us-west-2
```

### Deploy Output

Successful deployment shows:

```
Service deployed to stack pv-api-prod

endpoints:
  GET - https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/me
  POST - https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/login
  GET - https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/me/profile
  GET - https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/feed
  ...

functions:
  authRouter: pv-api-prod-authRouter
  profilesRouter: pv-api-prod-profilesRouter
  getFeed: pv-api-prod-getFeed
  ...

layers:
  prismaV2: arn:aws:lambda:us-west-2:123456789012:layer:pv-api-prod-prisma-v2:5
```

---

## Post-Deploy Verification

### 1. Verify Lambda Environment Variables

Check that ALL critical functions have the required env vars:

```powershell
# Check authRouter function
aws lambda get-function-configuration `
  --function-name pv-api-prod-authRouter `
  --query 'Environment.Variables' `
  --output json | Select-String "JWT_SECRET|DATABASE_URL|ALLOWED_USER_EMAILS"

# Check profilesRouter function
aws lambda get-function-configuration `
  --function-name pv-api-prod-profilesRouter `
  --query 'Environment.Variables' `
  --output json | Select-String "JWT_SECRET|DATABASE_URL"

# Check getFeed function
aws lambda get-function-configuration `
  --function-name pv-api-prod-getFeed `
  --query 'Environment.Variables' `
  --output json | Select-String "JWT_SECRET|DATABASE_URL"
```

**Expected**: All functions should have:
- `JWT_SECRET` (same value across all)
- `DATABASE_URL` (same value across all)
- `ALLOWED_USER_EMAILS` (same value across all)
- `NODE_ENV=production`

### 2. Manual Smoke Tests

Test critical auth flow:

```powershell
$API_URL = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$FRONTEND_ORIGIN = "https://dkmxy676d3vgc.cloudfront.net"

# 1. Test login
Invoke-WebRequest -Uri "$API_URL/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "Origin"=$FRONTEND_ORIGIN} `
  -Body '{"email":"ghawk075@gmail.com","password":"YOUR_PASSWORD"}' `
  -SessionVariable session

# Expected: 200 OK, Set-Cookie headers for access_token and refresh_token

# 2. Test /auth/me (should work)
Invoke-WebRequest -Uri "$API_URL/auth/me" `
  -Method GET `
  -Headers @{"Origin"=$FRONTEND_ORIGIN} `
  -WebSession $session

# Expected: 200 OK, user object returned

# 3. Test /me/profile (previously failing)
Invoke-WebRequest -Uri "$API_URL/me/profile" `
  -Method GET `
  -Headers @{"Origin"=$FRONTEND_ORIGIN} `
  -WebSession $session

# Expected: 200 OK, profile object returned

# 4. Test /me/preferences (previously failing)
Invoke-WebRequest -Uri "$API_URL/me/preferences" `
  -Method GET `
  -Headers @{"Origin"=$FRONTEND_ORIGIN} `
  -WebSession $session

# Expected: 200 OK, preferences object returned

# 5. Test /feed (previously failing)
Invoke-WebRequest -Uri "$API_URL/feed?limit=20" `
  -Method GET `
  -Headers @{"Origin"=$FRONTEND_ORIGIN} `
  -WebSession $session

# Expected: 200 OK, posts array returned

# 6. Test /unread-counts (should still work)
Invoke-WebRequest -Uri "$API_URL/unread-counts" `
  -Method GET `
  -Headers @{"Origin"=$FRONTEND_ORIGIN} `
  -WebSession $session

# Expected: 200 OK, notification/message counts
```

### 3. CloudWatch Logs Check

```powershell
# View recent logs for authRouter
aws logs tail /aws/lambda/pv-api-prod-authRouter --follow

# View recent logs for profilesRouter
aws logs tail /aws/lambda/pv-api-prod-profilesRouter --follow

# View recent logs for getFeed
aws logs tail /aws/lambda/pv-api-prod-getFeed --follow
```

Look for:
- ✅ `[extractToken] Found in event.cookies[]` (token extraction working)
- ✅ No `401 Unauthorized` errors after login
- ✅ No `Token not found` messages for authenticated requests
- ❌ No `JsonWebTokenError` or `invalid token` errors

### 4. Frontend Integration Test

1. Open CloudFront URL: `https://dkmxy676d3vgc.cloudfront.net`
2. Login with allowlisted email
3. Navigate to Profile page
4. Navigate to Settings/Preferences
5. Check feed page
6. Verify no intermittent 401 errors in browser Network panel

---

## Rollback Procedure

If deployment causes issues:

### 1. Identify Previous Version

```powershell
# List recent deployments
aws cloudformation describe-stack-events `
  --stack-name pv-api-prod `
  --max-items 20 `
  --query 'StackEvents[?ResourceType==`AWS::CloudFormation::Stack`].[Timestamp,ResourceStatus]' `
  --output table
```

### 2. Rollback Code

```powershell
# Option A: Redeploy previous git commit
git checkout <previous-commit-sha>
cd serverless
serverless deploy --stage prod --region us-west-2 --force

# Option B: Use Serverless Framework rollback (if within same day)
serverless deploy --stage prod --region us-west-2 --force
```

### 3. Rollback Database (if migrations were applied)

```powershell
# Restore from backup
psql -h <rds-hostname> -U <username> -d <database> -f backup_<timestamp>.sql

# Or rollback specific migration
npx prisma migrate resolve --rolled-back <migration-name>
```

### 4. Verify Rollback

Run post-deploy verification tests again to ensure system is stable.

---

## Common Issues & Fixes

### Issue 1: 401 Errors on /me/profile, /feed, /me/preferences

**Symptoms**: `/auth/me` returns 200, but other endpoints return 401

**Root Cause**: Cookie extraction failing due to whitespace in cookie values

**Fix**: Deploy with latest tokenManager.js that trims cookies (fixed in commit 24c5c08)

**Verify**:
```powershell
# Check Lambda code includes the fix by downloading and inspecting the deployment package
$functionName = "pv-api-prod-profilesRouter"
$codeUrl = (aws lambda get-function --function-name $functionName --query 'Code.Location' --output text)

if ($codeUrl) {
    Invoke-WebRequest -Uri $codeUrl -OutFile "$env:TEMP\lambda-code.zip"
    Write-Host "Lambda code downloaded to $env:TEMP\lambda-code.zip"
    Write-Host "Extract and search for 'trimmedCookie' to verify the fix is included"
} else {
    Write-Warning "Could not retrieve Lambda code URL"
}
```

### Issue 2: Missing Prisma Layer

**Symptoms**:
```
Error: Cannot find module '@prisma/client'
Runtime.ImportModuleError
```

**Fix**:
```powershell
cd serverless
Remove-Item -Recurse -Force layers/ -ErrorAction SilentlyContinue
.\scripts\build-prisma-layer.ps1
serverless deploy --stage prod --region us-west-2 --force
```

### Issue 3: Environment Variable Mismatch

**Symptoms**: Some Lambdas work, others don't; inconsistent auth behavior

**Fix**:
```powershell
# Verify all functions have same env vars
$functions = @("authRouter", "profilesRouter", "getFeed", "getPreferences", "updatePreferences")
foreach ($func in $functions) {
  Write-Host "=== $func ==="
  aws lambda get-function-configuration `
    --function-name "pv-api-prod-$func" `
    --query 'Environment.Variables.JWT_SECRET' `
    --output text
}
```

If different, redeploy with `--force` flag.

### Issue 4: Serverless Config Parse Error

**Symptoms**:
```
Invalid serverless.yml syntax
```

**Fix**:
```powershell
# Validate YAML syntax
serverless print

# Check for tab characters (use spaces only)
Select-String -Pattern "`t" -Path serverless/serverless.yml

# Check for invalid environment variable references
Select-String -Pattern '\$\{env:' -Path serverless/serverless.yml
```

### Issue 5: Database Connection Timeout

**Symptoms**:
```
Error: connect ETIMEDOUT
```

**Fix**:
1. Check RDS security group allows inbound from Lambda VPC
2. Verify DATABASE_URL has no spaces: 
   ```powershell
   $env:DATABASE_URL | Format-Hex
   ```
3. Test connection from Lambda:
   ```powershell
   aws lambda invoke --function-name pv-api-prod-health response.json
   Get-Content response.json
   ```

### Issue 6: S3 Bucket Not Found (Frontend Deploy)

**Symptoms**: Frontend assets fail to upload

**Fix**: Use correct bucket name `valine-frontend-prod`:
```powershell
# Check bucket exists
aws s3 ls s3://valine-frontend-prod

# If using wrong name, update deployment scripts
Select-String -Pattern "project-valine-frontend-prod" -Path . -Recurse -Exclude node_modules
# Replace with: valine-frontend-prod
```

---

## Security Checklist

Before deploying to production:

- [ ] JWT_SECRET is strong (32+ random bytes, base64 encoded)
- [ ] JWT_SECRET is NOT committed to git
- [ ] DATABASE_URL password is NOT committed to git
- [ ] ALLOWED_USER_EMAILS is set correctly
- [ ] ENABLE_REGISTRATION matches security policy
- [ ] RDS security group restricts access to Lambda VPC only
- [ ] CloudWatch logs do NOT contain JWT tokens or passwords
- [ ] CORS origins are restricted to legitimate domains
- [ ] Rate limiting is enabled (`RATE_LIMITING_ENABLED=true`)
- [ ] CloudFront is configured with HTTPS only
- [ ] API Gateway endpoint is NOT public (only accessible via CloudFront)

### Rotate Secrets After Leak

If secrets are committed to git:

```powershell
# 1. Generate new JWT secret (cryptographically secure)
$NEW_JWT_SECRET = openssl rand -base64 32

# 2. Update Lambda env vars
aws lambda update-function-configuration `
  --function-name pv-api-prod-authRouter `
  --environment "Variables={JWT_SECRET=$NEW_JWT_SECRET,...}"

# 3. Update .env.prod (do NOT commit)
Add-Content -Path serverless/.env.prod -Value "JWT_SECRET=$NEW_JWT_SECRET"

# 4. Redeploy all functions
serverless deploy --stage prod --region us-west-2 --force

# 5. Notify users to re-login (old tokens invalid)
```

---

## Support & Escalation

### Deployment Issues

1. Check this document first
2. Review CloudWatch logs: `/aws/lambda/pv-api-prod-*`
3. Review `docs/debug/route-to-function.md`
4. If stuck, create GitHub issue with:
   - Error messages (redacted)
   - Deployment logs (redacted)
   - Lambda function names affected
   - Steps to reproduce

### Emergency Contact

- **Primary**: @gcolon75
- **Escalation Path**: Create P0 incident in ops channel

---

## Appendix

### Deploy Script Locations

- PowerShell: `serverless/scripts/deploy.ps1`

### Useful AWS CLI Commands

```powershell
# List all Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `pv-api-prod`)].FunctionName'

# Get API Gateway endpoint
aws apigateway get-rest-apis --query 'items[?name==`pv-api-prod`].id' --output text

# Check Lambda layer versions
aws lambda list-layer-versions --layer-name pv-api-prod-prisma-v2

# View recent CloudFormation events
aws cloudformation describe-stack-events --stack-name pv-api-prod --max-items 10
```

### Related Documentation

- Route Mapping: `docs/debug/route-to-function.md`
- Archived Deployment Docs: `docs/archive/`
- Serverless Configuration: `serverless/serverless.yml`
- Environment Examples: `serverless/.env.example`

---

**End of Deployment Bible** 📖

*This document is the canonical source for deployments. If information conflicts with other docs, this doc wins.*

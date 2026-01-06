# Project Valine Deployment Bible 📖

**Version**: 1.1  
**Last Updated**: 2026-01-06  
**Status**: Canonical Deployment Guide

This is the **SINGLE SOURCE OF TRUTH** for deploying Project Valine to production. All other deployment docs are archived in `docs/archive/`.

---

## ⚠️ CRITICAL SECURITY NOTICE

**SECRETS WERE PREVIOUSLY COMMITTED TO GIT AND HAVE BEEN REMOVED**

The following files containing production secrets were previously committed to this repository's git history:
- `serverless/.env.prod` (DATABASE_URL, JWT_SECRET)
- `serverless/env-prod.json` and `serverless/env-pv-api-*.json` files

**REQUIRED ACTIONS:**
1. ✅ **These files have been removed from git tracking** (as of 2026-01-06)
2. ⚠️ **You MUST rotate these secrets immediately**:
   - Generate new JWT_SECRET: `openssl rand -base64 32` or see [Rotate Secrets](#rotate-secrets-after-leak)
   - Change DATABASE_URL password in AWS RDS Console
   - Update Lambda functions with new secrets using the deploy script
3. ⚠️ **Never commit these files again** - they are now in `.gitignore`

See the [Security Checklist](#security-checklist) section for detailed secret rotation procedures.

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

**Backend:**
```powershell
cd serverless
npm ci
npx serverless@3 deploy --stage prod --region us-west-2
```

**Frontend:**
```powershell
cd ..\
npm ci
npm run build
aws s3 sync dist/ s3://valine-frontend-prod --delete
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

**Note:** Serverless Framework is installed locally via npm. No global installation required. Use `npx serverless@3` for deployment.

The `serverless.yml` configuration uses the `serverless-esbuild` plugin for bundling. This is automatically installed when you run `npm ci` in the serverless directory.

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
- ❌ `postgres?sslmode=require` (space after `?`)
- ❌ `rds.amazonaws.com` (space in hostname)
- ❌ Extra whitespace from copy/paste errors

**Example Database URL Format:**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

**Validation Checklist:**
- [ ] No spaces anywhere in the URL
- [ ] `?sslmode=require` has NO space between `?` and `sslmode`
- [ ] Hostname has NO spaces
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
$env:DATABASE_URL = "postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

# Authentication
$env:JWT_SECRET = "<generate-with-openssl-rand-base64-32>"
$env:ALLOWED_USER_EMAILS = "user1@example.com,user2@example.com"
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

**From Repository Root** (important for monorepo/hoisted layouts):

```powershell
# Change to repository root
cd /path/to/Project-Valine

# Install dependencies
npm ci

# This installs dependencies for both root and serverless workspaces
```

### 2. Build Prisma Layer (Windows PowerShell)

The Prisma layer contains the Prisma client and native binaries (~93MB compressed). It's shared across all Lambda functions to avoid exceeding the 250MB limit.

**Build from Windows PowerShell**:

```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
```

**Output**: `serverless/layers/prisma-layer.zip` (~93MB)

**What it does**:
1. Generates Prisma client with `npx prisma generate --schema=serverless/prisma/schema.prisma` from repo root
2. Detects generated client in either:
   - `serverless/node_modules/.prisma` (standalone layout)
   - `<repo-root>/node_modules/.prisma` (hoisted/monorepo layout)
3. Copies the entire `.prisma/client` and `@prisma/client` directories
4. Creates ZIP archive with correct Lambda layer structure: `nodejs/node_modules/`
5. Verifies the Linux binary `libquery_engine-rhel-openssl-3.0.x.so.node` is present in the zip

**Key Features**:
- Supports monorepo/hoisted node_modules layouts
- Runs Prisma generate from repo root to ensure Linux binaries are downloaded
- Clear error messages if Prisma client not found
- Windows path separator safe
- PowerShell 5.1 compatible

**Troubleshooting**:
- If layer build fails, delete `layers/` folder and retry
- Ensure Prisma schema is valid: `npx prisma validate --schema=serverless/prisma/schema.prisma`
- Check Node version matches Lambda runtime (20.x)
- Verify `binaryTargets = ["native", "rhel-openssl-3.0.x"]` in `serverless/prisma/schema.prisma`

**Docker Fallback (if Windows cannot download Linux binary)**:

If running on Windows and the `rhel-openssl-3.0.x` binary isn't downloaded automatically, use Docker to generate it:

```powershell
# From repository root
docker run --rm -v ${PWD}:/app -w /app node:20-bullseye bash -c "npm ci && npx prisma generate --schema=serverless/prisma/schema.prisma"

# Then build the layer
cd serverless
.\scripts\build-prisma-layer.ps1
```

This generates the Prisma client inside a Linux container, ensuring the correct binary is downloaded.

### 3. Run Database Migrations (if needed)

**Always run migrations from repository root with full schema path**:

```powershell
# Change to repository root
cd /path/to/Project-Valine

# Review pending migrations
npx prisma migrate status --schema serverless/prisma/schema.prisma

# Apply migrations to production database
npx prisma migrate deploy --schema serverless/prisma/schema.prisma
```

**IMPORTANT**: Always backup database before migrations!

---

## One-Button Deploy

### Using npx serverless@3 (Recommended)

```powershell
cd serverless
npm ci
npx serverless@3 deploy --stage prod --region us-west-2
```

**What this does**:
1. Packages functions with serverless-esbuild
2. Deploys to AWS with CloudFormation
3. Attaches Prisma layer to all functions
4. Injects environment variables from serverless.yml

### Using Deploy Script (Alternative)

```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

**What the script does**:
1. Validates required environment variables
2. Checks for Prisma layer ZIP (builds if missing)
3. Validates serverless.yml syntax
4. Packages functions with `npx serverless@3 package`
5. Deploys to AWS with `npx serverless@3 deploy`
6. Verifies deployed Lambda environment variables
7. Runs smoke tests against deployed endpoints
8. Prints deployment summary (NO SECRETS)

### Manual Deploy (Fallback)

If the script fails, deploy manually:

```powershell
cd serverless

# 1. Ensure dependencies are installed
npm ci

# 2. Build Prisma layer if missing
.\scripts\build-prisma-layer.ps1

# 3. Deploy
npx serverless@3 deploy --stage prod --region us-west-2 --verbose

# 4. Get deployment info
npx serverless@3 info --stage prod --region us-west-2
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

**CRITICAL:** Always run these checks after every deployment to prevent auth/infra outages.

### 1. Environment Variable Drift Check (Automated)

Run this PowerShell script to verify all Lambda functions have consistent env vars:

```powershell
# Define critical environment variables that must be set on ALL functions
$criticalVars = @('NODE_ENV', 'DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL')

# Get all prod functions
$functions = aws lambda list-functions `
  --query 'Functions[?starts_with(FunctionName, `pv-api-prod`)].FunctionName' `
  --output json | ConvertFrom-Json

Write-Host "`n=== Environment Variable Drift Check ===" -ForegroundColor Cyan
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
            $issue = "❌ $functionName DATABASE_URL contains spaces"
            Write-Host "  $issue" -ForegroundColor Red
            $issues += $issue
        } else {
            Write-Host "  ✅ $varName is set" -ForegroundColor Green
        }
    }
    Write-Host ""
}

if ($issues.Count -eq 0) {
    Write-Host "✅ All checks passed - no environment drift detected" -ForegroundColor Green
} else {
    Write-Host "❌ Found $($issues.Count) issues - IMMEDIATE ACTION REQUIRED" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  $_" }
}
```

**Save this script as:** `serverless/scripts/check-env-drift.ps1`

**Why this matters:** Missing `NODE_ENV=production` causes auth cookies to be set as `SameSite=Lax` instead of `SameSite=None; Secure`, breaking cross-site authentication. Missing `DATABASE_URL` causes 503 errors.

### 2. Verify Lambda Environment Variables (Manual)

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

### 3. Verify Cookie Attributes (Browser)

1. Open browser to: `https://dkmxy676d3vgc.cloudfront.net`
2. Open DevTools → **Application** → **Cookies**
3. Login via the UI
4. Verify cookies have correct attributes:

| Cookie | SameSite | Secure | HttpOnly |
|--------|----------|--------|----------|
| `access_token` | **None** | ✅ Yes | ✅ Yes |
| `refresh_token` | **None** | ✅ Yes | ✅ Yes |
| `XSRF-TOKEN` | **None** | ✅ Yes | ❌ No |

**❌ If cookies show `SameSite=Lax`:** This means `NODE_ENV` is not set to "production" in authRouter Lambda. Redeploy immediately and have users clear cookies + re-login.

### 4. Manual Smoke Tests

Test critical auth flow:

```powershell
$API_URL = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$FRONTEND_ORIGIN = "https://dkmxy676d3vgc.cloudfront.net"

# 1. Test login
Invoke-WebRequest -Uri "$API_URL/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "Origin"=$FRONTEND_ORIGIN} `
  -Body '{"email":"your-email@example.com","password":"YOUR_PASSWORD"}' `
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

### 5. CloudWatch Logs Check

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

### 6. Frontend Integration Test

1. Open CloudFront URL: `https://dkmxy676d3vgc.cloudfront.net`
2. Login with allowlisted email
3. Navigate to Profile page
4. Navigate to Settings/Preferences
5. Check feed page
6. Verify no intermittent 401 errors in browser Network panel

**See also:** `docs/runbooks/prevent-auth-env-drift.md` for detailed incident prevention procedures.

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
npx serverless@3 deploy --stage prod --region us-west-2 --force

# Option B: Use Serverless Framework rollback (if within same day)
npx serverless@3 deploy --stage prod --region us-west-2 --force
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

### Issue 1: Intermittent 503 Service Unavailable

**Symptoms**: 
- Lambda returns 503 errors
- Errors about missing DATABASE_URL or JWT_SECRET
- Works locally but fails in production
- Occurs after redeployment or environment reset

**Root Cause**: Missing or empty environment variables in deployed Lambda functions

**Diagnosis**:
```powershell
# Check if Lambda functions have required environment variables
cd serverless
.\scripts\audit-lambda-env.ps1 -Stage prod -Region us-west-2
```

**Fix**:
1. Verify your local environment has all required variables:
   ```powershell
   cd serverless
   .\scripts\validate-required-env.ps1 -Strict
   ```

2. Ensure variables are loaded before deployment:
   ```powershell
   # Load from .env.prod if exists
   if (Test-Path ".env.prod") {
       Get-Content ".env.prod" | ForEach-Object {
           if ($_ -match '^([^=]+)=(.*)$') {
               $name = $matches[1].Trim()
               $value = $matches[2].Trim()
               [Environment]::SetEnvironmentVariable($name, $value, "Process")
           }
       }
   }
   ```

3. Redeploy with verified environment:
   ```powershell
   .\scripts\deploy.ps1 -Stage prod -Region us-west-2
   ```

**Prevention**: The deploy script now validates environment variables before deployment to prevent this issue.

### Issue 2: 401 Errors on /me/profile, /feed, /me/preferences

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

### Issue 3: Missing Prisma Layer

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
npx serverless@3 deploy --stage prod --region us-west-2 --force
```

### Issue 4: Environment Variable Mismatch

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

### Issue 5: Serverless Config Parse Error

**Symptoms**:
```
Invalid serverless.yml syntax
```

**Fix**:
```powershell
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

# If using wrong name, update deployment scripts and docs to use valine-frontend-prod
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

**⚠️ CRITICAL: If any secrets were committed to git or exposed publicly, rotate them immediately.**

If secrets (JWT_SECRET, DATABASE_URL password, etc.) are committed to git or leaked:

```powershell
# 1. Generate new JWT secret (cryptographically secure)
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$NEW_JWT_SECRET = [Convert]::ToBase64String($bytes)

Write-Host "New JWT_SECRET: $NEW_JWT_SECRET"

# 2. Update .env.prod file (do NOT commit to git)
# Edit serverless/.env.prod manually and set:
# JWT_SECRET=<new-secret-here>

# 3. Load new environment variables
cd serverless
Get-Content .env.prod | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# 4. Redeploy all functions with new secret
.\scripts\deploy.ps1 -Stage prod -Region us-west-2 -Force

# 5. Verify all functions have the new secret
.\scripts\audit-lambda-env.ps1 -Stage prod -Region us-west-2

# 6. Notify all users to re-login (old tokens are now invalid)
# Post announcement on the platform or send email notifications
```

**For DATABASE_URL password rotation:**
```powershell
# 1. Change password in AWS RDS Console or using AWS CLI
# 2. Update DATABASE_URL in .env.prod with URL-encoded new password
# 3. Redeploy:
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2 -Force
```

**Verify secrets are NOT in git history:**
```powershell
# Search for potential secrets in git history
git log --all --full-history --source -- "*env*" "*.json"

# If found, use git-filter-repo or BFG Repo-Cleaner to remove them
# Then force push (coordinate with team first!)
```

**Add secrets to .gitignore:**
```gitignore
# Add to .gitignore if not already present
.env
.env.local
.env.*.local
.env.prod
.env.production
*.secret
*secret.json
env-*.json
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

### PowerShell Testing Pattern Reference

**Canonical Pattern for Cookie-Session Testing (Browser-like behavior)**

All Project Valine documentation uses PowerShell for API testing. The recommended pattern for authenticated requests uses session variables to maintain cookies:

```powershell
# Step 1: Login and capture session
$response = Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"email":"user@example.com","password":"password123"}' `
    -SessionVariable session

# Step 2: Use session for authenticated requests
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/me/profile" `
    -Method Get `
    -WebSession $session
```

**Key Points:**
- Use `Invoke-WebRequest` with `-SessionVariable` for initial login to capture cookies
- Use `-WebSession $session` for all subsequent authenticated requests
- Works in Windows PowerShell 5.1 (PSEdition Desktop)
- Mimics browser behavior (cookies automatically sent with each request)
- For viewing response headers or status codes, use `Invoke-WebRequest` instead of `Invoke-RestMethod`

**See Also:** "Post-Deploy Verification" section (line 312) for complete smoke test examples

### Related Documentation

- Route Mapping: `docs/debug/route-to-function.md`
- Archived Deployment Docs: `docs/archive/`
- Serverless Configuration: `serverless/serverless.yml`
- Environment Examples: `serverless/.env.example`

---

**End of Deployment Bible** 📖

*This document is the canonical source for deployments. If information conflicts with other docs, this doc wins.*

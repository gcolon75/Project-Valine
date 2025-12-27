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
# Windows (PowerShell)
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2

# Linux/Mac (Bash)
cd serverless
./scripts/deploy.sh prod us-west-2
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

```bash
# Option 1: AWS CLI configure
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"
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
```bash
# Password: "P@ss#word!"
# Encoded: "P%40ss%23word%21"
DATABASE_URL="postgresql://user:P%40ss%23word%21@host.rds.amazonaws.com:5432/valine?sslmode=require"
```

---

## Environment Configuration

### Required Environment Variables

All variables must be set in **BOTH** locations:
1. `serverless/.env.prod` (for build time / Prisma)
2. `serverless/serverless.yml` provider.environment (for Lambda runtime)

#### Core Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Authentication
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
ENABLE_REGISTRATION=false
STRICT_ALLOWLIST=0

# Application
NODE_ENV=production
STAGE=prod
API_BASE_URL=https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net

# Cookies
COOKIE_DOMAIN=.cloudfront.net

# Storage
MEDIA_BUCKET=valine-media-uploads

# Features (Production Defaults)
EMAIL_ENABLED=false
TWO_FACTOR_ENABLED=false
CSRF_ENABLED=false
RATE_LIMITING_ENABLED=true
OBSERVABILITY_ENABLED=true
ANALYTICS_ENABLED=false
MODERATION_ENABLED=false
REPORTS_ENABLED=true
```

### Generate Secure JWT Secret

```bash
# Option 1: OpenSSL (recommended)
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### S3 Bucket Name

**IMPORTANT**: Use `valine-frontend-prod`, NOT `project-valine-frontend-prod`

The correct frontend bucket is:
- **Production**: `valine-frontend-prod`
- **CloudFront Distribution**: `dkmxy676d3vgc.cloudfront.net`

---

## Build Process

### 1. Install Dependencies

```bash
cd serverless
npm ci --production
```

### 2. Build Prisma Layer

The Prisma layer contains the Prisma client and native binaries (~93MB compressed). It's shared across all Lambda functions to avoid exceeding the 250MB limit.

**Windows (PowerShell)**:
```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
```

**Linux/Mac (Bash)**:
```bash
cd serverless
./scripts/build-prisma-layer.sh
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

```bash
# Review pending migrations
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy
```

**IMPORTANT**: Always backup database before migrations!

```bash
# Backup users table
pg_dump -h <rds-hostname> -U <username> -d <database> -t users -f backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## One-Button Deploy

### Using Deploy Script (Recommended)

**Windows (PowerShell)**:
```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

**Linux/Mac (Bash)**:
```bash
cd serverless
./scripts/deploy.sh prod us-west-2
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

```bash
cd serverless

# 1. Validate configuration
serverless print | head -20

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

```bash
# Check authRouter function
aws lambda get-function-configuration \
  --function-name pv-api-prod-authRouter \
  --query 'Environment.Variables' \
  --output json | grep -E "JWT_SECRET|DATABASE_URL|ALLOWED_USER_EMAILS"

# Check profilesRouter function
aws lambda get-function-configuration \
  --function-name pv-api-prod-profilesRouter \
  --query 'Environment.Variables' \
  --output json | grep -E "JWT_SECRET|DATABASE_URL"

# Check getFeed function
aws lambda get-function-configuration \
  --function-name pv-api-prod-getFeed \
  --query 'Environment.Variables' \
  --output json | grep -E "JWT_SECRET|DATABASE_URL"
```

**Expected**: All functions should have:
- `JWT_SECRET` (same value across all)
- `DATABASE_URL` (same value across all)
- `ALLOWED_USER_EMAILS` (same value across all)
- `NODE_ENV=production`

### 2. Manual Smoke Tests

Test critical auth flow:

```bash
API_URL="https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
FRONTEND_ORIGIN="https://dkmxy676d3vgc.cloudfront.net"

# 1. Test login
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -d '{"email":"ghawk075@gmail.com","password":"YOUR_PASSWORD"}' \
  -c cookies.txt -v

# Expected: 200 OK, Set-Cookie headers for access_token and refresh_token

# 2. Test /auth/me (should work)
curl -X GET "$API_URL/auth/me" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -b cookies.txt -v

# Expected: 200 OK, user object returned

# 3. Test /me/profile (previously failing)
curl -X GET "$API_URL/me/profile" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -b cookies.txt -v

# Expected: 200 OK, profile object returned

# 4. Test /me/preferences (previously failing)
curl -X GET "$API_URL/me/preferences" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -b cookies.txt -v

# Expected: 200 OK, preferences object returned

# 5. Test /feed (previously failing)
curl -X GET "$API_URL/feed?limit=20" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -b cookies.txt -v

# Expected: 200 OK, posts array returned

# 6. Test /unread-counts (should still work)
curl -X GET "$API_URL/unread-counts" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -b cookies.txt -v

# Expected: 200 OK, notification/message counts
```

### 3. CloudWatch Logs Check

```bash
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

```bash
# List recent deployments
aws cloudformation describe-stack-events \
  --stack-name pv-api-prod \
  --max-items 20 \
  --query 'StackEvents[?ResourceType==`AWS::CloudFormation::Stack`].[Timestamp,ResourceStatus]' \
  --output table
```

### 2. Rollback Code

```bash
# Option A: Redeploy previous git commit
git checkout <previous-commit-sha>
cd serverless
serverless deploy --stage prod --region us-west-2 --force

# Option B: Use Serverless Framework rollback (if within same day)
serverless deploy --stage prod --region us-west-2 --force
```

### 3. Rollback Database (if migrations were applied)

```bash
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
```bash
# Check Lambda code includes the fix
aws lambda get-function --function-name pv-api-prod-profilesRouter \
  --query 'Code.Location' --output text | xargs curl -s | strings | grep "trimmedCookie"
```

### Issue 2: Missing Prisma Layer

**Symptoms**:
```
Error: Cannot find module '@prisma/client'
Runtime.ImportModuleError
```

**Fix**:
```bash
cd serverless
rm -rf layers/
.\scripts\build-prisma-layer.ps1  # Windows
./scripts/build-prisma-layer.sh    # Linux/Mac
serverless deploy --stage prod --region us-west-2 --force
```

### Issue 3: Environment Variable Mismatch

**Symptoms**: Some Lambdas work, others don't; inconsistent auth behavior

**Fix**:
```bash
# Verify all functions have same env vars
for func in authRouter profilesRouter getFeed getPreferences updatePreferences; do
  echo "=== $func ==="
  aws lambda get-function-configuration \
    --function-name "pv-api-prod-$func" \
    --query 'Environment.Variables.JWT_SECRET' \
    --output text
done
```

If different, redeploy with `--force` flag.

### Issue 4: Serverless Config Parse Error

**Symptoms**:
```
Invalid serverless.yml syntax
```

**Fix**:
```bash
# Validate YAML syntax
serverless print

# Check for tab characters (use spaces only)
grep -P '\t' serverless/serverless.yml

# Check for invalid environment variable references
grep '${env:' serverless/serverless.yml
```

### Issue 5: Database Connection Timeout

**Symptoms**:
```
Error: connect ETIMEDOUT
```

**Fix**:
1. Check RDS security group allows inbound from Lambda VPC
2. Verify DATABASE_URL has no spaces: `echo "$DATABASE_URL" | od -c`
3. Test connection from Lambda:
   ```bash
   aws lambda invoke --function-name pv-api-prod-health response.json
   cat response.json
   ```

### Issue 6: S3 Bucket Not Found (Frontend Deploy)

**Symptoms**: Frontend assets fail to upload

**Fix**: Use correct bucket name `valine-frontend-prod`:
```bash
# Check bucket exists
aws s3 ls s3://valine-frontend-prod

# If using wrong name, update deployment scripts
grep -r "project-valine-frontend-prod" . --exclude-dir=node_modules
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

```bash
# 1. Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# 2. Update Lambda env vars
aws lambda update-function-configuration \
  --function-name pv-api-prod-authRouter \
  --environment "Variables={JWT_SECRET=$NEW_JWT_SECRET,...}"

# 3. Update .env.prod (do NOT commit)
echo "JWT_SECRET=$NEW_JWT_SECRET" >> serverless/.env.prod

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

- Windows: `serverless/scripts/deploy.ps1`
- Linux/Mac: `serverless/scripts/deploy.sh`

### Useful AWS CLI Commands

```bash
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

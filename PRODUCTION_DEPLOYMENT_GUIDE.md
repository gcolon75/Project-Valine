# 🚀 Project Valine Production Deployment Guide
## Generated: 2025-11-24
## Based on: Repository analysis + PRs #255-#266 + Existing deployment infrastructure

This is the **definitive deployment guide** based on actual scripts, workflows, and patterns found in the repository.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Overview](#deployment-overview)
3. [Step 1: Prepare Prisma Layer](#step-1-prepare-prisma-layer)
4. [Step 2: Database Migrations](#step-2-database-migrations)
5. [Step 3: Deploy Backend (Lambda)](#step-3-deploy-backend-lambda)
6. [Step 4: Deploy Frontend (S3/CloudFront)](#step-4-deploy-frontend-s3cloudfront)
7. [Step 5: Create Production User Account](#step-5-create-production-user-account)
8. [Step 6: Verify Deployment](#step-6-verify-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedure](#rollback-procedure)
11. [GitHub Actions Automated Deployment](#github-actions-automated-deployment)

---

## Pre-Deployment Checklist

### Required Environment Variables

Set these environment variables before deployment:

```bash
# Database Connection (REQUIRED)
export DATABASE_URL="postgresql://ValineColon_75:PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# JWT Secret (REQUIRED - Generate new for production!)
export JWT_SECRET="$(openssl rand -base64 32)"

# AWS Configuration
export AWS_REGION="us-west-2"
export STAGE="prod"

# Allowlist Configuration
export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"
export ENABLE_REGISTRATION="false"

# Frontend Configuration
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
export FRONTEND_URL="https://dkmxy676d3vgc.cloudfront.net"
export S3_BUCKET="your-s3-bucket-name"
export CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"
```

### Required Tools

Ensure these tools are installed:

```bash
# Check Node.js (v20+)
node -v

# Check npm
npm -v

# Check AWS CLI
aws --version

# Check Serverless Framework (v3)
serverless -v

# If Serverless not installed:
npm i -g serverless@3
```

### AWS Credentials

Configure AWS credentials with permissions for:
- Lambda deployment
- API Gateway
- CloudFormation
- S3 (deployment artifacts + frontend hosting)
- CloudFront (invalidation)
- CloudWatch Logs

```bash
# Option 1: AWS CLI configure
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Option 3: AWS Profile
export AWS_PROFILE="project-valine"
```

### Security Checklist

- [ ] Generate NEW JWT_SECRET for production (never use dev secret!)
- [ ] Rotate database password if using default
- [ ] Update `ALLOWED_USER_EMAILS` with production email addresses
- [ ] Ensure `ENABLE_REGISTRATION="false"` for allowlist mode
- [ ] Verify database has SSL enabled (`sslmode=require` in DATABASE_URL)
- [ ] Database backup completed before migration

### Pre-Flight Verification

```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT version();"

# Test AWS credentials
aws sts get-caller-identity

# Verify serverless installation
serverless --version
```

---

## Deployment Overview

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Stack                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (CloudFront + S3)                                     │
│  https://dkmxy676d3vgc.cloudfront.net                          │
│                         │                                        │
│                         ▼                                        │
│  Backend (API Gateway + Lambda)                                 │
│  https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com        │
│                         │                                        │
│                         ▼                                        │
│  Database (RDS PostgreSQL)                                      │
│  project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Order

**CRITICAL: Deploy in this exact order:**

1. **Prisma Layer** - Build Lambda layer with database client
2. **Database Migrations** - Apply schema changes BEFORE code
3. **Backend** - Deploy Lambda functions with new code
4. **Frontend** - Build and deploy to S3/CloudFront
5. **User Account** - Create production admin account
6. **Verification** - Test all endpoints and flows

**Why this order?**
- Database migrations MUST happen before backend deployment
- Backend API must be deployed before frontend (VITE_API_BASE dependency)
- User account creation requires database schema + backend API

---

## Step 1: Prepare Prisma Layer

### Background

The Prisma layer contains the database client and Lambda-compatible binary. It's ~93MB and NOT committed to git.

### Location of Build Script

```bash
serverless/build-prisma-layer.sh
```

### Check if Layer Already Exists

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# Check if layer directory exists
ls -lh layers/

# Expected output:
# drwxrwxr-x 3 runner runner 4.0K Nov 24 19:49 prisma-layer
```

### Build Prisma Layer

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# Run build script
./build-prisma-layer.sh
```

**Expected output:**
```
=========================================
Building Prisma Lambda Layer
=========================================

Cleaning up previous build artifacts...
Generating Prisma client with Lambda binaries...
Copying Prisma client to layer build directory...
✓ Layer optimized - only Lambda runtime (rhel) binary included

Verifying Lambda binary is present...
✓ Lambda binary found: libquery_engine-rhel-openssl-3.0.x.so.node
  Size: 17M

Creating layer zip file...

=========================================
✓ Prisma layer built successfully!
=========================================
Layer location: layers/prisma-layer.zip
Layer size: 93M

Next steps:
  1. Deploy with: npx serverless deploy --stage prod --region us-west-2
```

### When to Rebuild

Rebuild the layer when:
- First time setup
- Prisma schema changes (new models, fields)
- Upgrading Prisma version
- After `npm ci` or dependency updates

### Troubleshooting Layer Build

**Error: "prisma command not found"**
```bash
cd ../api
npm ci
cd ../serverless
./build-prisma-layer.sh
```

**Error: "Layer too large"**
- This is normal - layer is ~93MB
- Lambda supports up to 250MB uncompressed
- Layer deploys separately from function code

---

## Step 2: Database Migrations

### Background

Database migrations add/modify schema. They MUST run BEFORE deploying code that expects new schema.

### Current Migration Status

Check what migrations exist:

```bash
cd /home/runner/work/Project-Valine/Project-Valine/api

# List migrations
ls -la prisma/migrations/
```

### Apply Migrations to Production

```bash
cd /home/runner/work/Project-Valine/Project-Valine/api

# Ensure DATABASE_URL is set
echo $DATABASE_URL

# Generate Prisma client (if not already done)
npx prisma generate

# Apply all pending migrations
npx prisma migrate deploy
```

**Expected output:**
```
Applying migration `20251121203439_add_onboarding_complete`
Applying migration `20251121235650_add_missing_user_fields`
...

Database is now in sync with Prisma schema
```

### Verify Migration Status

```bash
cd /home/runner/work/Project-Valine/Project-Valine/api

# Check migration status
npx prisma migrate status
```

**Expected output:**
```
✅ All migrations have been applied.
```

### Verify Schema in Database

```bash
# Connect to database
psql "$DATABASE_URL"

# Check users table has required columns
\d users

# Expected columns should include:
# - id
# - email
# - username
# - passwordHash
# - displayName
# - status
# - theme
# - onboardingComplete
# - createdAt
# - updatedAt

# Exit psql
\q
```

### Rollback Migration (If Needed)

**CAUTION: Only if deployment fails and you need to rollback**

```bash
cd /home/runner/work/Project-Valine/Project-Valine/api

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Manually revert schema changes with SQL
psql "$DATABASE_URL" -c "ALTER TABLE users DROP COLUMN IF EXISTS status;"
```

---

## Step 3: Deploy Backend (Lambda)

### Deployment Methods

#### Method A: Using GitHub Actions (Recommended)

**Automatic on push to main:**

```bash
# Commit and push to main branch
git add .
git commit -m "Deploy backend to production"
git push origin main
```

GitHub Actions workflow (`.github/workflows/backend-deploy.yml`) will:
1. Install dependencies
2. Generate Prisma client
3. Deploy to AWS Lambda
4. Show deployment summary

**Manual trigger via GitHub Actions:**

1. Go to: https://github.com/gcolon75/Project-Valine/actions
2. Select "Backend Deploy" workflow
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

#### Method B: Using Deployment Script

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# Run deployment script
./deploy.sh
```

This script:
1. Validates configuration (`validate-config.sh`)
2. Loads environment from `.env.prod` if it exists
3. Deploys to AWS with `serverless deploy --stage prod --region us-west-2`

#### Method C: Manual Deployment

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# Install dependencies (if not already done)
npm ci

# Generate Prisma client
npx prisma generate

# Deploy to AWS
npx serverless deploy --stage prod --region us-west-2 --verbose
```

### Expected Output

```
Deploying pv-api to stage prod (us-west-2)

✔ Service deployed to stack pv-api-prod (112s)

endpoints:
  GET - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health
  POST - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register
  POST - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login
  GET - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/me
  ...

functions:
  health: pv-api-prod-health (2.1 MB)
  register: pv-api-prod-register (2.1 MB)
  login: pv-api-prod-login (2.1 MB)
  ...

layers:
  prisma: arn:aws:lambda:us-west-2:579939802800:layer:pv-api-prod-prisma:X
```

### Verify Backend Deployment

```bash
# Test health endpoint
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health

# Expected response:
# {"status":"ok","secretsStatus":{...}}
```

### Troubleshooting Backend Deployment

**Error: "Layer artifact not found"**
- Run: `./build-prisma-layer.sh` in `serverless/` directory

**Error: "Environment variable DATABASE_URL not set"**
- Set: `export DATABASE_URL="postgresql://..."`
- Or create: `serverless/.env.prod` with DATABASE_URL

**Error: "PrismaClientInitializationError"**
- Layer not deployed correctly
- Rebuild layer: `./build-prisma-layer.sh`
- Redeploy: `npx serverless deploy --stage prod --region us-west-2`

---

## Step 4: Deploy Frontend (S3/CloudFront)

### Deployment Methods

#### Method A: Using GitHub Actions (Recommended)

**Automatic on push to main:**

```bash
# Commit and push to main branch
git add .
git commit -m "Deploy frontend to production"
git push origin main
```

GitHub Actions workflow (`.github/workflows/client-deploy.yml`) will:
1. Build frontend with production VITE_API_BASE
2. Upload to S3 bucket
3. Invalidate CloudFront cache
4. Notify Discord (optional)

**Manual trigger via GitHub Actions:**

1. Go to: https://github.com/gcolon75/Project-Valine/actions
2. Select "Client Deploy" workflow
3. Click "Run workflow"
4. Optionally override VITE_API_BASE
5. Click "Run workflow"

**Required GitHub Secrets:**
- `VITE_API_BASE` - API Gateway URL
- `S3_BUCKET` - S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID

#### Method B: Using Deployment Script

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Set environment variables
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
export S3_BUCKET="your-s3-bucket"
export CLOUDFRONT_DISTRIBUTION_ID="your-dist-id"

# Run deployment script
node scripts/deploy-frontend.js --bucket "$S3_BUCKET" --distribution "$CLOUDFRONT_DISTRIBUTION_ID"
```

This script:
1. Runs `npm ci` (if needed)
2. Runs `npm run build`
3. Generates SRI hashes
4. Verifies SRI hashes (aborts if mismatch)
5. Uploads files to S3 with correct MIME types and cache headers
6. Retains previous bundles for 7 days (configurable)
7. Invalidates CloudFront cache
8. Generates deployment report

#### Method C: Manual Deployment

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Set API base URL
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"

# Install dependencies (if needed)
npm ci

# Build frontend
npm run build

# Upload to S3 (assets with caching)
aws s3 sync dist "s3://your-s3-bucket" \
  --delete \
  --cache-control "public, max-age=300" \
  --exclude "*.html"

# Upload HTML files (no cache)
aws s3 sync dist "s3://your-s3-bucket" \
  --exclude "*" --include "*.html" \
  --cache-control "no-cache"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id "your-dist-id" \
  --paths "/*"
```

### Expected Output

```
========================================
Frontend Deployment Script
========================================
Retention Policy: 7 days

✓ S3 Bucket: your-s3-bucket
✓ CloudFront Distribution: E1234567890ABC

Step 1: Building frontend...
✓ Build completed
✓ SRI hashes generated
✓ SRI verification passed

Step 2: Parsing index.html for bundles...
✓ Module bundle: /assets/index-abc123.js
✓ Main CSS: /assets/index-def456.css

Step 3: Checking existing bundles in S3...
Found 3 existing bundle(s) in S3

Step 4: Uploading files to S3...
  ✓ index.html (text/html; charset=utf-8, no-cache)
  ✓ assets/index-abc123.js (application/javascript, immutable)
  ✓ assets/index-def456.css (text/css, immutable)
  ...
✓ Upload completed

Step 5: Pruning old bundles (retention: 7 days)...
  → Keeping current bundle: assets/index-abc123.js
  → Keeping bundle: assets/index-old1.js (age: 2 days)
  ✗ Deleting old bundle: assets/index-old2.js (age: 9 days)
✓ Pruned 1 old bundle(s)

Step 6: Invalidating CloudFront cache...
✓ CloudFront invalidation created

Step 7: Generating deployment report...
✓ Deployment report: deploy-report.json

========================================
Deployment completed successfully!
========================================
```

### Verify Frontend Deployment

```bash
# Visit frontend URL
curl -I https://dkmxy676d3vgc.cloudfront.net

# Should return HTTP 200 OK

# Visit in browser
open https://dkmxy676d3vgc.cloudfront.net
```

### Troubleshooting Frontend Deployment

**Error: "VITE_API_BASE is required"**
- Set: `export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"`

**Error: "S3 bucket not found"**
- Verify bucket name: `aws s3 ls`
- Check AWS credentials

**Error: "SRI verification failed"**
- This prevents deploying with mismatched integrity hashes
- Fix: Ensure build completes before SRI generation
- Or skip build: `--skip-build` (not recommended for production)

**CORS Errors in Browser Console**
- Backend `serverless.yml` must allow frontend origin
- Check `httpApi.cors.allowedOrigins` includes CloudFront URL

---

## Step 5: Create Production User Account

### Background

After backend and database are deployed, create admin user account(s) for production access.

### Method A: Using Complete Schema Fix Script (Recommended)

This script checks database, adds missing columns, and creates user account:

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Set DATABASE_URL
export DATABASE_URL="postgresql://ValineColon_75:PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Run script
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "YourProductionPassword123!" \
  --display-name "Gabriel Colon"
```

**Expected output:**
```
═══════════════════════════════════════════════════════════════════
Complete Database Schema Fix & User Account Setup
═══════════════════════════════════════════════════════════════════

Step 1: Testing Database Connection...
✅ Database connection successful

Step 2: Checking User Table Schema...
✅ Column 'onboardingComplete' exists
✅ Column 'status' exists
✅ Column 'theme' exists
✅ All required columns exist!

Step 3: Regenerating Prisma Clients...
✅ Prisma client regenerated in api/
✅ Prisma client regenerated in serverless/

Step 4: Creating User Account...
✅ User account created successfully!
   User ID: abc-123-def-456
   Username: ghawk075
   Email: ghawk075@gmail.com

Step 5: Creating User Profile...
✅ Profile created successfully!
   Profile ID: xyz-789-uvw-012
   Vanity URL: ghawk075

✅ Setup complete! You can now log in with your credentials.
```

### Method B: Using Admin Password Setter

If user already exists, just reset password:

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run script
node scripts/admin-set-password.mjs "ghawk075@gmail.com" "NewPassword123!"
```

### Method C: Using Admin Upsert User

Create or update user with all fields:

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run script
node scripts/admin-upsert-user.mjs \
  --email "ghawk075@gmail.com" \
  --password "Password123!" \
  --display-name "Gabriel Colon"
```

### Verify User Creation

```bash
# Test login via API
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "YourProductionPassword123!"
  }'

# Expected response: HTTP 200 with Set-Cookie headers
```

---

## Step 6: Verify Deployment

### Automated Verification Script

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Set environment variables
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
export FRONTEND_URL="https://dkmxy676d3vgc.cloudfront.net"

# Run verification script
node scripts/verify-production-deployment.mjs
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════════════╗
║       Production Deployment Verification                          ║
╚════════════════════════════════════════════════════════════════════╝

🔍 Checking API Health...
✅ API Health: ok
   Secrets Status: {
     "jwtSecretValid": true,
     "databaseConnected": true
   }

🔍 Testing Login Endpoint...
⚠️  Login failed (expected for test credentials): Invalid credentials

🔍 Checking Frontend...
✅ Frontend is accessible
   URL: https://dkmxy676d3vgc.cloudfront.net

╔════════════════════════════════════════════════════════════════════╗
║       Summary                                                      ║
╚════════════════════════════════════════════════════════════════════╝

✅ All checks passed - production is healthy
```

### Manual Verification Steps

#### 1. API Health Check

```bash
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health
```

Expected:
```json
{
  "status": "ok",
  "secretsStatus": {
    "jwtSecretValid": true,
    "databaseConnected": true
  }
}
```

#### 2. Test Registration (Allowlisted Email)

```bash
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "username": "gcolon",
    "password": "TestPassword123!",
    "displayName": "Gabriel Colon"
  }'
```

Expected: HTTP 201 Created (if email not already registered)

#### 3. Test Registration (Non-Allowlisted Email)

```bash
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@evil.com",
    "username": "hacker",
    "password": "Test123!",
    "displayName": "Hacker"
  }'
```

Expected: HTTP 403 Forbidden
```json
{
  "error": "Registration not permitted"
}
```

#### 4. Test Login

```bash
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "YourProductionPassword123!"
  }'
```

Expected: HTTP 200 OK with Set-Cookie headers

#### 5. Test Frontend

Open browser and visit:
```
https://dkmxy676d3vgc.cloudfront.net
```

Verify:
- [ ] Page loads without errors
- [ ] No console errors (check DevTools)
- [ ] Login form appears
- [ ] Can login with production credentials
- [ ] Redirects to dashboard after login

### CloudWatch Logs

Check Lambda logs for errors:

```bash
# Health check function
aws logs tail /aws/lambda/pv-api-prod-health --region us-west-2 --since 10m

# Register function
aws logs tail /aws/lambda/pv-api-prod-register --region us-west-2 --since 10m

# Login function
aws logs tail /aws/lambda/pv-api-prod-login --region us-west-2 --since 10m

# Follow logs live
aws logs tail /aws/lambda/pv-api-prod-health --region us-west-2 --follow
```

---

## Troubleshooting

### Issue 1: API Returns 502/503 Errors

**Symptoms:**
- API health check fails
- Lambda timeout errors in CloudWatch

**Diagnosis:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/pv-api-prod-health --region us-west-2 --since 30m

# Check Lambda configuration
aws lambda get-function-configuration \
  --function-name pv-api-prod-health \
  --region us-west-2
```

**Common Causes:**
1. Database connection failed (wrong DATABASE_URL)
2. Prisma client not generated (missing layer)
3. Timeout (increase Lambda timeout in serverless.yml)

**Fix:**
```bash
# Verify environment variables
aws lambda get-function-configuration \
  --function-name pv-api-prod-register \
  --region us-west-2 \
  --query 'Environment.Variables'

# Redeploy with correct env vars
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

### Issue 2: CORS Errors in Frontend

**Symptoms:**
```
Access to fetch at 'https://api...' from origin 'https://cloudfront...' 
has been blocked by CORS policy
```

**Fix:**

Edit `serverless/serverless.yml`:
```yaml
provider:
  httpApi:
    cors:
      allowedOrigins:
        - https://dkmxy676d3vgc.cloudfront.net  # Add your CloudFront URL
```

Redeploy:
```bash
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

### Issue 3: Frontend Shows Old Version

**Symptoms:**
- Deployed new code but frontend still shows old version
- No changes visible in browser

**Fix:**
```bash
# Clear CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id "your-dist-id" \
  --paths "/*"

# Wait 1-2 minutes, then test in private/incognito window
```

### Issue 4: Database Migration Failed

**Symptoms:**
```
Migration ... failed to apply
Error: column already exists
```

**Fix:**
```bash
cd api

# Check migration status
npx prisma migrate status

# If migration already applied, mark as resolved
npx prisma migrate resolve --applied MIGRATION_NAME

# If migration partially applied, mark as rolled back and reapply
npx prisma migrate resolve --rolled-back MIGRATION_NAME
npx prisma migrate deploy
```

### Issue 5: User Account Creation Fails

**Symptoms:**
```
Error: Unknown argument `status` provided to User.create()
```

**Cause:** Database missing required columns

**Fix:**
```bash
# Run complete schema fix script
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "Password123!" \
  --display-name "Gabriel Colon"
```

### Issue 6: JWT Secret Invalid in Production

**Symptoms:**
```json
{
  "error": "SECURITY ERROR: Default JWT_SECRET must not be used in production"
}
```

**Fix:**
```bash
# Generate new secure JWT secret
export JWT_SECRET="$(openssl rand -base64 32)"

# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name pv-api-prod-login \
  --region us-west-2 \
  --environment Variables="{JWT_SECRET=$JWT_SECRET,...}"

# Or redeploy with new secret
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

---

## Rollback Procedure

### Rollback Backend (Lambda)

#### Option 1: Via Serverless Framework

```bash
cd serverless

# List deployments
serverless deploy list --stage prod --region us-west-2

# Rollback to specific timestamp
serverless rollback --timestamp TIMESTAMP --stage prod --region us-west-2
```

#### Option 2: Via AWS Console

1. Go to AWS Lambda Console
2. Find function (e.g., `pv-api-prod-register`)
3. Go to "Versions" tab
4. Find previous working version
5. Update alias to point to that version

#### Option 3: Redeploy Previous Version

```bash
# Checkout previous commit
git checkout PREVIOUS_COMMIT_SHA

# Redeploy
cd serverless
npx serverless deploy --stage prod --region us-west-2

# Return to current
git checkout main
```

### Rollback Frontend (S3/CloudFront)

#### Option 1: Redeploy Previous Version

```bash
# Checkout previous commit
git checkout PREVIOUS_COMMIT_SHA

# Build and deploy
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
npm run build
aws s3 sync dist "s3://your-bucket" --delete
aws cloudfront create-invalidation --distribution-id "your-dist-id" --paths "/*"

# Return to current
git checkout main
```

#### Option 2: Restore from S3 Versioning

If S3 bucket has versioning enabled:

```bash
# List object versions
aws s3api list-object-versions \
  --bucket "your-bucket" \
  --prefix "index.html"

# Restore specific version
aws s3api copy-object \
  --bucket "your-bucket" \
  --copy-source "your-bucket/index.html?versionId=VERSION_ID" \
  --key "index.html"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id "your-dist-id" \
  --paths "/*"
```

### Rollback Database Migration

**⚠️ CAUTION: Only if absolutely necessary**

```bash
cd api

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Manually revert schema changes
psql "$DATABASE_URL" -c "ALTER TABLE users DROP COLUMN IF EXISTS status;"

# Or restore from database backup
# (Requires pre-deployment backup)
```

---

## GitHub Actions Automated Deployment

### Setup GitHub Secrets

Required secrets in GitHub repository settings:

#### Backend Deployment Secrets

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `ALLOWED_USER_EMAILS` - Comma-separated email allowlist

#### Frontend Deployment Secrets

- `VITE_API_BASE` - API Gateway URL
- `S3_BUCKET` - S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID
- `FRONTEND_URL` - CloudFront domain (optional)

### Automatic Deployment on Push

When you push to `main` branch:

1. Both `backend-deploy.yml` and `client-deploy.yml` trigger
2. Backend deploys first (typically faster)
3. Frontend builds with VITE_API_BASE from secrets
4. Frontend deploys to S3 and invalidates CloudFront

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions will:
# 1. Run CI checks
# 2. Deploy backend (if serverless/ changed)
# 3. Deploy frontend (if frontend code changed)
```

### Manual Deployment via GitHub Actions

#### Backend Deployment

1. Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/backend-deploy.yml
2. Click "Run workflow"
3. Select branch: `main`
4. Click "Run workflow"

#### Frontend Deployment

1. Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/client-deploy.yml
2. Click "Run workflow"
3. Optionally override `VITE_API_BASE`
4. Click "Run workflow"

### Monitoring GitHub Actions Deployments

```bash
# View workflow runs
gh run list --workflow=backend-deploy.yml

# View specific run
gh run view RUN_ID

# Watch run in progress
gh run watch RUN_ID
```

---

## Quick Reference - Complete Deployment

### Full Production Deployment (All Steps)

```bash
#!/bin/bash
# Complete production deployment script

# Step 0: Set environment variables
export DATABASE_URL="postgresql://ValineColon_75:PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
export JWT_SECRET="$(openssl rand -base64 32)"
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
export S3_BUCKET="your-s3-bucket"
export CLOUDFRONT_DISTRIBUTION_ID="your-dist-id"

# Step 1: Build Prisma Layer
cd serverless
./build-prisma-layer.sh
cd ..

# Step 2: Apply Database Migrations
cd api
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
cd ..

# Step 3: Deploy Backend
cd serverless
npx serverless deploy --stage prod --region us-west-2
cd ..

# Step 4: Deploy Frontend
npm ci
npm run build
aws s3 sync dist "s3://$S3_BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"

# Step 5: Create User Account
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "YourProductionPassword123!" \
  --display-name "Gabriel Colon"

# Step 6: Verify Deployment
export FRONTEND_URL="https://dkmxy676d3vgc.cloudfront.net"
node scripts/verify-production-deployment.mjs

echo "✅ Production deployment complete!"
```

### Minimal Deployment (Code Changes Only)

If database schema hasn't changed and layer already built:

```bash
# Backend only
cd serverless
npx serverless deploy --stage prod --region us-west-2

# Frontend only
export VITE_API_BASE="https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
npm run build
aws s3 sync dist "s3://$S3_BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"
```

---

## Summary

### Production Endpoints

- **API Gateway:** https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
- **Frontend (CloudFront):** https://dkmxy676d3vgc.cloudfront.net
- **Database:** project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432

### Key Scripts

- **Build Prisma Layer:** `serverless/build-prisma-layer.sh`
- **Deploy Backend:** `serverless/deploy.sh` or GitHub Actions
- **Deploy Frontend:** `scripts/deploy-frontend.js` or GitHub Actions
- **Create User:** `fix-user-schema-complete.mjs`
- **Verify Deployment:** `scripts/verify-production-deployment.mjs`

### Important Files

- **Backend Config:** `serverless/serverless.yml`
- **Environment Example:** `serverless/.env.example`
- **Frontend Config:** `.env.example`
- **Prisma Schema:** `api/prisma/schema.prisma`
- **Migrations:** `api/prisma/migrations/`

### Deployment Checklist

- [ ] Generate new JWT_SECRET for production
- [ ] Update DATABASE_URL with production password
- [ ] Set ALLOWED_USER_EMAILS
- [ ] Build Prisma layer (`./build-prisma-layer.sh`)
- [ ] Apply database migrations (`npx prisma migrate deploy`)
- [ ] Deploy backend (`npx serverless deploy`)
- [ ] Deploy frontend (GitHub Actions or script)
- [ ] Create admin user account
- [ ] Verify health endpoint
- [ ] Test login flow
- [ ] Check CloudWatch logs
- [ ] Monitor for 15-30 minutes

---

**Questions or Issues?**

- Check [Troubleshooting](#troubleshooting) section
- Review CloudWatch logs
- Check [PRODUCTION_ACCOUNT_SETUP.md](./PRODUCTION_ACCOUNT_SETUP.md)
- Check [MIGRATION_DEPLOYMENT_GUIDE.md](./MIGRATION_DEPLOYMENT_GUIDE.md)
- See deployment scripts in `scripts/deployment/`

**Last Updated:** 2025-11-24  
**Repository:** https://github.com/gcolon75/Project-Valine

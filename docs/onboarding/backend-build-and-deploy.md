# Backend Build and Deploy

This guide summarizes the backend deployment process using Serverless Framework. For complete details, see the **[Backend Deployment Guide (Canonical)](../BACKEND-DEPLOYMENT.md)**.

All commands use **PowerShell only**.

## Overview

The backend is a **Serverless Framework 3** application deployed to AWS Lambda with:
- **Runtime:** Node.js 20.x
- **Database:** PostgreSQL (AWS RDS) via Prisma ORM
- **API Gateway:** AWS API Gateway HTTP API (v2)
- **Canonical Location:** `/serverless` directory

**Key Architecture Decision:** Prisma client and native binaries are deployed as a **Lambda Layer** (not bundled per-function) to keep function sizes small and deployments fast (~1 minute vs ~15 minutes).

See the [Backend Deployment Guide](../BACKEND-DEPLOYMENT.md#prisma-lambda-layer) for complete layer documentation.

## Prerequisites

### Required Tools

- Node.js 20.x
- npm 10.x or later
- AWS CLI configured with credentials
- PowerShell 5.1+ or PowerShell Core 7+

**Optional:**
- Serverless Framework CLI: `npm install -g serverless` (can also use `npx serverless`)

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (NO SPACES) | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | JWT signing secret (32+ characters) | `your-32-character-secret-here` |
| `AWS_REGION` | AWS region for deployment | `us-west-2` |
| `STAGE` | Deployment stage | `prod` or `staging` |

**Production Database URL Example:**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

⚠️ **Important:** Special characters in passwords must be URL-encoded (e.g., `@` → `%40`, `#` → `%23`).

## Prisma Lambda Layer Concept

**Why Use a Layer?**

Prisma client and native query engine binaries are large (~20-30MB compressed). Including them in every Lambda function would:
- Exceed AWS Lambda's 250MB unzipped limit
- Make deployments slow (15-17 minutes vs ~1 minute)
- Waste storage and bandwidth

**Layer Strategy:**

The Prisma artifacts are deployed once as a Lambda Layer and selectively attached only to functions that access the database.

**Functions WITH Prisma layer:**
- Auth functions (register, login, me, verify, 2FA, etc.)
- Profile, Post, Reel, Script handlers
- Conversations, Notifications, Connections
- All database-accessing handlers

**Functions WITHOUT Prisma layer:**
- `/health` - Health check (no DB)
- `/meta` - API metadata (no DB)

See the [Backend Deployment Guide - Prisma Lambda Layer](../BACKEND-DEPLOYMENT.md#prisma-lambda-layer) for complete details.

## Deployment Steps (PowerShell)

### Step 1: Set Environment Variables

```powershell
# Navigate to the project root
cd C:\path\to\Project-Valine

# Set required environment variables
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
$env:JWT_SECRET = "your-32-character-jwt-secret-here"
$env:AWS_REGION = "us-west-2"
$env:STAGE = "prod"
```

### Step 2: Install Dependencies

```powershell
# Navigate to serverless directory
cd serverless

# Install dependencies (uses package-lock.json for reproducible builds)
npm ci
```

### Step 3: Generate Prisma Client

```powershell
# Generate Prisma client for Node.js runtime
npx prisma generate --schema=..\api\prisma\schema.prisma
```

**What This Does:**
- Reads schema from `api/prisma/schema.prisma`
- Generates TypeScript type-safe client in `node_modules/@prisma/client`
- Downloads native query engine binary for AWS Lambda (rhel-openssl-3.0.x)

### Step 4: Build Prisma Lambda Layer

```powershell
# Run the layer build script
.\scripts\build-prisma-layer.ps1
```

**What This Script Does:**
1. Creates `layers/nodejs/node_modules/` directory structure
2. Copies minimal Prisma client runtime files (JS only, no WASM/tests/docs)
3. Copies generated `.prisma/client/` files
4. Includes ONLY the Lambda binary (`libquery_engine-rhel-openssl-3.0.x.so.node`)
5. Excludes non-Lambda binaries (Windows, macOS, ARM64, musl)
6. Creates `layers/prisma-layer.zip` (~15-25 MB compressed)
7. Validates uncompressed size < 150MB

**Verify Layer Creation:**
```powershell
# Check the layer file exists
Get-ChildItem .\layers\prisma-layer.zip

# Expected: ~15-25 MB file
```

### Step 5: Deploy to AWS

```powershell
# Deploy with Serverless Framework
npx serverless deploy --stage prod --region us-west-2 --verbose
```

**Expected Output:**
```
Deploying pv-api to stage prod (us-west-2)

✔ Service deployed to stack pv-api-prod (112s)

endpoints:
  GET - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health
  ANY - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/{proxy+}

functions:
  api: pv-api-prod-api (250 kB)

layers:
  prisma: arn:aws:lambda:us-west-2:579939802800:layer:pv-api-prod-prisma:X
```

**Deployment Time:** ~1-2 minutes (with layer) vs ~15-17 minutes (without layer)

### Step 6: Verify Deployment

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health" -Method GET

# Test auth diagnostics
Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/diag" -Method GET
```

**Expected Health Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "environment": "production"
}
```

## When to Rebuild the Layer

Rebuild the Prisma layer when:
- ✅ First time setup (fresh clone)
- ✅ Prisma schema changes (`api/prisma/schema.prisma`)
- ✅ Prisma version upgrade in `package.json`
- ✅ After `npm ci` or dependency updates
- ❌ NOT needed for function code changes (deploy only)

## Packaging and Debugging

### Package Without Deploying

To inspect artifacts without deploying:

```powershell
# Clean previous artifacts
Remove-Item -Recurse -Force .serverless -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .esbuild -ErrorAction SilentlyContinue

# Package
npx serverless package --stage prod --region us-west-2 --verbose

# Check function zip sizes
Get-ChildItem .serverless\*.zip | `
    Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB, 2)}}
```

**Expected Result:**
- Each function zip: **< 1 MB** (handler code only, no Prisma)
- Layer zip: **15-25 MB** (Prisma client + native binary)

See the [Backend Deployment Guide - Packaging and Debugging](../BACKEND-DEPLOYMENT.md#packaging-and-debugging) for validation commands.

### Check Layer Attachment

After deployment, verify the Prisma layer is attached to database-accessing functions:

```powershell
# Check a specific function
aws lambda get-function-configuration `
    --function-name pv-api-prod-me `
    --region us-west-2 `
    --query "Layers[].Arn"
```

**Expected Output:**
```json
["arn:aws:lambda:us-west-2:579939802800:layer:pv-api-prod-prisma:X"]
```

## Database Migrations

**Important:** Run migrations AFTER backend deployment to ensure database schema matches code.

```powershell
# Navigate to api directory
cd ..\api

# Check migration status
npx prisma migrate status

# Deploy migrations to production (CAUTION: This modifies the database)
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
npx prisma migrate deploy
```

**Migration Rollback:**

If a migration fails, see the migration's `ROLLBACK.md` file for rollback instructions:
```powershell
# Example rollback path
cat .\prisma\migrations\<migration-name>\ROLLBACK.md
```

See the [Backend Deployment Guide - Database Migrations](../BACKEND-DEPLOYMENT.md#database-migrations) for complete migration procedures.

## CI/CD (GitHub Actions)

The backend deployment is automated via GitHub Actions in `.github/workflows/backend-deploy.yml`.

**Workflow Steps:**
1. Checkout repository
2. Configure AWS credentials via OIDC
3. Install dependencies (`npm ci`)
4. Generate Prisma client
5. Build Prisma Lambda Layer
6. Deploy via Serverless Framework
7. Run database migrations (if needed)

**Required GitHub Secrets:**
- `DATABASE_URL` - Production database connection string
- `JWT_SECRET` - JWT signing secret

**Manual Trigger:**
- Go to **Actions → Backend Deploy → Run workflow**

See the [CI/CD Overview](ci-cd-overview.md) for complete workflow documentation.

## Common Pitfalls and Solutions

### 1. Lambda Size Limit Error

**Error:** `Unzipped size must be smaller than 262144000 bytes`

**Cause:** Prisma is being bundled per-function instead of via the layer

**Solution:** Ensure `serverless.yml` configuration:
- Layer defined at root level: `layers: [{ Ref: PrismaV2LambdaLayer }]`
- Functions exclude Prisma: `custom.esbuild.exclude` contains `@prisma/client`, `.prisma/*`
- Validation: Run `.\scripts\validate-layers.ps1` (PowerShell) to check for duplicate layers

See the [Backend Deployment Guide - Common Pitfalls](../BACKEND-DEPLOYMENT.md#common-pitfalls) for complete troubleshooting.

### 2. Prisma Not Generated

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```powershell
npx prisma generate --schema=..\api\prisma\schema.prisma
```

### 3. Database Unavailable (503)

**Symptoms:** Endpoints return `503 Database unavailable`

**Possible Causes:**
- `DATABASE_URL` not set or has spaces
- RDS security group blocks Lambda
- Prisma native binary missing from layer

**Debug Steps:**
1. Check Lambda environment variables in AWS Console
2. Verify RDS security group allows Lambda VPC (if using VPC)
3. Check CloudWatch logs for Prisma initialization errors

### 4. CloudFormation DELETE_FAILED State

**Symptoms:** Deployment fails, stack shows `DELETE_FAILED` status

**Solution:**
```powershell
# Run recovery script
.\scripts\recover-failed-stack.ps1 pv-api-prod us-west-2

# Or force delete stack manually
aws cloudformation delete-stack --stack-name pv-api-prod --region us-west-2

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name pv-api-prod --region us-west-2

# Rebuild layer and deploy
.\scripts\build-prisma-layer.ps1
npx serverless deploy --stage prod --region us-west-2
```

See the [Backend Deployment Guide - CloudFormation DELETE_FAILED](../BACKEND-DEPLOYMENT.md#5-cloudformation-delete_failed-state) for detailed recovery steps.

## Production Endpoints

| Endpoint | URL |
|----------|-----|
| API Base | `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com` |
| Health Check | `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health` |
| Auth Diagnostics | `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/diag` |

## Quick Reference Commands

```powershell
# Full deployment from scratch
cd serverless
$env:DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"
$env:JWT_SECRET = "your-jwt-secret"
npm ci
npx prisma generate --schema=..\api\prisma\schema.prisma
.\scripts\build-prisma-layer.ps1
npx serverless deploy --stage prod --region us-west-2

# Package only (no deploy)
npx serverless package --stage prod --region us-west-2 --verbose

# Check zip sizes
Get-ChildItem .serverless\*.zip | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB, 2)}}

# View logs for a function
npx serverless logs -f api --stage prod --region us-west-2 --tail

# Remove stack (DANGEROUS - deletes everything)
npx serverless remove --stage prod --region us-west-2
```

## Next Steps

- **[CI/CD Overview](ci-cd-overview.md)** - Understand automated workflows
- **[Backend Deployment Guide (Canonical)](../BACKEND-DEPLOYMENT.md)** - Complete backend deployment documentation
- **[Troubleshooting Runbook](../backend/troubleshooting-auth-profile-posts.md)** - Debug auth, profiles, posts, feed, connections

## Additional Resources

- **[Backend Deployment Guide (Canonical)](../BACKEND-DEPLOYMENT.md)** - The authoritative backend deployment reference
- **[Project Bible - Backend Deployment](../PROJECT_BIBLE.md#backend-deployment-serverless-api)** - Quick reference and overview
- **[Serverless Framework Documentation](https://www.serverless.com/framework/docs/)** - Official Serverless Framework docs
- **[Prisma Documentation](https://www.prisma.io/docs/)** - Official Prisma ORM docs

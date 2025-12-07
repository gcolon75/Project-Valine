# Backend Deployment Guide (Canonical)

> **This is the single source of truth for backend deployments in Project Valine.**  
> Last Updated: December 2024

## Overview

The backend is a Serverless Framework 3 application using AWS Lambda, API Gateway HTTP API (v2), and PostgreSQL (AWS RDS). The Prisma ORM is used for database access.

**Key Architecture Decision:** Prisma client and native binaries are deployed as a **Lambda Layer** (not bundled per-function) to keep individual function packages small and deployments fast.

---

## Prerequisites

- AWS account with IAM credentials configured
- Node.js 20.x installed
- PowerShell (Windows) or Bash (Linux/macOS)
- Git with repository access

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (NO SPACES) | `postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require` |
| `JWT_SECRET` | Secret for JWT signing (32+ chars) | `your-32-char-secret-here` |
| `AWS_REGION` | AWS region for deployment | `us-west-2` |
| `STAGE` | Deployment stage | `prod` or `staging` |

### Database URL Format

The `DATABASE_URL` must be a valid PostgreSQL connection string with **NO SPACES**:

```
postgresql://user:password@host:port/database?sslmode=require
```

**Production Database URL:**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

> ⚠️ **Important:** Special characters in the password must be URL-encoded (e.g., `@` → `%40`, `#` → `%23`).

---

## Prisma Lambda Layer

### Why Use a Layer?

The Prisma client and native query engine binaries are large (~20-30MB compressed after minimization). Including them in every Lambda function would:
- Exceed AWS Lambda's 250MB unzipped limit when combined with function code
- Make deployments slow (15-17 minutes vs ~1 minute)
- Waste storage and bandwidth

By using a Lambda Layer, the Prisma artifacts are deployed once and shared across all database-accessing functions.

### Layer Attachment Strategy

The Prisma layer is **selectively attached** only to functions that access the database. This minimizes the combined size for each function:

**Functions WITH Prisma layer** (use database):
- Auth functions (register, login, me, verify, 2FA, etc.)
- Profile functions (CRUD operations)
- Post, Reel, Script, Audition handlers
- Conversations, Notifications, Connections
- Media, Credits, Education handlers
- Settings, Search, Reports, Moderation
- Analytics handlers

**Functions WITHOUT Prisma layer** (utility only):
- `/health` - Health check endpoint
- `/meta` - API metadata endpoint

This ensures the combined size (function code + layer) stays well under the 250MB unzipped limit.

### Layer Contents (Minimal)

The layer (`layers/prisma-layer.zip`) contains ONLY essential files:
```
nodejs/
  node_modules/
    @prisma/client/
      runtime/**           # Runtime code (JS only, no WASM/tests/docs)
      *.js, *.d.ts         # Entry points and types
      package.json         # Package metadata
    .prisma/client/
      *.js, *.d.ts         # Generated client files
      default.js           # Prisma 6.x main entry
      schema.prisma        # Schema definition
      libquery_engine-rhel-openssl-3.0.x.so.node  # Lambda binary ONLY
```

**Explicitly EXCLUDED** to minimize size:
- `README.md`, `LICENSE` files
- Source maps (`*.map`)
- Tests, docs, cache directories
- WASM files (not needed on Lambda)
- Non-Lambda platform binaries (Windows, macOS, ARM64, musl)

The build script validates that the uncompressed layer size is < 150MB to maintain headroom.

### Building the Layer

**Windows (PowerShell):**
```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
```

**Linux/macOS (Bash):**
```bash
cd serverless
chmod +x ./scripts/build-prisma-layer.sh
./scripts/build-prisma-layer.sh
```

### When to Rebuild

Rebuild the layer when:
- First time setup (fresh clone)
- Prisma schema changes (`prisma/schema.prisma`)
- Prisma version upgrade in `package.json`
- After `npm ci` or dependency updates

---

## Deployment Steps (PowerShell)

### Step 1: Set Environment Variables

```powershell
# Navigate to the repository root
cd C:\path\to\Project-Valine

# Set required environment variables
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
$env:JWT_SECRET = "your-32-character-jwt-secret-here"
$env:AWS_REGION = "us-west-2"
$env:STAGE = "prod"
```

### Step 2: Install Dependencies

```powershell
cd serverless
npm ci
```

### Step 3: Generate Prisma Client

```powershell
npx prisma generate --schema=prisma\schema.prisma
```

### Step 4: Build Prisma Lambda Layer

```powershell
.\scripts\build-prisma-layer.ps1
```

Verify the layer was created:
```powershell
Get-ChildItem .\layers\prisma-layer.zip
```

Expected output: `~15-25 MB` file (minimal layer after optimization)

### Step 5: Deploy to AWS

```powershell
npx serverless deploy --stage prod --region us-west-2 --verbose
```

### Step 6: Verify Deployment

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health" -Method GET

# Test auth diagnostics
Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/diag" -Method GET
```

---

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
Get-ChildItem .serverless\*.zip | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB, 2)}}
```

**Expected Result:** Each function zip should be **< 1 MB** (handler code only, no Prisma). Layer zip should be **15-25 MB**. Typical function sizes:
- Simple handlers: 2-3 KB
- Auth handlers: ~88 KB  
- Media handlers (with AWS SDK): ~260 KB

The combined unzipped size (function + layer) for any function should be well under 200MB (AWS limit is 250MB).

### Check Layer Attachment

After deployment, verify the Prisma layer is attached:

```powershell
aws lambda get-function-configuration `
    --function-name pv-api-prod-me `
    --region us-west-2 `
    --query "Layers[].Arn"
```

Expected output:
```json
["arn:aws:lambda:us-west-2:579939802800:layer:pv-api-prod-prisma:X"]
```

---

## CI/CD (GitHub Actions)

The `backend-deploy.yml` workflow automatically:
1. Checks out the repository
2. Configures AWS credentials via OIDC
3. Installs dependencies (`npm ci`)
4. Generates Prisma client
5. Builds the Prisma Lambda Layer
6. Deploys via Serverless Framework

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Production database connection string |
| `JWT_SECRET` | JWT signing secret |

### Manual Deployment

Go to **Actions → Backend Deploy → Run workflow** to trigger a manual deployment.

---

## Common Pitfalls

### 1. Lambda Size Limit Error

**Error:**
```
UPDATE_FAILED: FunctionLambdaFunction - Unzipped size must be smaller than 262144000 bytes
```

**Cause:** Prisma is being bundled per-function instead of via the layer, OR the layer is being attached to all functions (including non-DB functions), OR the layer contents are too large.

**Solution:**
1. Ensure `serverless.yml` has `layers` section defined at root level
2. Ensure provider-level `layers` is REMOVED (layers should be per-function only)
3. Ensure each DB-using function has `layers: [{ Ref: PrismaLambdaLayer }]` in its definition
4. Ensure `health` and `meta` functions do NOT have the layer attached
5. Ensure `custom.esbuild.exclude` contains `@prisma/client`, `.prisma/*`, `.prisma/client/*`, and `prisma`
   - **Important:** The `exclude` option tells serverless-esbuild to skip packing these modules. Without it, `external` modules are still npm-packed into each function bundle.
6. Ensure `package.patterns` excludes `!node_modules/@prisma/**`, `!node_modules/.prisma/**`, and `!node_modules/prisma/**`
7. Rebuild the layer with minimized contents: `.\scripts\build-prisma-layer.ps1`
8. Verify layer size is < 150MB uncompressed (script will validate this)

### 2. Prisma Not Generated

**Error:**
```
@prisma/client did not initialize yet. Please run 'prisma generate'.
```

**Solution:**
```powershell
npx prisma generate --schema=prisma\schema.prisma
```

### 3. Database Unavailable (503)

**Symptoms:**
- Endpoints return `503 Database unavailable`
- `/auth/diag` shows `prismaDegraded: true`

**Possible Causes:**
- `DATABASE_URL` not set or has spaces
- RDS security group blocks Lambda
- Prisma native binary missing from layer

**Debug Steps:**
1. Check environment variables in Lambda console
2. Verify RDS security group allows Lambda VPC (if using VPC)
3. Check CloudWatch logs for Prisma initialization errors

### 4. Layer Artifact Not Found

**Error:**
```
Layer artifact not found at layers/prisma-layer.zip
```

**Solution:**
```powershell
.\scripts\build-prisma-layer.ps1
```

---

## Production Endpoints

| Endpoint | URL |
|----------|-----|
| Frontend | https://dkmxy676d3vgc.cloudfront.net |
| API Base | https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com |
| Health Check | https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health |
| Auth Diagnostics | https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/diag |

---

## Quick Reference Commands

```powershell
# Full deployment from scratch
cd serverless
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
$env:JWT_SECRET = "your-jwt-secret"
npm ci; npx prisma generate --schema=prisma\schema.prisma; .\scripts\build-prisma-layer.ps1; npx serverless deploy --stage prod --region us-west-2

# Package only (no deploy)
npx serverless package --stage prod --region us-west-2 --verbose

# Check zip sizes
Get-ChildItem .serverless\*.zip | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB, 2)}}

# View logs for a function
npx serverless logs -f me --stage prod --region us-west-2 --tail

# Remove stack (DANGEROUS - deletes everything)
npx serverless remove --stage prod --region us-west-2
```

---

## Related Documentation

- [AUTH-DEPLOYMENT.md](../serverless/AUTH-DEPLOYMENT.md) - Auth endpoint details
- [AUTH-TROUBLESHOOTING.md](../serverless/AUTH-TROUBLESHOOTING.md) - Common auth issues
- [layers/README.md](../serverless/layers/README.md) - Prisma layer details
- [API_DOCUMENTATION.md](../serverless/API_DOCUMENTATION.md) - Full API reference

---

## Changelog

- **December 2024:** Added Prisma Lambda Layer to reduce function sizes from ~111 MB to < 10 MB per function
- **December 2024:** Consolidated deployment docs into this canonical guide

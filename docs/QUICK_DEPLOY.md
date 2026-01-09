# Quick Deploy Guide

**Version**: 1.0  
**Last Updated**: 2026-01-06  
**Status**: Production Deployment Reference

This guide provides a streamlined, one-command deployment flow for Project Valine production infrastructure.

---

## Table of Contents

1. [Prod Today - Fast Path](#prod-today---fast-path)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Optional: Database Migrations](#optional-database-migrations)
5. [Canonical Endpoints](#canonical-endpoints)
6. [Reference PRs](#reference-prs)

---

## Prod Today - Fast Path

**Single-command deployment** from a clean clone:

```powershell
# Clone and navigate to repository
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git checkout main
git pull origin main

# Run quick deploy (backend + frontend)
.\scripts\quick-deploy.ps1
```

This script performs:
- Backend: `npm ci`, environment validation, Prisma layer check/build, `npx serverless@3 deploy`
- Frontend: `npm ci`, `npm run build`, `aws s3 sync dist/ s3://valine-frontend-prod --delete`

---

## Prerequisites

**Required tooling:**

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 20.x | `node --version` |
| npm | 10.x+ | `npm --version` |
| AWS CLI | 2.x+ | `aws --version` |
| PowerShell | 5.1+ | `$PSVersionTable.PSVersion` |

**AWS credentials** must be configured with permissions for:
- Lambda (create, update, invoke)
- API Gateway (create, update)
- CloudFormation (full stack management)
- S3 (deployment artifacts + frontend bucket)
- CloudWatch Logs

```powershell
# Configure AWS credentials
aws configure

# Or set environment variables
$env:AWS_ACCESS_KEY_ID = "your-access-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
$env:AWS_REGION = "us-west-2"
```

---

## Environment Variables

**Required environment variables** for production deployment:

```powershell
# NODE_ENV - Controls cookie SameSite attribute
# MUST be "production" for prod deployments
$env:NODE_ENV = "production"

# JWT_SECRET - At least 32 characters, unique secret
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
$env:JWT_SECRET = "your-secure-jwt-secret-at-least-32-characters"

# DATABASE_URL - PostgreSQL connection string (NO SPACES)
# Format: postgresql://username:password@host:port/database?sslmode=require
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# ALLOWED_USER_EMAILS - Comma-separated list of authorized user emails
$env:ALLOWED_USER_EMAILS = "ghawk075@gmail.com,user@example.com"
```

**Environment drift checks:**

The deployment script automatically validates environment variables before deploying using `serverless/scripts/check-env-drift.ps1`. This prevents common misconfigurations:

- `NODE_ENV` must be "production" for prod stage
- `JWT_SECRET` must be at least 32 characters (no default values)
- `DATABASE_URL` must be valid PostgreSQL URL with no spaces
- `ALLOWED_USER_EMAILS` must be set (no placeholder emails)

---

## Optional: Database Migrations

If database schema changes are required, run migrations **after** backend deployment:

```powershell
# Navigate to api directory
cd api

# Deploy pending migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

**Note:** Migrations are not run automatically. Review migration changes before applying to production.

---

## Canonical Endpoints

**Production environment values:**

| Resource | Value |
|----------|-------|
| **Frontend URL** | `https://dkmxy676d3vgc.cloudfront.net` |
| **API Base URL** | `https://ce73w43mga.execute-api.us-west-2.amazonaws.com` ⚠️ Verify: `.deploy/last-api-base.txt` |
| **Frontend S3 Bucket** | `s3://valine-frontend-prod` |
| **AWS Region** | `us-west-2` |
| **CloudFront Distribution** | `E16LPJDBIL5DEE` |
| **Database Host** | `project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com` |

**Database URL (no spaces):**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

---

## Reference PRs

Deployment tooling and configuration established in these PRs:

- **PR #394**: Revert deploy tooling to npx-based flow and simplify Prisma layer build  
  https://github.com/gcolon75/Project-Valine/pull/394  
  Restored `npx serverless@3 deploy` path and fixed frontend bucket to `valine-frontend-prod`

- **PR #396**: Harden serverless deployment with automatic dependency management and preflight validation  
  https://github.com/gcolon75/Project-Valine/pull/396  
  Added automatic `npm ci` and plugin validation

- **PR #397**: Harden serverless deployment: add env drift detection, deterministic deps, CI preflight checks  
  https://github.com/gcolon75/Project-Valine/pull/397  
  Added `check-env-drift`, CI preflight, canonical `API_BASE_URL`, `NODE_ENV=production` defaults

- **PR #388**: Fix duplicate environment variable keys in serverless.yml  
  https://github.com/gcolon75/Project-Valine/pull/388  
  Unblocked `serverless print`/`info` commands

- **PR #387**: Prevent auth/infra outage: env drift runbook, canonicalize URLs, convert bash→PowerShell  
  https://github.com/gcolon75/Project-Valine/pull/387  
  Established PowerShell-first deployment approach

---

## Troubleshooting

**Common issues:**

1. **"Environment drift detected"**
   - Fix: Review error output from `check-env-drift.ps1` and set missing/incorrect environment variables
   - Verify `NODE_ENV=production`, `JWT_SECRET` length, `DATABASE_URL` format

2. **"Prisma layer not found"**
   - Fix: The script automatically builds the layer if missing
   - If build fails, manually run: `.\serverless\scripts\build-prisma-layer.ps1`

3. **"aws s3 sync failed"**
   - Fix: Verify AWS credentials have S3 permissions for `valine-frontend-prod` bucket
   - Check AWS CLI is configured: `aws sts get-caller-identity`

4. **"serverless deploy failed"**
   - Fix: Check CloudFormation console for stack errors
   - Verify Lambda and API Gateway permissions in AWS IAM

For more detailed troubleshooting, see:
- `docs/DEPLOYMENT_BIBLE.md` - Comprehensive deployment guide
- `docs/TROUBLESHOOTING.md` - Common deployment issues
- `serverless/scripts/check-env-drift.ps1` - Environment validation script

---

## See Also

- [Deployment Bible](DEPLOYMENT_BIBLE.md) - Comprehensive deployment guide
- [Operations Guide](OPERATIONS.md) - Production operations and monitoring
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and fixes
- [Architecture](ARCHITECTURE.md) - System architecture overview

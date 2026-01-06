# Deploy Checklist (Windows PowerShell)

Quick reference for deploying Project Valine API to production using Windows PowerShell.

For detailed information, see [DEPLOYMENT_BIBLE.md](../docs/DEPLOYMENT_BIBLE.md).

---

## Prerequisites (One-Time Setup)

```powershell
# 1. Install required tools
# - Node.js 20.x: https://nodejs.org
# - AWS CLI 2.x: https://aws.amazon.com/cli/
# - Serverless Framework: npm install -g serverless

# 2. Configure AWS credentials
aws configure
# Enter Access Key ID, Secret Access Key, and default region (us-west-2)

# 3. Verify tools
node --version   # Should be v20.x
npm --version    # Should be 10.x+
aws --version    # Should be 2.x+
serverless --version  # Should be 3.x+
```

---

## Pre-Deployment

### 1. Set Environment Variables

```powershell
# Option A: Load from .env.prod file
cd serverless
Get-Content .env.prod | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Option B: Set manually (replace with your values)
$env:DATABASE_URL = "postgresql://USER:PASS@HOST:5432/DB?sslmode=require"
$env:JWT_SECRET = "REPLACE_WITH_SECURE_SECRET"
$env:NODE_ENV = "production"
$env:ALLOWED_USER_EMAILS = "user1@example.com,user2@example.com"
$env:FRONTEND_URL = "https://dkmxy676d3vgc.cloudfront.net"
$env:API_BASE_URL = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$env:MEDIA_BUCKET = "valine-media-uploads"
```

### 2. Validate Environment

```powershell
cd serverless
.\scripts\validate-required-env.ps1 -Strict
```

### 3. Build Prisma Layer (if needed)

```powershell
cd serverless

# Check if layer exists
if (-not (Test-Path "layers/prisma-layer.zip")) {
    Write-Host "Building Prisma layer..." -ForegroundColor Yellow
    .\scripts\build-prisma-layer.ps1
}
```

### 4. Run Database Migrations (if schema changed)

```powershell
# From repository root (important!)
cd /path/to/Project-Valine

# Check migration status
npx prisma migrate status --schema serverless/prisma/schema.prisma

# Apply pending migrations (if any)
npx prisma migrate deploy --schema serverless/prisma/schema.prisma
```

---

## Deployment

### One-Button Deploy (Recommended)

```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

This script automatically:
- ✅ Validates environment variables
- ✅ Checks/builds Prisma layer
- ✅ Packages Lambda functions
- ✅ Deploys to AWS
- ✅ Verifies Lambda environment variables
- ✅ Runs smoke tests

### Manual Deploy (Fallback)

```powershell
cd serverless

# 1. Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# 2. Package functions
serverless package --stage prod --region us-west-2

# 3. Deploy
serverless deploy --stage prod --region us-west-2 --verbose
```

---

## Post-Deployment Verification

### 1. Run Smoke Tests

```powershell
cd serverless

# Get API URL from deployment
$apiUrl = (serverless info --stage prod --region us-west-2 | Select-String "https://.*execute-api.*amazonaws.com").Matches.Value

# Run smoke tests
.\scripts\post-deploy-smoke-test.ps1 -ApiUrl $apiUrl -Stage prod
```

### 2. Audit Lambda Environment Variables

```powershell
cd serverless
.\scripts\audit-lambda-env.ps1 -Stage prod -Region us-west-2
```

Expected output: All sampled functions should have `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV` set.

### 3. Test Authentication Flow

```powershell
# Open browser
Start-Process "https://dkmxy676d3vgc.cloudfront.net"

# Manual test checklist:
# [ ] Login with allowlisted email
# [ ] Navigate to Profile page (no 401 errors)
# [ ] Navigate to Feed (posts load)
# [ ] Check browser DevTools → Application → Cookies:
#     - access_token: SameSite=None, Secure=Yes, HttpOnly=Yes
#     - refresh_token: SameSite=None, Secure=Yes, HttpOnly=Yes
```

### 4. Check CloudWatch Logs (if issues)

```powershell
# View logs for authRouter
aws logs tail /aws/lambda/pv-api-prod-authRouter --follow --region us-west-2

# View logs for profilesRouter
aws logs tail /aws/lambda/pv-api-prod-profilesRouter --follow --region us-west-2

# Look for:
# ✅ No 401 Unauthorized errors
# ✅ No "Token not found" messages
# ✅ No "JsonWebTokenError" errors
```

---

## Common Issues

### Issue: "Prisma binary not found"

```powershell
# Rebuild Prisma layer from repo root
cd /path/to/Project-Valine
npm ci
npx prisma generate --schema=serverless/prisma/schema.prisma
cd serverless
.\scripts\build-prisma-layer.ps1
.\scripts\deploy.ps1 -Stage prod -Region us-west-2 -Force
```

### Issue: "Missing environment variables on Lambda"

```powershell
# Verify local env vars are set
cd serverless
.\scripts\validate-required-env.ps1 -Strict

# Redeploy (force update)
.\scripts\deploy.ps1 -Stage prod -Region us-west-2 -Force
```

### Issue: "401 errors on authenticated endpoints"

Check that all Lambda functions have the same `JWT_SECRET`:

```powershell
$functions = @("authRouter", "profilesRouter", "getFeed")
foreach ($func in $functions) {
    Write-Host "=== $func ==="
    aws lambda get-function-configuration `
        --function-name "pv-api-prod-$func" `
        --query 'Environment.Variables.JWT_SECRET' `
        --output text `
        --region us-west-2
}
```

If different, redeploy with `--Force` flag.

---

## Emergency Rollback

```powershell
# 1. Identify previous working commit
git log --oneline -10

# 2. Checkout previous commit
git checkout <commit-sha>

# 3. Redeploy
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2 -Force

# 4. Return to latest commit (once verified)
git checkout main
```

---

## Support

- **Documentation**: [DEPLOYMENT_BIBLE.md](../docs/DEPLOYMENT_BIBLE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
- **Architecture**: [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- **Primary Contact**: @gcolon75

---

**Last Updated**: 2026-01-06  
**Version**: 1.0  
**Status**: Active

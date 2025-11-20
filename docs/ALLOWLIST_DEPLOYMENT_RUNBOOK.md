# Allowlist Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying and verifying the email allowlist system in Project Valine. The allowlist restricts registration and login to pre-approved email addresses, enforced at both frontend and backend layers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Procedures](#deployment-procedures)
  - [Backend Deployment](#backend-deployment)
  - [Frontend Deployment](#frontend-deployment)
- [Verification](#verification)
- [Emergency Procedures](#emergency-procedures)
- [Common Errors](#common-errors)
- [Rollback](#rollback)

## Prerequisites

### Required Tools

- **AWS CLI** (version 2.0+)
  ```bash
  aws --version
  ```

- **Node.js** (version 18+)
  ```bash
  node --version
  ```

- **PowerShell** (for Windows scripts) or **Bash** (for Unix scripts)
  ```bash
  pwsh --version  # PowerShell
  bash --version  # Bash
  ```

### Required Access

- AWS credentials configured with Lambda and CloudFront permissions
- Permissions to deploy serverless functions
- Permissions to update Lambda environment variables

### Environment Variables

Ensure these are set before deployment:

**Backend** (in serverless deployment context):
```bash
ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

**Frontend** (in build context):
```bash
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

## Deployment Procedures

### Backend Deployment

#### Option 1: Windows (PowerShell)

```powershell
# Navigate to project root
cd C:\path\to\Project-Valine

# Set environment variable (if not in .env)
$env:ALLOWED_USER_EMAILS = "ghawk075@gmail.com,valinejustin@gmail.com"

# Run deployment script
.\scripts\deploy-backend.ps1

# With custom retry count
.\scripts\deploy-backend.ps1 -MaxRetries 3

# Skip post-deployment audit
.\scripts\deploy-backend.ps1 -SkipAudit
```

#### Option 2: Unix/Linux/macOS (Bash)

```bash
# Navigate to project root
cd /path/to/Project-Valine

# Set environment variable (if not in .env)
export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"

# Make script executable (first time only)
chmod +x scripts/deploy-backend.sh

# Run deployment script
./scripts/deploy-backend.sh

# With custom retry count
./scripts/deploy-backend.sh --max-retries 3

# Skip post-deployment audit
./scripts/deploy-backend.sh --skip-audit
```

#### Manual Serverless Deployment

If deployment scripts fail, use serverless CLI directly:

```bash
cd serverless
npm ci
npx serverless deploy --verbose
```

**Note**: On Windows, if you encounter EPERM errors:
1. Close all open file handles in the serverless directory
2. Run PowerShell as Administrator
3. Temporarily disable antivirus file scanning on the project directory
4. Use the deployment script with retries instead of direct serverless deploy

### Frontend Deployment

#### Build with Allowlist Validation

```bash
# Set environment variable
export VITE_ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"

# Build (includes prebuild validation)
npm run build

# Build output will be in dist/
```

#### Deploy to CloudFront

```bash
# Deploy built assets (example)
aws s3 sync dist/ s3://your-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Verification

### 1. Health Endpoint Check

Verify the health endpoint returns allowlist diagnostics:

**PowerShell**:
```powershell
$response = Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health" -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
Write-Host "Allowlist Active: $($json.allowlistActive)"
Write-Host "Allowlist Count: $($json.allowlistCount)"
Write-Host "Misconfigured: $($json.allowlistMisconfigured)"
```

**Bash**:
```bash
curl -s https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health | jq '{allowlistActive, allowlistCount, allowlistMisconfigured}'
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": 1700000000000,
  "service": "Project Valine API",
  "version": "1.0.0",
  "allowlistActive": true,
  "allowlistCount": 2,
  "allowlistMisconfigured": false
}
```

**If `allowlistMisconfigured: true`**:
```json
{
  "status": "ok",
  "allowlistActive": true,
  "allowlistCount": 1,
  "allowlistMisconfigured": true,
  "requiredEmails": ["ghawk075@gmail.com", "valinejustin@gmail.com"],
  "warnings": ["ALLOWLIST_MISCONFIGURED"]
}
```

### 2. Environment Variable Audit

Run the audit script to verify all Lambda functions have correct configuration:

**PowerShell**:
```powershell
.\scripts\audit-allowlist.ps1

# Custom region/stage
.\scripts\audit-allowlist.ps1 -Region us-east-1 -Stage staging
```

**Expected Output**:
```
═══════════════════════════════════════════════════════
  Lambda Environment Variable Audit: ALLOWED_USER_EMAILS
═══════════════════════════════════════════════════════

✓ AWS CLI found: aws-cli/2.x.x

Querying Lambda functions in region us-west-2...

Audit Results:

FunctionName           AllowedEmails                              Status
------------           -------------                              ------
pv-api-prod-register   ghawk075@gmail.com,valinejustin@gmail.com  OK
pv-api-prod-login      ghawk075@gmail.com,valinejustin@gmail.com  OK
pv-api-prod-me         ghawk075@gmail.com,valinejustin@gmail.com  OK
pv-api-prod-refresh    ghawk075@gmail.com,valinejustin@gmail.com  OK
pv-api-prod-logout     ghawk075@gmail.com,valinejustin@gmail.com  OK

═══════════════════════════════════════════════════════
✓ Audit PASSED: All 5 auth functions properly configured

Required emails present: ghawk075@gmail.com,valinejustin@gmail.com
```

### 3. Functional Testing

#### Test Allowed Email (Should Succeed)

**PowerShell**:
```powershell
$body = @{
    email = "ghawk075@gmail.com"
    password = "TestPassword123!"
    username = "testuser"
    displayName = "Test User"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

**Bash**:
```bash
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "TestPassword123!",
    "username": "testuser",
    "displayName": "Test User"
  }'
```

**Expected**: 201 Created or 409 Conflict (if already exists)

#### Test Blocked Email (Should Fail)

**PowerShell**:
```powershell
$body = @{
    email = "unauthorized@example.com"
    password = "TestPassword123!"
    username = "unauthorized"
    displayName = "Unauthorized User"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

**Bash**:
```bash
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unauthorized@example.com",
    "password": "TestPassword123!",
    "username": "unauthorized",
    "displayName": "Unauthorized User"
  }'
```

**Expected**: 403 Forbidden with response:
```json
{
  "error": "Access denied: email not in allowlist",
  "statusCode": 403
}
```

### 4. CloudWatch Logs Verification

Check for structured logging of denial events:

```bash
# Query CloudWatch Logs Insights
aws logs start-query \
  --log-group-name /aws/lambda/pv-api-prod-register \
  --start-time $(date -u -d '30 minutes ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /registration_denied/ | sort @timestamp desc | limit 20'
```

**Expected Log Entry**:
```json
{
  "event": "registration_denied",
  "email": "un***@example.com",
  "reason": "email_not_in_allowlist",
  "allowlistCount": 2,
  "ts": "2024-01-15T10:30:00.000Z"
}
```

## Emergency Procedures

### Missing Environment Variables After Deployment

If the audit script shows MISSING or PARTIAL status:

1. **Use the Emergency Patch Script**:

   **PowerShell**:
   ```powershell
   # Dry run first to see what would change
   .\scripts\patch-allowlist-env.ps1 -Emails "ghawk075@gmail.com,valinejustin@gmail.com" -DryRun
   
   # Apply the patch
   .\scripts\patch-allowlist-env.ps1 -Emails "ghawk075@gmail.com,valinejustin@gmail.com"
   ```

2. **Verify the patch**:
   ```powershell
   .\scripts\audit-allowlist.ps1
   ```

3. **Schedule a clean deployment**:
   ```powershell
   # Run a full deployment when convenient to ensure consistency
   .\scripts\deploy-backend.ps1
   ```

### Health Endpoint Missing Allowlist Fields

If `/health` returns `{"status":"ok"}` without allowlist fields:

**Root Cause**: Deployed code doesn't include allowlist logic updates.

**Solution**:
1. Verify you're on the correct branch with the updated health handler
2. Rebuild and redeploy backend:
   ```bash
   cd serverless
   npm ci
   npx serverless deploy --force
   ```

### Strict Allowlist Mode Returning 503

If you see `503 Service temporarily unavailable: configuration error`:

**Root Cause**: `STRICT_ALLOWLIST=1` is set but allowlist has < 2 emails.

**Solution**:
1. Check CloudWatch logs for `allowlist_misconfigured` events
2. Either:
   - Fix the allowlist configuration and redeploy
   - Disable strict mode: unset `STRICT_ALLOWLIST` or set to `0`

## Common Errors

### EPERM Errors on Windows

**Error**: `EPERM: operation not permitted, unlink ...`

**Causes**:
- Antivirus scanning files
- File handles held by IDE or terminal
- Insufficient permissions

**Solutions**:
1. Use the deployment script with retries: `.\scripts\deploy-backend.ps1`
2. Close VS Code and other IDEs
3. Run PowerShell as Administrator
4. Temporarily disable antivirus for the project directory
5. If persistent, use WSL or a Linux VM for deployment

### PowerShell Curl Conflicts

**Error**: `Invoke-WebRequest: A parameter cannot be found that matches parameter name 'H'`

**Cause**: Using bash-style curl flags in PowerShell.

**Solution**: Use PowerShell-native commands:
```powershell
# ✗ Don't use this in PowerShell
curl -H "Content-Type: application/json" -d '...' https://api/endpoint

# ✓ Use this instead
Invoke-WebRequest -Uri "https://api/endpoint" `
  -Method POST `
  -ContentType "application/json" `
  -Body '...'
```

### Build Fails: Missing Required Emails

**Error**: `✗ FAILED: Missing required emails in production build`

**Cause**: `VITE_ALLOWED_USER_EMAILS` not set during build.

**Solution**:
```bash
# Set before build
export VITE_ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"
npm run build
```

Or add to `.env.production`:
```
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

### Allowlist Count Shows 0

**Symptoms**:
- `/health` shows `"allowlistCount": 0`
- `"allowlistActive": false`

**Cause**: `ALLOWED_USER_EMAILS` environment variable not set on Lambda functions.

**Diagnosis**:
```powershell
.\scripts\audit-allowlist.ps1
```

**Solution**:
```powershell
.\scripts\patch-allowlist-env.ps1 -Emails "ghawk075@gmail.com,valinejustin@gmail.com"
```

## Rollback

### Quick Rollback (Backend Only)

To disable allowlist enforcement without reverting code:

1. **Set ENABLE_REGISTRATION to true**:
   ```bash
   aws lambda update-function-configuration \
     --function-name pv-api-prod-register \
     --environment "Variables={ENABLE_REGISTRATION=true,...}"
   ```

2. **Or remove ALLOWED_USER_EMAILS** (allows all registrations):
   ```powershell
   # Emergency: Clear allowlist from all functions
   # Warning: This opens registration to everyone!
   .\scripts\patch-allowlist-env.ps1 -Emails "" -DryRun  # Review first
   ```

### Full Rollback (Code Revert)

If allowlist deployment causes critical issues:

1. **Revert Git commit**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Redeploy backend**:
   ```bash
   cd serverless
   npx serverless deploy --force
   ```

3. **Rebuild and redeploy frontend**:
   ```bash
   npm run build
   # Deploy to S3/CloudFront
   ```

## Troubleshooting Checklist

When allowlist isn't working as expected:

- [ ] Health endpoint returns `allowlistActive: true` and `allowlistCount: 2`
- [ ] All 5 auth functions have ALLOWED_USER_EMAILS set (audit script passes)
- [ ] Frontend build includes VITE_ALLOWED_USER_EMAILS
- [ ] CloudWatch logs show `registration_denied` events for blocked emails
- [ ] No CloudWatch errors related to allowlist parsing
- [ ] Frontend and backend allowlists match (same emails)
- [ ] ENABLE_REGISTRATION is set to `false` (or unset, defaults to false)

## Support

For further assistance:

1. Check CloudWatch Logs for error details
2. Review the [ACCESS_CONTROL_ALLOWLIST.md](../docs/ACCESS_CONTROL_ALLOWLIST.md) documentation
3. Run `.\scripts\audit-allowlist.ps1` for diagnostics
4. Contact system administrator with audit output and logs

# Postmortem: Backend Profile Update Failures

**Date:** 2025-11-30  
**Status:** Resolved  
**Severity:** P1 – Production API returning 500 errors on profile updates

---

## Executive Summary

Backend API profile updates were failing due to three interrelated issues:

1. Prisma schema mismatch (`title` field missing from runtime client)
2. Out-of-date Prisma Lambda layer (not rebuilt after schema migration)
3. CSRF header not present in PowerShell test scripts

All issues have been resolved. Production is stable.

---

## Infrastructure Context

| Resource | Value |
|----------|-------|
| API Base | https://wkndtj22ab.execute-api.us-west-2.amazonaws.com |
| Frontend | https://dkmxy676d3vgc.cloudfront.net |
| Prisma Layer | arn:aws:lambda:us-west-2:579939802800:layer:prisma:12 |
| DB URL | postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require |
| Related PRs | #297 (cookies), #298 (profile field mapping), #299 (title migration) |

---

## Issue Details

### Root Cause 1: Prisma Schema Mismatch

The `title` field was added to the User model in the Prisma schema but the generated Prisma client in the Lambda layer was out-of-date. Runtime errors occurred when `updateMyProfile` attempted to write to the `title` column.

**Error:**
```
PrismaClientValidationError: Unknown arg `title` in data.title for type UserUpdateInput
```

### Root Cause 2: Prisma Layer Out-of-Date

After the schema migration (PR #299), the Prisma Lambda layer was not rebuilt. The layer version `:11` was deployed but did not include the updated client.

### Root Cause 3: CSRF Header Missing

Test scripts using PowerShell `Invoke-WebRequest` were not including the `x-csrf-token` header, causing 403 Forbidden responses from the API.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 2025-11-30 02:00 | PR #299 merged – added `title` field migration |
| 2025-11-30 02:15 | Serverless deploy completed (layer :11 unchanged) |
| 2025-11-30 03:00 | User reports profile update failure |
| 2025-11-30 03:30 | Investigation begins – Prisma validation errors in logs |
| 2025-11-30 04:00 | Layer rebuilt to :12 with updated schema |
| 2025-11-30 04:15 | CSRF header added to test scripts |
| 2025-11-30 04:30 | Full validation passed – production stable |

---

## Fixes Applied

### Fix 1: Database Migration

Migration already applied in PR #299. Verified column exists:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'title';
```

### Fix 2: Prisma Layer Rebuild to :12

```powershell
cd <path-to-Project-Valine>\serverless
.\scripts\build-prisma-layer.ps1
npx serverless deploy --stage prod --region us-west-2
```

Verified layer version:

```powershell
aws lambda get-function-configuration `
  --function-name pv-api-prod-updateMyProfile `
  --region us-west-2 `
  --query "Layers[].Arn"
```

Expected output:
```
["arn:aws:lambda:us-west-2:579939802800:layer:prisma:12"]
```

### Fix 3: updateMyProfile Field Mapping

PR #298 corrected the field mapping in `updateMyProfile.js` to properly handle the `title` field.

### Fix 4: CSRF Header in Scripts

All PowerShell test scripts now include:

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Cookie" = $cookies
    "x-csrf-token" = $csrfToken
}
```

### Fix 5: Allowlist Verified

Confirmed `ALLOWED_USER_EMAILS` includes production users. See [docs/allowlist.md](./allowlist.md).

---

## Validation Steps

### Step 1: Login and Capture Tokens

```powershell
$api = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"

$loginBody = @{
    email = "ghawk075@gmail.com"
    password = "YourPassword"
} | ConvertTo-Json

$loginResp = Invoke-WebRequest -Uri "$api/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -SessionVariable session

$cookies = $loginResp.Headers["Set-Cookie"] -join "; "
$csrfToken = ($loginResp.Content | ConvertFrom-Json).csrfToken
```

### Step 2: PATCH Profile with Title

```powershell
$patchBody = @{
    title = "Senior Developer"
    bio = "Updated bio for testing"
} | ConvertTo-Json

$patchResp = Invoke-WebRequest -Uri "$api/users/me" `
    -Method PATCH `
    -Headers @{
        "Content-Type" = "application/json"
        "Cookie" = $cookies
        "x-csrf-token" = $csrfToken
    } `
    -Body $patchBody

$patchResp.Content | ConvertFrom-Json
```

### Step 3: Verify Persistence

```powershell
$getResp = Invoke-WebRequest -Uri "$api/users/me" `
    -Method GET `
    -Headers @{ "Cookie" = $cookies }

$user = $getResp.Content | ConvertFrom-Json
Write-Host "Title: $($user.title)"
```

### Step 4: Tail Lambda Logs

```powershell
aws logs tail /aws/lambda/pv-api-prod-updateMyProfile `
    --region us-west-2 `
    --follow
```

---

## Rollback Procedure

If issues recur, revert to the last known good state:

### Step 1: Revert Code

```powershell
git checkout main
git revert HEAD~3..HEAD  # Reverts PRs #297-#299
git push origin main
```

### Step 2: Redeploy with Layer :12

```powershell
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

### Step 3: Verify Layer

```powershell
aws lambda get-function-configuration `
    --function-name pv-api-prod-updateMyProfile `
    --region us-west-2 `
    --query "Layers[].Arn"
```

---

## Lessons Learned

| What Went Wrong | What We'll Do Differently |
|-----------------|---------------------------|
| Schema change deployed without layer rebuild | Add layer rebuild check to deploy script |
| No automated test for new fields | Add integration test for `title` field |
| CSRF header missing from test scripts | Standardize test script templates |

---

## Action Items

- [ ] Add pre-deploy hook to verify Prisma layer matches schema
- [ ] Create integration test suite for profile endpoints
- [ ] Document CSRF requirements in API documentation
- [ ] Add monitoring alert for Prisma validation errors

---

## Related Documents

- [RUNBOOK.md](../RUNBOOK.md) – Deployment runbook
- [docs/allowlist.md](./allowlist.md) – Allowlist configuration
- [serverless/layers/README.md](../serverless/layers/README.md) – Prisma layer build instructions

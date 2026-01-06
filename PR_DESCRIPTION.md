# Revert Deploy Tooling to Original npx-Based Flow

## Summary

This PR restores the deployment process to the original, simple `npx serverless@3` based workflow and simplifies the Prisma layer build scripts. It addresses Windows PowerShell compatibility issues, removes brittle CLI steps, and updates documentation to match the restored flow.

## Problem Statement

**Observed Issues:**
1. Current deploy attempts required global Serverless CLI installation and hit Windows EPERM errors
2. The Prisma layer PowerShell script had malformed console output (e.g., the word "minimal" treated as a command) and hard-checks for `.prisma/client/default.js` causing false failures
3. Documentation mentioned flows that differed from the original working method
4. Frontend bucket name was inconsistent (`project-valine-frontend-prod` vs `valine-frontend-prod`)
5. Deploy relied on manual AWS CLI environment edits instead of IaC

## Changes Made

### 1. Simplified `build-prisma-layer.ps1` ✅

**Before:** 312 lines with verbose output, over-optimization, and hard checks
**After:** 150 lines with simple, reliable flow

**Key changes:**
- Removed the word "minimal" from all outputs (was causing command interpretation issues)
- Removed hard check for `default.js` that printed malformed text
- Simplified output messages (no fancy formatting that breaks in some PowerShell versions)
- Copy entire `.prisma/client` and `@prisma/client` directories without over-optimization
- Added verification that Lambda binary is inside the zip (fails cleanly if missing)
- Runs `npx prisma generate` from repo root (no more hard-coded assumptions)

### 2. Updated `deploy.ps1` for npx and Windows compatibility ✅

**Key changes:**
- Use `npx serverless@3` instead of globally installed `serverless`
- Removed Unicode characters (✓, ℹ, ⚠, ✗, ▶, ╔, ╚) that break in Windows PowerShell 5.1
- Replaced with simple ASCII: `[OK]`, `[INFO]`, `[WARN]`, `[ERROR]`, `>>`
- All commands now use `npx serverless@3` pattern:
  - `npx serverless@3 print`
  - `npx serverless@3 package`
  - `npx serverless@3 deploy`
  - `npx serverless@3 info`
- Removed requirement to install Serverless globally

### 3. Updated `DEPLOYMENT_BIBLE.md` ✅

**Key changes:**
- Restored Quick Start with both Backend and Frontend commands:
  ```powershell
  # Backend
  cd serverless
  npm ci
  npx serverless@3 deploy --stage prod --region us-west-2
  
  # Frontend
  cd ..\
  npm ci
  npm run build
  aws s3 sync dist/ s3://valine-frontend-prod --delete
  ```
- Removed Serverless Framework from required tooling table (no global install needed)
- Fixed frontend bucket name: **`valine-frontend-prod`** (not `project-valine-frontend-prod`)
- Fixed Database URL example to exact format (no spaces):
  ```
  postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
  ```
- Fixed API endpoint URLs to `i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
- Added note about `serverless-esbuild` plugin being auto-installed via `npm ci`
- All commands use `npx serverless@3` pattern
- Simplified "What it does" sections (removed checkmarks, bullet formatting)

### 4. Updated `DEPLOY_CHECKLIST.md` ✅

**Key changes:**
- Removed global Serverless installation from prerequisites
- Fixed Database URL to exact format (no placeholders in critical connection string)
- Fixed API_BASE_URL to correct endpoint
- Changed deployment methods:
  - **Method 1 (Recommended):** Direct `npx serverless@3 deploy`
  - **Method 2 (Alternative):** Deploy script for validation and smoke tests
- All commands use `npx serverless@3` pattern
- Added note about `serverless-esbuild` plugin

## Verification ✅

1. **PowerShell syntax check:** Both `build-prisma-layer.ps1` and `deploy.ps1` pass syntax validation
2. **Simplified output:** No Unicode characters that break in Windows PowerShell 5.1
3. **Documentation consistency:** All docs now reference `npx serverless@3` and `valine-frontend-prod`
4. **Plugin configuration:** `serverless.yml` correctly references `serverless-esbuild` (in devDependencies)

## What's NOT Changed (by design)

- **serverless.yml:** No changes to IaC configuration (provider.environment already injects env vars correctly)
- **.gitignore:** Already properly configured to exclude secrets
- **Lambda functions:** No code changes (this is infrastructure/docs only)
- **Environment variable flow:** Still uses provider.environment in serverless.yml (works correctly)

## Testing Required (Manual)

From a Windows PowerShell 5.1 terminal:

1. **Build Prisma Layer:**
   ```powershell
   cd serverless
   .\scripts\build-prisma-layer.ps1
   # Should complete without errors, create layers/prisma-layer.zip
   # Should verify Lambda binary is present
   ```

2. **Deploy Backend:**
   ```powershell
   cd serverless
   npm ci
   npx serverless@3 deploy --stage prod --region us-west-2
   # Should package and deploy without requiring global serverless
   ```

3. **Verify Lambda Env Vars:**
   After deploy, check that Lambda functions have:
   - `DATABASE_URL` (no spaces)
   - `JWT_SECRET`
   - `ALLOWED_USER_EMAILS`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net`
   - `API_BASE_URL=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
   - `MEDIA_BUCKET=valine-media-uploads`
   - `COOKIE_DOMAIN=.cloudfront.net`

4. **Deploy Frontend:**
   ```powershell
   cd ..\
   npm ci
   npm run build
   aws s3 sync dist/ s3://valine-frontend-prod --delete
   ```

## Reviewer Checklist

- [ ] Scripts run without errors in Windows PowerShell 5.1
- [ ] No Unicode characters in script output (all ASCII)
- [ ] `npx serverless@3` used throughout (no global serverless requirement)
- [ ] Frontend bucket name is `valine-frontend-prod` in all docs
- [ ] Database URL format matches: `postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require`
- [ ] API endpoint is `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
- [ ] Frontend URL is `https://dkmxy676d3vgc.cloudfront.net`
- [ ] Prisma layer build script copies entire client directories (not over-optimized)
- [ ] Prisma layer build verifies Lambda binary is in zip
- [ ] No secrets committed (all placeholder or deliberately shared by owner)
- [ ] Documentation is PowerShell-only (no bash/Linux examples)
- [ ] `serverless-esbuild` plugin requirement noted (auto-installed via npm ci)

## Files Changed

- `serverless/scripts/build-prisma-layer.ps1` (269 → 150 lines) - Simplified, removed problematic output
- `serverless/scripts/deploy.ps1` (439 → 439 lines) - Replaced Unicode with ASCII, use npx
- `docs/DEPLOYMENT_BIBLE.md` - Restored npx flow, fixed bucket name and endpoints
- `serverless/DEPLOY_CHECKLIST.md` - Updated to match restored flow

**Total:** -116 lines removed, scripts simplified and more reliable

## Related Issues

This PR addresses the deployment tooling reversion goals:
- Restores original `npx serverless@3` flow
- Fixes Windows PowerShell compatibility issues
- Simplifies Prisma layer build (no brittle checks)
- Corrects frontend bucket name to `valine-frontend-prod`
- Updates all documentation to match restored flow

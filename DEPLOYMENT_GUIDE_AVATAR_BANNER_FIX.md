# Avatar/Banner Save Fix - Deployment Guide

## Quick Deploy (PowerShell Commands Only)

### Prerequisites
- AWS credentials configured
- Node.js and npm installed
- Serverless Framework installed globally
- Valid DATABASE_URL environment variable

### Backend Deployment

```powershell
# Navigate to serverless directory
cd serverless

# Generate Prisma client (no schema changes, but ensures sync)
npm run prisma:generate

# Deploy to AWS Lambda
npm run deploy

# Expected output: Deployed functions with updated handlers
```

### Frontend Deployment

```powershell
# Navigate to project root
cd ..

# Install dependencies if needed
npm ci

# Build production bundle
npm run build

# Deploy to CloudFront/S3 (adjust for your deployment method)
# Example using AWS CLI:
aws s3 sync dist/ s3://your-frontend-bucket/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Verification

### 1. Backend Smoke Test
```powershell
$ApiBase="https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
Invoke-RestMethod "$ApiBase/health"
```

### 2. Run Verification Script
```powershell
# Set environment variables (optional, for full integration test)
$env:TEST_USER_ID="your-test-user-id"
$env:TEST_AUTH_TOKEN="your-jwt-token"

# Run verification
.\scripts\verify-avatar-banner-fix.ps1
```

### 3. Manual Testing Checklist

#### Test Case 1: Avatar Only
1. Log in to Edit Profile
2. Upload new avatar image
3. Click "Save Changes"
4. **Verify**: Avatar updates, banner unchanged
5. Refresh page
6. **Verify**: Both avatar and banner persist

#### Test Case 2: Banner Only
1. Log in to Edit Profile
2. Upload new banner image
3. Click "Save Changes"
4. **Verify**: Banner updates, avatar unchanged
5. Refresh page
6. **Verify**: Both avatar and banner persist

#### Test Case 3: Both Together
1. Log in to Edit Profile
2. Upload new avatar AND banner
3. Click "Save Changes"
4. **Verify**: Both update
5. Refresh page
6. **Verify**: Both persist

## Database Validation (Optional)

```powershell
# Connect to your PostgreSQL database
$env:DATABASE_URL="your-connection-string"

# Query user avatar
psql $env:DATABASE_URL -c "SELECT id, username, avatar FROM users WHERE id = 'test-user-id';"

# Query profile banner
psql $env:DATABASE_URL -c "SELECT id, \"userId\", \"bannerUrl\" FROM profiles WHERE \"userId\" = 'test-user-id';"
```

Expected: Both avatar and bannerUrl should show valid S3 URLs after each test.

## Rollback Plan (If Needed)

### Backend Rollback
```powershell
cd serverless

# Rollback to previous deployment
sls rollback -t TIMESTAMP
# (Find timestamp from `sls deploy list`)
```

### Frontend Rollback
```powershell
# Redeploy previous frontend build
# Or revert git commits and rebuild
git revert HEAD
npm run build
# ... deploy as usual
```

## Files Changed

### Backend
- `serverless/src/handlers/profiles.js` (2 lines changed)
  - Line 996: Added null check for avatar
  - Line 1020: Added null check for banner

### Frontend
- `src/pages/ProfileEdit.jsx` (13 lines changed)
  - Modified `mapFormToProfileUpdate()` function
  - Added conditional inclusion for avatar and banner

### Tests
- `src/pages/__tests__/ProfileEdit.avatar-banner-together.test.jsx` (NEW)
  - 4 test cases covering the bug and fix

### Documentation
- `SCHEMA_DRIFT_AUDIT_AVATAR_BANNER_FIX.md` (NEW)
  - Complete audit report with root cause analysis

## Monitoring

After deployment, monitor for:

### Backend Logs (CloudWatch)
```powershell
# View recent logs
aws logs tail /aws/lambda/pv-api-prod-updateMyProfile --follow
```

Look for:
- ✅ `[updateMyProfile] PROFILE UPDATED` - Successful updates
- ❌ Any errors or validation failures

### Frontend Errors (Browser Console)
- No 401/403 errors on profile save
- No "Failed to save profile" toasts
- Network tab shows PATCH /me/profile with 200 response

### Database State
```sql
-- Check for null avatars/banners after updates
SELECT COUNT(*) as null_avatars 
FROM users 
WHERE avatar IS NULL AND "updatedAt" > NOW() - INTERVAL '1 hour';

SELECT COUNT(*) as null_banners 
FROM profiles 
WHERE "bannerUrl" IS NULL AND "updatedAt" > NOW() - INTERVAL '1 hour';
```

Expected: Counts should not increase after deployments.

## Success Criteria

- ✅ Backend deploys without errors
- ✅ Frontend builds and deploys successfully
- ✅ Health check returns healthy
- ✅ Verification script passes all checks
- ✅ Manual test cases pass
- ✅ No errors in CloudWatch logs
- ✅ Database shows correct URLs after updates
- ✅ No null overwrites observed

## Support

If issues arise:
1. Check CloudWatch logs for errors
2. Verify DATABASE_URL is correct
3. Ensure Prisma client is regenerated
4. Confirm S3 upload URLs are valid
5. Review browser console for frontend errors

## Timeline

Estimated deployment time:
- Backend: 5-10 minutes (serverless deploy)
- Frontend: 5-10 minutes (build + CloudFront invalidation)
- Verification: 2-5 minutes
- **Total: ~15-25 minutes**

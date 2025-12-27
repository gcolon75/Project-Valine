# Resolving Database Schema Mismatches

## Incident: December 4-9, 2025

### Problem

Lambda functions were failing with database schema mismatch errors:

- **Error**: "The column `media.mediaType` does not exist in the current database"
- **Impact**: Profile operations returning null, media uploads failing
- **Affected Endpoints**: 
  - `POST /api/profiles/:id/media/upload-url`
  - `POST /api/profiles/:id/media/complete`
  - `GET /api/me/profile`

### Root Cause

1. **Code-Database Divergence**: The application code referenced a `mediaType` column in the `Media` table that was never added to the production database schema
2. **Missing Migration**: Either a migration was never created or never deployed to production
3. **Stale Prisma Client**: The Prisma Client in Lambda layers may have been generated with an incorrect schema

### Resolution Steps

The issue was resolved by removing all references to the non-existent `mediaType` column from the codebase:

#### 1. Removed `mediaType` from Media Handler

**File**: `serverless/src/handlers/media.js`

- Removed `VALID_MEDIA_TYPES` constant
- Removed `mediaType` from request body destructuring
- Removed `mediaType` validation logic
- Removed `mediaType` field from Media record creation
- Removed special handling for AVATAR and BANNER mediaTypes in `completeUpload`

**Changes**:
```javascript
// BEFORE
const { type, title, description, privacy, mediaType } = body;
if (mediaType && !VALID_MEDIA_TYPES.includes(mediaType)) { ... }
mediaType: mediaType || null,

// AFTER
const { type, title, description, privacy } = body;
// No mediaType validation or storage
```

#### 2. Removed `mediaType` from Profile Handler

**File**: `serverless/src/handlers/profiles.js`

- Removed `mediaType: 'GALLERY'` filter from media query in `getMyProfile`

**Changes**:
```javascript
// BEFORE
media: {
  where: {
    mediaType: 'GALLERY',
  },
  orderBy: { createdAt: 'desc' },
}

// AFTER
media: {
  orderBy: { createdAt: 'desc' },
}
```

#### 3. Fixed Profile Auto-Creation

The `getMyProfile` handler already had logic to auto-create profiles (lines 1186-1200), which prevents "Profile not found" errors during media uploads.

#### 4. Fixed Frontend Profile Prepopulation

**File**: `src/pages/ProfileEdit.jsx`

- Updated to call `getMyProfile()` instead of `getProfile(user.id)`
- Fixed form data initialization to populate all fields from backend response

### Prevention Strategies

To prevent similar issues in the future:

#### 1. Schema Validation in CI/CD

Add a pre-deployment check to ensure Prisma schema matches the database:

```powershell
# In CI pipeline before deployment
cd api
npx prisma db pull --force
git diff --exit-code prisma/schema.prisma
```

If the diff shows changes, the pipeline should fail with a clear message about schema drift.

#### 2. Prisma Client Regeneration

Always regenerate Prisma Client after schema changes:

```powershell
cd api
npx prisma generate
```

Ensure this is included in the Lambda layer build process:

```powershell
cd serverless
npm run build:layer:powershell
```

#### 3. Migration Discipline

- **Never manually edit the database** without creating a migration
- **Always run migrations before deploying** code that depends on schema changes
- **Test migrations in staging** before production deployment

#### 4. Code Review Checklist

When reviewing PRs that modify database queries:

- [ ] Does the code reference any database columns?
- [ ] Do all referenced columns exist in `api/prisma/schema.prisma`?
- [ ] Are there any pending migrations that need to be deployed?
- [ ] Has Prisma Client been regenerated if schema changed?

### Quick Reference Commands

#### Verify Schema Matches Database

```powershell
# Pull actual database schema (overwrites schema.prisma)
cd api
npx prisma db pull

# Check for differences
git diff prisma/schema.prisma

# Restore if no changes needed
git restore prisma/schema.prisma
```

#### Check for Pending Migrations

```powershell
cd api
npx prisma migrate status
```

#### Regenerate Prisma Client

```powershell
cd api
npx prisma generate
```

#### Rebuild Lambda Layer

```powershell
cd serverless
npm run build:layer:powershell
```

#### Deploy with Migrations

```powershell
# 1. Run migrations
cd api
npx prisma migrate deploy

# 2. Regenerate client
npx prisma generate

# 3. Rebuild layer
cd ../serverless
npm run build:layer:powershell

# 4. Deploy
npx serverless deploy --stage prod --region us-west-2
```

### Debugging Tips

#### Check Lambda Layer Contents

```powershell
# List Prisma Client in layer
cd serverless
unzip -l .serverless/prisma-layer.zip | Select-String -i prisma
```

#### Verify Schema in Deployed Lambda

Check CloudWatch logs for Prisma initialization errors:

```powershell
aws logs tail /aws/lambda/pv-api-prod-getMyProfile --region us-west-2 --follow
```

#### Test Locally

```powershell
# Set DATABASE_URL to production connection string
$env:DATABASE_URL = "postgresql://..."

# Test query
cd api
npx prisma studio
```

### Related Documentation

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
- [Backend Deployment Guide](../BACKEND-DEPLOYMENT.md)

### Lessons Learned

1. **Schema drift is silent**: Without automated checks, code-database mismatches can go unnoticed until runtime
2. **Error messages are critical**: The Prisma error clearly identified the missing column, enabling quick diagnosis
3. **Auto-creation patterns are valuable**: The profile auto-creation in `getMyProfile` prevented cascading failures
4. **Documentation matters**: Having this runbook will speed up resolution of future schema issues

### Incident Timeline

- **Dec 4**: Initial reports of "Profile not found" errors in media upload
- **Dec 5-8**: Investigation revealed `mediaType` column references in code
- **Dec 9**: Verified column does not exist in production schema
- **Dec 9**: Removed all `mediaType` references, deployed fix
- **Dec 9**: Created this documentation

### Status

✅ **RESOLVED** - All `mediaType` references removed from codebase. Avatar and banner uploads now use `User.avatar` and `Profile.bannerUrl` fields directly via `updateMyProfile` endpoint.

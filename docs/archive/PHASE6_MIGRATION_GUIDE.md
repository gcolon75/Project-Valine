# Phase 6: Account Persistence Infrastructure - Migration Guide

## Overview
This document outlines the database migration required for Phase 6 and provides rollback procedures.

## Migration: Add onboardingComplete Field

### Migration File
`api/prisma/migrations/20251121203439_add_onboarding_complete/migration.sql`

### Changes
Adds a new `onboardingComplete` boolean field to the `users` table with a default value of `false`.

### SQL Statement
```sql
ALTER TABLE "users" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;
```

### Apply Migration

**IMPORTANT:** Always backup your database before running migrations in production.

#### Staging/Production
```bash
# 1. Backup database first
pg_dump $DATABASE_URL > backup_before_onboarding_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration
cd api
npx prisma migrate deploy

# 3. Verify migration
npx prisma migrate status
```

#### Development
```bash
cd api
npx prisma migrate dev
```

### Rollback Procedure

If you need to rollback this migration:

```sql
-- Connect to your database and run:
ALTER TABLE "users" DROP COLUMN "onboardingComplete";
```

Or create a rollback migration:

```bash
cd api
npx prisma migrate dev --name rollback_onboarding_complete
```

Then edit the migration file with:
```sql
ALTER TABLE "users" DROP COLUMN "onboardingComplete";
```

### Testing Migration

After applying the migration, verify:

1. **Field exists:**
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'onboardingComplete';
```

2. **Default value works:**
```sql
SELECT id, email, "onboardingComplete" 
FROM users 
LIMIT 5;
```

All existing users should have `onboardingComplete = false`.

3. **API endpoint works:**
```bash
# Test the new PATCH /api/me/profile endpoint
curl -X PATCH https://your-api-url/me/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test User",
    "headline": "Test headline",
    "bio": "Test bio"
  }'
```

The response should include `onboardingComplete: true` if the user has filled in the required fields.

## Deployment Order

1. **Deploy schema changes** (this migration)
2. **Deploy serverless API** (with new `updateMyProfile` endpoint)
3. **Deploy frontend** (if using the onboarding flow)

This order ensures the database is ready before the API tries to use the new field.

## Risk Assessment

- **Risk Level:** LOW
- **Impact:** Minimal - adds a new nullable/defaulted field
- **Rollback:** Simple - can drop column if needed
- **Data Loss:** None - no existing data is modified or deleted

## Related Files

- Schema: `api/prisma/schema.prisma`
- Migration: `api/prisma/migrations/20251121203439_add_onboarding_complete/migration.sql`
- API Handler: `serverless/src/handlers/profiles.js` (updateMyProfile function)
- Script: `scripts/admin-upsert-user.mjs`
- Serverless Config: `serverless/serverless.yml`

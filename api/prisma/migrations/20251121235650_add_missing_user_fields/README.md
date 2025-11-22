# Migration: Add Missing User Fields

**Created:** 2025-11-21  
**Migration ID:** 20251121235650_add_missing_user_fields

## Purpose

This migration adds two missing columns to the `users` table that are defined in the Prisma schema but were not previously migrated to the database:

- `status` - User account status (active/pending/suspended)
- `theme` - User theme preference (light/dark/system)

Note: The `onboardingComplete` field was already added in migration `20251121203439_add_onboarding_complete`.

## Changes

### Added Columns

1. **status** (VARCHAR(255), NOT NULL, DEFAULT 'active')
   - Tracks user account status
   - Default value: 'active'
   - Indexed for performance

2. **theme** (VARCHAR(255), NULLABLE)
   - Stores user theme preference
   - Optional field (nullable)

### Indexes

- `users_status_idx` - Index on the `status` column for efficient queries

## Safety Features

- Uses `IF NOT EXISTS` clauses for idempotency
- Safe to run multiple times without errors
- Backward compatible with existing data
- No data loss risk

## How to Apply

### Prerequisites

1. Ensure you have a valid `DATABASE_URL` environment variable set
2. Have access to the PostgreSQL database
3. Database user must have `ALTER TABLE` and `CREATE INDEX` permissions

### Apply Migration

```bash
# Navigate to api directory
cd api

# Set DATABASE_URL (if not already set)
export DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# Apply the migration
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### Verify Changes

After applying the migration, verify the columns exist:

```sql
-- Connect to your database and run:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('status', 'theme')
ORDER BY column_name;
```

Expected output:
```
 column_name | data_type | is_nullable | column_default
-------------|-----------|-------------|---------------
 status      | varchar   | NO          | 'active'
 theme       | varchar   | YES         | NULL
```

## Testing

After migration, test the admin-upsert-user.mjs script:

```bash
# From repository root
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email "test@example.com" \
  --password "Test123!" \
  --display-name "Test User"
```

The script should complete without errors.

## Rollback Plan

If you need to rollback this migration:

```sql
-- WARNING: This will delete data in these columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "status";
ALTER TABLE "users" DROP COLUMN IF EXISTS "theme";
DROP INDEX IF EXISTS "users_status_idx";
```

Then mark the migration as rolled back:

```bash
cd api
npx prisma migrate resolve --rolled-back 20251121235650_add_missing_user_fields
```

## Related Files

- Schema: `api/prisma/schema.prisma` (lines 28-30)
- Admin Script: `scripts/admin-upsert-user.mjs` (lines 284, 286)
- Previous Migration: `api/prisma/migrations/20251121203439_add_onboarding_complete/`

## Dependencies

- Prisma CLI: ^6.19.0
- @prisma/client: ^6.19.0
- PostgreSQL: 9.1 or higher (tested with 14.x)
  - Note: `ALTER TABLE ... IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` require PostgreSQL 9.1+

## Notes

- This migration does not modify existing user records
- All existing users will have `status = 'active'` and `theme = NULL` after migration
- The application code already expects these fields and will handle them correctly

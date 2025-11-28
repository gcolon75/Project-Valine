# profileComplete Column Migration

## Overview

This migration adds the `profileComplete` column to the `users` table. The column is defined in the Prisma schema but was missing from the production database, causing login failures.

## Quick Fix (Production)

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://USER:PASS@HOST:PORT/DB?sslmode=require"

# Run migration
node scripts/add-profilecomplete-column.mjs
```

## Verification

After running, check CloudWatch logs for the login function:

```bash
aws logs tail /aws/lambda/pv-api-prod-login --region us-west-2 --since 1m
```

Should no longer see "profileComplete does not exist" errors.

## Rollback (if needed)

```sql
ALTER TABLE users DROP COLUMN IF EXISTS "profileComplete";
DROP INDEX IF EXISTS users_profileComplete_idx;
DELETE FROM "_prisma_migrations" WHERE migration_name = '20251128020000_add_profilecomplete';
```

## Technical Details

### Migration Location

- **SQL File**: `serverless/prisma/migrations/20251128020000_add_profilecomplete/migration.sql`
- **Script**: `scripts/add-profilecomplete-column.mjs`

### Column Specification

| Property | Value |
|----------|-------|
| Name | `profileComplete` |
| Type | `BOOLEAN` |
| Nullable | `NOT NULL` |
| Default | `false` |

### Index

An index `users_profileComplete_idx` is created on the column for query optimization.

## Troubleshooting

### Connection Issues

If you see SSL errors, ensure your `DATABASE_URL` includes `?sslmode=require` and that you're running with the correct `NODE_ENV`:

```bash
NODE_ENV=production node scripts/add-profilecomplete-column.mjs
```

### Migration Already Applied

The migration is idempotent - it checks if the column exists before adding it. Re-running the script is safe.

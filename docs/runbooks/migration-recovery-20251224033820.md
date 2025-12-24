# Migration Recovery: 20251224033820_add_post_access_system

## Problem

The migration `20251224033820_add_post_access_system` failed in production with error:
```
ERROR: column "price" of relation "posts" already exists (Postgres error 42701)
```

This occurred because the migration attempted to add columns that may already exist in the database.

## Root Cause

The original migration SQL used non-idempotent statements like:
- `ALTER TABLE "posts" ADD COLUMN "price"` (fails if column exists)
- `CREATE TYPE "Visibility"` (fails if type exists)
- `CREATE TABLE "access_requests"` (fails if table exists)

## Solution

The migration has been updated to be **idempotent** using PostgreSQL's conditional DDL:
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object ...` for enums
- Conditional checks for foreign keys

## Recovery Procedure

### Option 1: Mark as Applied (Recommended if columns already exist)

If the columns and tables already exist in production (either from a partial migration or manual changes):

```bash
# 1. Connect to production database
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# 2. Set DATABASE_URL (use your production database URL)
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# 3. Check current migration status
./node_modules/.bin/prisma migrate status

# 4. If migration shows as failed/pending, mark it as applied
./node_modules/.bin/prisma migrate resolve --applied "20251224033820_add_post_access_system"

# 5. Verify
./node_modules/.bin/prisma migrate status
```

### Option 2: Re-run Idempotent Migration

If the migration failed partway through and you want to complete it:

```bash
# 1. Connect to production database
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# 2. Set DATABASE_URL (use your production database URL)
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# 3. Mark the failed migration as rolled back
./node_modules/.bin/prisma migrate resolve --rolled-back "20251224033820_add_post_access_system"

# 4. Re-run migrations (the updated idempotent SQL will handle existing objects)
./node_modules/.bin/prisma migrate deploy

# 5. Verify
./node_modules/.bin/prisma migrate status
```

### Option 3: Manual SQL Execution (Advanced)

If you need to manually verify the database state:

```bash
# 1. Connect to database
psql "$DATABASE_URL"

# 2. Check if columns exist
\d posts

# 3. Check if types exist
SELECT typname FROM pg_type WHERE typname IN ('Visibility', 'RequestStatus');

# 4. Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('access_requests', 'access_grants');

# 5. If needed, run the idempotent migration manually
\i /home/runner/work/Project-Valine/Project-Valine/serverless/prisma/migrations/20251224033820_add_post_access_system/migration.sql

# 6. Exit and mark as applied
\q
cd /home/runner/work/Project-Valine/Project-Valine/serverless
./node_modules/.bin/prisma migrate resolve --applied "20251224033820_add_post_access_system"
```

## Verification

After recovery, verify the schema is correct:

```bash
# 1. Check migration status
cd /home/runner/work/Project-Valine/Project-Valine/serverless
export DATABASE_URL="..."
./node_modules/.bin/prisma migrate status

# Expected output: All migrations have been applied

# 2. Verify Post model fields exist
psql "$DATABASE_URL" -c "\d posts"

# Expected columns:
# - isFree (boolean)
# - price (double precision)
# - thumbnailUrl (text)
# - requiresAccess (boolean)
# - allowDownload (boolean)
# - visibility (enum: Visibility)

# 3. Verify new tables exist
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE tablename IN ('access_requests', 'access_grants');"

# Expected: Both tables should be listed

# 4. Test Prisma Client
./node_modules/.bin/prisma generate
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.post.findFirst().then(() => console.log('✅ Prisma working')).catch(e => console.error('❌ Error:', e.message)).finally(() => prisma.\$disconnect());"
```

## Prevention

To prevent similar issues in the future:

1. **Always use idempotent SQL** in migrations:
   - `IF NOT EXISTS` for creating objects
   - `IF EXISTS` for dropping objects
   - Exception handling for enum creation
   - Conditional checks for constraint addition

2. **Test migrations** against a production-like database before deploying:
   ```bash
   # Create a copy of production schema
   pg_dump $PROD_DATABASE_URL --schema-only > prod_schema.sql
   
   # Restore to test database
   psql $TEST_DATABASE_URL < prod_schema.sql
   
   # Test migration
   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
   ```

3. **Keep schemas synchronized**: Always keep `serverless/prisma/schema.prisma` and `api/prisma/schema.prisma` in sync to prevent drift.

## Related Documentation

- [PROJECT_BIBLE.md](../PROJECT_BIBLE.md) - Section on Database Migrations
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL IF NOT EXISTS](https://www.postgresql.org/docs/current/sql-altertable.html)

## Status

- **Migration Updated:** ✅ 2024-12-24
- **Idempotency Added:** ✅ Yes
- **Tested:** ⏳ Awaiting production test
- **Applied to Production:** ⏳ Pending

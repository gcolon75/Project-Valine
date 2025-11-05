# Rollback: Add Profile Links Ordering

## Overview
This migration adds a `position` column to the `profile_links` table for custom ordering.

## Rollback SQL

```sql
-- Drop the index
DROP INDEX IF EXISTS "profile_links_userId_position_idx";

-- Remove the position column
ALTER TABLE "profile_links" DROP COLUMN IF EXISTS "position";
```

## Steps to Rollback

1. **Backup Data** (recommended):
   ```bash
   pg_dump -h <host> -U <user> -d <database> -t profile_links > profile_links_backup.sql
   ```

2. **Run Rollback SQL**:
   ```bash
   psql -h <host> -U <user> -d <database> -f rollback.sql
   ```

3. **Regenerate Prisma Client**:
   ```bash
   cd api
   npx prisma generate
   ```

4. **Restart Application**:
   ```bash
   # Restart your Node.js server
   ```

## Impact
- Low risk: Column is additive only
- No data loss when rolling back
- Existing queries continue to work
- Default value of 0 means all existing links maintain consistent ordering

## Validation
After rollback, verify:
```sql
-- Check column is removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profile_links' AND column_name = 'position';
-- Should return 0 rows

-- Check index is removed
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'profile_links' AND indexname = 'profile_links_userId_position_idx';
-- Should return 0 rows
```

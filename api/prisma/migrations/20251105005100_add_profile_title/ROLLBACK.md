# Migration Rollback: Add Profile Title

## Migration Details
- **Migration ID**: 20251105005100_add_profile_title
- **Date**: 2025-11-05
- **Change**: Added `title` field to `profiles` table

## Rollback Steps

### 1. Backup Data (Optional but Recommended)
If you need to preserve title data before rollback:

```sql
-- Save titles to a backup table
CREATE TABLE profiles_title_backup AS
SELECT id, title FROM profiles WHERE title IS NOT NULL;
```

### 2. Execute Rollback SQL

```sql
-- Remove the title column
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "title";
```

### 3. Verify Rollback

```sql
-- Verify column is removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'title';
-- Should return 0 rows
```

### 4. Restore Data (If Needed)

If you later re-apply this migration and need to restore backed-up data:

```sql
-- Restore titles from backup
UPDATE profiles p
SET title = b.title
FROM profiles_title_backup b
WHERE p.id = b.id;

-- Clean up backup table
DROP TABLE profiles_title_backup;
```

## Impact Assessment

### Low Risk Changes ✅
- Column is nullable - no data integrity issues
- No foreign key constraints involved
- No indexes affected
- Existing queries unaffected (column is additive only)

### Post-Rollback Actions

1. **Update Application Code**: Remove or comment out title field handling
2. **Frontend**: Remove UI for editing/displaying profile title
3. **Documentation**: Update API documentation to remove title field
4. **Clear Cache**: If using Redis or similar, clear any cached profile data

## Testing Rollback

Before executing in production:

```bash
# Test in development environment first
cd api
DATABASE_URL="postgresql://test_db" npx prisma migrate resolve --rolled-back 20251105005100_add_profile_title

# Verify schema
npx prisma db pull
```

## Notes

- This migration is **safe to rollback** as the field is nullable
- No data loss for profiles
- Title field will be lost, but no core functionality affected
- Consider whether to preserve title data before rollback

# Migration Rollback: Add User Theme Preference

## Migration Details
- **Migration ID**: 20251105004900_add_user_theme_preference
- **Date**: 2025-11-05
- **Change**: Added `theme` field to `users` table

## Rollback Steps

### 1. Backup Data (Optional but Recommended)
If you need to preserve theme preferences before rollback:

```sql
-- Save theme preferences to a backup table
CREATE TABLE users_theme_backup AS
SELECT id, theme FROM users WHERE theme IS NOT NULL;
```

### 2. Execute Rollback SQL

```sql
-- Remove the theme column
ALTER TABLE "users" DROP COLUMN IF EXISTS "theme";
```

### 3. Verify Rollback

```sql
-- Verify column is removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'theme';
-- Should return 0 rows
```

### 4. Restore Data (If Needed)

If you later re-apply this migration and need to restore backed-up data:

```sql
-- Restore theme preferences from backup
UPDATE users u
SET theme = b.theme
FROM users_theme_backup b
WHERE u.id = b.id;

-- Clean up backup table
DROP TABLE users_theme_backup;
```

## Impact Assessment

### Low Risk Changes ✅
- Column is nullable - no data integrity issues
- No foreign key constraints involved
- No indexes affected
- Existing queries unaffected (column is additive only)

### Post-Rollback Actions

1. **Update Application Code**: Remove or comment out theme preference endpoints
2. **Frontend**: Remove theme preference API calls or fallback to localStorage only
3. **Documentation**: Update API documentation to remove theme preference endpoints
4. **Clear Cache**: If using Redis or similar, clear any cached user preference data

## Testing Rollback

Before executing in production:

```bash
# Test in development environment first
cd api
DATABASE_URL="postgresql://test_db" npx prisma migrate resolve --rolled-back 20251105004900_add_user_theme_preference

# Verify schema
npx prisma db pull
```

## Notes

- This migration is **safe to rollback** as the field is nullable
- No data loss for user accounts
- Theme preferences will revert to frontend-only (localStorage)
- Users will need to reset their theme preference if migration is re-applied

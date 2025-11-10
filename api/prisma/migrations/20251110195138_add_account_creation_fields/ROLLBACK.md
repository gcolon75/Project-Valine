# Rollback Plan: Add Account Creation Fields

## Migration: 20251110195138_add_account_creation_fields

### What This Migration Does
- Adds `normalizedEmail` field to User table with unique constraint
- Adds `emailVerifiedAt` timestamp field
- Adds `status` field with default 'active'
- Backfills data for existing users

### Rollback SQL

```sql
-- Remove the unique index on normalizedEmail
DROP INDEX IF EXISTS "users_normalizedEmail_key";

-- Remove the added columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "normalizedEmail";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerifiedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "status";
```

### Rollback Impact
- **Data Loss**: None - only removes newly added columns
- **Breaking Changes**: API endpoints using these fields will fail
- **Downtime**: Minimal (< 1 second for schema change)

### When to Rollback
Rollback this migration if:
- The new authentication system causes critical issues
- Deployment needs to be reverted to previous version
- Database performance degrades unexpectedly

### Manual Steps After Rollback
1. Deploy previous version of API code
2. Clear any cached user data in application
3. Notify users if signup/verification was temporarily affected

### Notes
- Safe to rollback - this is an additive migration
- Application code must be reverted before or simultaneously
- No user accounts will be deleted during rollback

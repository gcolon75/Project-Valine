-- Rollback migration: Remove session audits and 2FA fields

-- Drop foreign key constraint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_userId_fkey";

-- Drop RefreshToken table
DROP TABLE IF EXISTS "refresh_tokens";

-- Remove 2FA columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret";
ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled";

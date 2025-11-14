-- Rollback migration: Remove email verification fields and table

-- Drop foreign key constraint
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT IF EXISTS "email_verification_tokens_userId_fkey";

-- Drop EmailVerificationToken table
DROP TABLE IF EXISTS "email_verification_tokens";

-- Drop normalizedEmail index
DROP INDEX IF EXISTS "users_normalizedEmail_key";

-- Remove columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerifiedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "normalizedEmail";

-- AlterTable
-- Add theme preference field to users table
-- Field is nullable to allow existing users to have NULL (system default)
ALTER TABLE "users" ADD COLUMN "theme" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "users"."theme" IS 'User theme preference: light or dark. NULL means use system default.';

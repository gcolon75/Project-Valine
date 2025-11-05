-- AlterTable
-- Add title field to profiles table
-- Field is nullable to allow existing profiles to have NULL
ALTER TABLE "profiles" ADD COLUMN "title" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "profiles"."title" IS 'Professional title or designation (e.g., "Senior Voice Actor", "Casting Director")';

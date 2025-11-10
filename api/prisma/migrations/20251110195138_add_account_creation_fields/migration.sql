-- Add account creation and verification fields to User table
-- This migration is safe and additive - no existing data is removed

-- Add normalizedEmail column (nullable first for existing records)
ALTER TABLE "users" ADD COLUMN "normalizedEmail" TEXT;

-- Add emailVerifiedAt column
ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Add status column with default value
ALTER TABLE "users" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- Backfill normalizedEmail for existing users (lowercase and trim)
UPDATE "users" SET "normalizedEmail" = LOWER(TRIM("email")) WHERE "normalizedEmail" IS NULL;

-- Backfill emailVerifiedAt for users already marked as verified
UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerified" = true AND "emailVerifiedAt" IS NULL;

-- Backfill status for existing users (assume active if they exist)
UPDATE "users" SET "status" = 'active' WHERE "status" IS NULL;

-- Make normalizedEmail NOT NULL and add unique constraint
ALTER TABLE "users" ALTER COLUMN "normalizedEmail" SET NOT NULL;
CREATE UNIQUE INDEX "users_normalizedEmail_key" ON "users"("normalizedEmail");

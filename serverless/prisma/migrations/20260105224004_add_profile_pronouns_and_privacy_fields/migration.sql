-- AlterTable: Add pronouns and privacy-related fields to profiles table (idempotent)
-- This migration adds fields for profile display preferences, privacy settings, 
-- and notification preferences that were referenced in the profile handler but 
-- missing from the schema.
--
-- Note: visibility and messagePermission use TEXT instead of ENUM types for flexibility.
-- Values are validated at the application layer in serverless/src/handlers/profiles.js.
-- This approach matches the existing codebase pattern and avoids the complexity of
-- creating and managing PostgreSQL ENUMs in migrations.

ALTER TABLE "profiles" 
  ADD COLUMN IF NOT EXISTS "pronouns" TEXT,
  ADD COLUMN IF NOT EXISTS "showPronouns" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showLocation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showAvailability" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "messagePermission" TEXT NOT NULL DEFAULT 'EVERYONE',
  ADD COLUMN IF NOT EXISTS "isSearchable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyOnFollow" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyOnMessage" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyOnPostShare" BOOLEAN NOT NULL DEFAULT true;

-- Rollback script for add_moderation_models migration
-- This script removes the moderation tables added in the migration

-- Drop foreign key first
ALTER TABLE "moderation_actions" DROP CONSTRAINT IF EXISTS "moderation_actions_reportId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "moderation_reports_reporterId_idx";
DROP INDEX IF EXISTS "moderation_reports_targetType_targetId_idx";
DROP INDEX IF EXISTS "moderation_reports_status_idx";
DROP INDEX IF EXISTS "moderation_reports_category_idx";
DROP INDEX IF EXISTS "moderation_reports_severity_idx";
DROP INDEX IF EXISTS "moderation_reports_createdAt_idx";
DROP INDEX IF EXISTS "moderation_actions_reportId_idx";
DROP INDEX IF EXISTS "moderation_actions_actorId_idx";
DROP INDEX IF EXISTS "moderation_actions_createdAt_idx";

-- Drop tables
DROP TABLE IF EXISTS "moderation_actions";
DROP TABLE IF EXISTS "moderation_reports";

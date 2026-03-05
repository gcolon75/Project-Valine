-- Add includeWatermark column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "includeWatermark" BOOLEAN NOT NULL DEFAULT false;

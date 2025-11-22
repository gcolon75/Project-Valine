-- Add missing columns to users table
-- This migration fixes columns that were marked as applied but never executed

-- Add onboardingComplete column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'onboardingComplete'
  ) THEN
    ALTER TABLE users ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for onboardingComplete (if not exists)
CREATE INDEX IF NOT EXISTS users_onboardingComplete_idx ON users("onboardingComplete");

-- Add status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Create index for status (if not exists)
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

-- Add theme column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'theme'
  ) THEN
    ALTER TABLE users ADD COLUMN theme VARCHAR(255) DEFAULT 'light';
  END IF;
END $$;

-- Verification: Count columns to confirm they exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT 'onboardingComplete' AS column_name
    UNION ALL SELECT 'status'
    UNION ALL SELECT 'theme'
  ) expected
  WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  );
  
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Migration failed: columns still missing: %', missing_columns;
  END IF;
  
  RAISE NOTICE 'Migration successful: All columns exist';
END $$;

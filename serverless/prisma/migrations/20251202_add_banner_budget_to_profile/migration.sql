-- Add bannerUrl, budgetMin, and budgetMax columns to profiles table
-- These fields support profile banner images and budget range preferences

-- Add bannerUrl column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'bannerUrl'
  ) THEN
    ALTER TABLE profiles ADD COLUMN "bannerUrl" TEXT;
  END IF;
END $$;

-- Add budgetMin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'budgetMin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN "budgetMin" INTEGER;
  END IF;
END $$;

-- Add budgetMax column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'budgetMax'
  ) THEN
    ALTER TABLE profiles ADD COLUMN "budgetMax" INTEGER;
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  missing_columns TEXT := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'bannerUrl'
  ) THEN
    missing_columns := missing_columns || 'bannerUrl ';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'budgetMin'
  ) THEN
    missing_columns := missing_columns || 'budgetMin ';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'budgetMax'
  ) THEN
    missing_columns := missing_columns || 'budgetMax ';
  END IF;
  
  IF missing_columns != '' THEN
    RAISE EXCEPTION 'Migration failed: columns still missing: %', missing_columns;
  END IF;
  
  RAISE NOTICE 'Migration successful: bannerUrl, budgetMin, budgetMax columns exist';
END $$;

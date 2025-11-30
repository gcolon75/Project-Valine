-- Add title column to profiles table if it doesn't exist
-- Note: title is nullable (TEXT without NOT NULL) to match the schema definition (String?)
-- and to maintain backwards compatibility with existing profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE profiles ADD COLUMN "title" TEXT;
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'title'
  ) THEN
    RAISE EXCEPTION 'Migration failed: title column still missing';
  END IF;
  
  RAISE NOTICE 'Migration successful: title column exists';
END $$;

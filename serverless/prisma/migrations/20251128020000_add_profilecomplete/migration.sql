-- Add profileComplete column if it doesn't exist
DO $ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'profileComplete'
  ) THEN
    ALTER TABLE users ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX users_profileComplete_idx ON users("profileComplete");
  END IF;
END $;

-- Verification
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'profileComplete'
  ) THEN
    RAISE EXCEPTION 'Migration failed: profileComplete column still missing';
  END IF;
  
  RAISE NOTICE 'Migration successful: profileComplete column exists';
END $;

-- AddForeignKey: Create relationship between posts.mediaId and media.id
-- This migration adds the foreign key constraint for the Post-Media relation
-- Note: The mediaId column was previously added manually; this adds the FK constraint

-- Create index on mediaId for better query performance
CREATE INDEX IF NOT EXISTS "posts_mediaId_idx" ON "posts"("mediaId");

-- Add foreign key constraint (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_mediaId_fkey'
  ) THEN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_mediaId_fkey" 
      FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

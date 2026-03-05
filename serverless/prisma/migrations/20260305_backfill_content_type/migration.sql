-- Backfill contentType for existing posts based on audioUrl and linked media file extension

-- 1. Posts with audioUrl are audio posts
UPDATE posts
SET "contentType" = 'audio'
WHERE "contentType" IS NULL
  AND "audioUrl" IS NOT NULL;

-- 2. Posts linked to media with PDF/doc extensions are scripts
UPDATE posts
SET "contentType" = 'script'
WHERE "contentType" IS NULL
  AND "mediaId" IS NOT NULL
  AND "mediaId" IN (
    SELECT id FROM media
    WHERE LOWER("s3Key") ~ '\.(pdf|doc|docx)$'
  );

-- 3. Posts linked to media with video extensions are reels
UPDATE posts
SET "contentType" = 'reel'
WHERE "contentType" IS NULL
  AND "mediaId" IS NOT NULL
  AND "mediaId" IN (
    SELECT id FROM media
    WHERE LOWER("s3Key") ~ '\.(mp4|mov|webm)$'
  );

-- 4. Posts linked to media with audio extensions are audio
UPDATE posts
SET "contentType" = 'audio'
WHERE "contentType" IS NULL
  AND "mediaId" IS NOT NULL
  AND "mediaId" IN (
    SELECT id FROM media
    WHERE LOWER("s3Key") ~ '\.(mp3|wav|m4a)$'
  );

-- 5. Remaining posts with media typed as 'video' → reel
UPDATE posts
SET "contentType" = 'reel'
WHERE "contentType" IS NULL
  AND "mediaId" IS NOT NULL
  AND "mediaId" IN (
    SELECT id FROM media WHERE "type" = 'video'
  );

-- 6. Remaining posts with media typed as 'audio' → audio
UPDATE posts
SET "contentType" = 'audio'
WHERE "contentType" IS NULL
  AND "mediaId" IS NOT NULL
  AND "mediaId" IN (
    SELECT id FROM media WHERE "type" = 'audio'
  );

-- 7. Remaining posts with media typed as 'document' → script
UPDATE posts
SET "contentType" = 'script'
WHERE "contentType" IS NULL
  AND "mediaId" IS NOT NULL
  AND "mediaId" IN (
    SELECT id FROM media WHERE "type" = 'document'
  );

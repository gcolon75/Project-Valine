-- AlterTable
-- Add position column with default value of 0 for ordering profile links
ALTER TABLE "profile_links" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
-- Add composite index for efficient ordering queries
CREATE INDEX "profile_links_userId_position_idx" ON "profile_links"("userId", "position");

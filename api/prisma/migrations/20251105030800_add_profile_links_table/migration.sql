-- CreateTable
-- Create normalized profile_links table for managing user profile links
-- This replaces the JSON socialLinks field with a proper relational structure
CREATE TABLE "profile_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Index on userId for efficient user-based queries
CREATE INDEX "profile_links_userId_idx" ON "profile_links"("userId");

-- CreateIndex
-- Index on profileId for efficient profile-based queries
CREATE INDEX "profile_links_profileId_idx" ON "profile_links"("profileId");

-- AddForeignKey
-- Foreign key constraint to users table with cascade delete
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- Foreign key constraint to profiles table with cascade delete
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "profile_links" IS 'Normalized table for user profile links (website, IMDB, showreel, etc.)';
COMMENT ON COLUMN "profile_links"."label" IS 'Display label for the link (1-40 characters)';
COMMENT ON COLUMN "profile_links"."url" IS 'The URL for the profile link (must be http/https)';
COMMENT ON COLUMN "profile_links"."type" IS 'Type of link: website, imdb, showreel, or other';

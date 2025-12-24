-- CreateEnum: Visibility enum for posts
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY');

-- CreateEnum: RequestStatus enum for access requests
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable: Add new fields to posts table
ALTER TABLE "posts" ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "price" DOUBLE PRECISION,
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "requiresAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowDownload" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Convert visibility from TEXT to Visibility enum
-- First, update any non-standard values
UPDATE "posts" SET "visibility" = 'PUBLIC' WHERE "visibility" NOT IN ('PUBLIC', 'FOLLOWERS_ONLY');

-- Drop the old TEXT column and recreate as enum
ALTER TABLE "posts" DROP COLUMN "visibility";
ALTER TABLE "posts" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex: Add index on visibility
CREATE INDEX "posts_visibility_idx" ON "posts"("visibility");

-- CreateTable: AccessRequest model
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AccessGrant model
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AccessRequest indexes
CREATE INDEX "access_requests_postId_idx" ON "access_requests"("postId");
CREATE INDEX "access_requests_requesterId_idx" ON "access_requests"("requesterId");
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");
CREATE UNIQUE INDEX "access_requests_postId_requesterId_key" ON "access_requests"("postId", "requesterId");

-- CreateIndex: AccessGrant indexes
CREATE INDEX "access_grants_postId_idx" ON "access_grants"("postId");
CREATE INDEX "access_grants_userId_idx" ON "access_grants"("userId");
CREATE INDEX "access_grants_expiresAt_idx" ON "access_grants"("expiresAt");
CREATE UNIQUE INDEX "access_grants_postId_userId_key" ON "access_grants"("postId", "userId");

-- AddForeignKey: AccessRequest relations
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: AccessGrant relations
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

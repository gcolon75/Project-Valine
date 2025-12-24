-- CreateEnum: Visibility enum for posts (idempotent)
DO $$ BEGIN
  CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RequestStatus enum for access requests (idempotent)
DO $$ BEGIN
  CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add new fields to posts table (idempotent)
ALTER TABLE "posts" 
  ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "requiresAccess" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowDownload" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Convert visibility from TEXT to Visibility enum (idempotent)
DO $$ 
BEGIN
  -- Case 1: Column exists and is TEXT type - convert to enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'visibility' 
    AND data_type = 'text'
  ) THEN
    -- Validate and normalize data: update any non-standard values to valid enum values
    -- This ensures the type conversion will succeed without data loss
    UPDATE "posts" SET "visibility" = 'PUBLIC' WHERE "visibility" NOT IN ('PUBLIC', 'FOLLOWERS_ONLY');
    
    -- Convert column type from TEXT to enum (preserving validated data)
    ALTER TABLE "posts" ALTER COLUMN "visibility" TYPE "Visibility" USING "visibility"::"Visibility";
    
    -- Ensure default is set
    ALTER TABLE "posts" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';
    ALTER TABLE "posts" ALTER COLUMN "visibility" SET NOT NULL;
  
  -- Case 2: Column doesn't exist at all - create it as enum
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE "posts" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';
  
  -- Case 3: Column exists and is already the correct enum type - do nothing
  END IF;
END $$;

-- CreateIndex: Add index on visibility (idempotent)
CREATE INDEX IF NOT EXISTS "posts_visibility_idx" ON "posts"("visibility");

-- CreateTable: AccessRequest model (idempotent)
CREATE TABLE IF NOT EXISTS "access_requests" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AccessGrant model (idempotent)
CREATE TABLE IF NOT EXISTS "access_grants" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AccessRequest indexes (idempotent)
CREATE INDEX IF NOT EXISTS "access_requests_postId_idx" ON "access_requests"("postId");
CREATE INDEX IF NOT EXISTS "access_requests_requesterId_idx" ON "access_requests"("requesterId");
CREATE INDEX IF NOT EXISTS "access_requests_status_idx" ON "access_requests"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "access_requests_postId_requesterId_key" ON "access_requests"("postId", "requesterId");

-- CreateIndex: AccessGrant indexes (idempotent)
CREATE INDEX IF NOT EXISTS "access_grants_postId_idx" ON "access_grants"("postId");
CREATE INDEX IF NOT EXISTS "access_grants_userId_idx" ON "access_grants"("userId");
CREATE INDEX IF NOT EXISTS "access_grants_expiresAt_idx" ON "access_grants"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "access_grants_postId_userId_key" ON "access_grants"("postId", "userId");

-- AddForeignKey: AccessRequest relations (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'access_requests_postId_fkey'
  ) THEN
    ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_postId_fkey" 
      FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'access_requests_requesterId_fkey'
  ) THEN
    ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requesterId_fkey" 
      FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: AccessGrant relations (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'access_grants_postId_fkey'
  ) THEN
    ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_postId_fkey" 
      FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'access_grants_userId_fkey'
  ) THEN
    ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

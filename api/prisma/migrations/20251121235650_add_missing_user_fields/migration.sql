-- AlterTable
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "theme" VARCHAR(255);

-- CreateIndex (for performance)
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");

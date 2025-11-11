-- AlterTable: Add email verification fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "normalizedEmail" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- CreateIndex: Add unique index on normalizedEmail
CREATE UNIQUE INDEX IF NOT EXISTS "users_normalizedEmail_key" ON "users"("normalizedEmail");

-- CreateTable: EmailVerificationToken
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on token
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex: Index on userId
CREATE INDEX IF NOT EXISTS "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex: Index on token
CREATE INDEX IF NOT EXISTS "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_userId_fkey'
    ) THEN
        ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

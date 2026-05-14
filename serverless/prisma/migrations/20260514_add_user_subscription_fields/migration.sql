-- Add subscription / billing columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodEnd" TIMESTAMP(3);

-- Unique indexes for Stripe IDs (allow multiple NULLs in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

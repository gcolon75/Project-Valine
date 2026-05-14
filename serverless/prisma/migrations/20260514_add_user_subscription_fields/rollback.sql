-- Rollback for 20260514_add_user_subscription_fields
DROP INDEX IF EXISTS "users_stripeSubscriptionId_key";
DROP INDEX IF EXISTS "users_stripeCustomerId_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionCurrentPeriodEnd";
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionStatus";
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "plan";

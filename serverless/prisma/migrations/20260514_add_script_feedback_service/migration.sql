-- Add reader-pool fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isReader" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pendingPayoutCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthlyFreeEvalUsedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_isReader_idx" ON "users"("isReader");

-- Script feedback service (Part 2 of JointPlan: paid marketplace)
CREATE TABLE IF NOT EXISTS "script_feedback_requests" (
    "id" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "readerId" TEXT,
    "title" TEXT NOT NULL,
    "scriptUrl" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "totalPaidCents" INTEGER NOT NULL,
    "readerEarningsCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "adminApprovedBy" TEXT,
    "adminApprovedAt" TIMESTAMP(3),
    "denyReason" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "summaryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_feedback_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "script_feedback_requests_stripeSessionId_key"
    ON "script_feedback_requests"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "script_feedback_requests_writerId_idx"
    ON "script_feedback_requests"("writerId");
CREATE INDEX IF NOT EXISTS "script_feedback_requests_readerId_idx"
    ON "script_feedback_requests"("readerId");
CREATE INDEX IF NOT EXISTS "script_feedback_requests_status_idx"
    ON "script_feedback_requests"("status");
CREATE INDEX IF NOT EXISTS "script_feedback_requests_createdAt_idx"
    ON "script_feedback_requests"("createdAt");

ALTER TABLE "script_feedback_requests"
    ADD CONSTRAINT "script_feedback_requests_writerId_fkey"
    FOREIGN KEY ("writerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "script_feedback_requests"
    ADD CONSTRAINT "script_feedback_requests_readerId_fkey"
    FOREIGN KEY ("readerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Make existing feedback_annotations.feedbackRequestId nullable, and add scriptFeedbackRequestId
-- so the same annotation table powers both peer feedback and paid script feedback.
ALTER TABLE "feedback_annotations" ALTER COLUMN "feedbackRequestId" DROP NOT NULL;
ALTER TABLE "feedback_annotations" ADD COLUMN IF NOT EXISTS "scriptFeedbackRequestId" TEXT;

CREATE INDEX IF NOT EXISTS "feedback_annotations_scriptFeedbackRequestId_idx"
    ON "feedback_annotations"("scriptFeedbackRequestId");

ALTER TABLE "feedback_annotations"
    ADD CONSTRAINT "feedback_annotations_scriptFeedbackRequestId_fkey"
    FOREIGN KEY ("scriptFeedbackRequestId") REFERENCES "script_feedback_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: PRIntelligence (Phase 4)
CREATE TABLE IF NOT EXISTS "pr_intelligence" (
    "id" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "changedFilesCount" INTEGER NOT NULL,
    "sensitivePathsCount" INTEGER NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pr_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pr_intelligence_prNumber_idx" ON "pr_intelligence"("prNumber");
CREATE INDEX IF NOT EXISTS "pr_intelligence_riskScore_idx" ON "pr_intelligence"("riskScore");

-- CreateTable: TestRun (Phase 5)
CREATE TABLE IF NOT EXISTS "test_runs" (
    "id" TEXT NOT NULL,
    "suite" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "test_runs_suite_testName_idx" ON "test_runs"("suite", "testName");
CREATE INDEX IF NOT EXISTS "test_runs_runAt_idx" ON "test_runs"("runAt");
CREATE INDEX IF NOT EXISTS "test_runs_status_idx" ON "test_runs"("status");

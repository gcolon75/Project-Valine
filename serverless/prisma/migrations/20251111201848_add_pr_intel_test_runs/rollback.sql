-- Rollback: Remove PR Intelligence and Test Runs tables

DROP TABLE IF EXISTS "test_runs";
DROP TABLE IF EXISTS "pr_intelligence";

/**
 * Flaky Test Detector Support (Phase 5)
 * Provides endpoints for test result ingestion and flaky test analysis
 */

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

const FLAKY_DETECTOR_ENABLED = process.env.FLAKY_DETECTOR_ENABLED === 'true';

/**
 * POST /internal/tests/ingest
 * Ingest test results from CI
 * Body: { tests: [{ suite, testName, status, durationMs, metadata? }] }
 */
export const ingestTestRuns = async (event) => {
  try {
    if (!FLAKY_DETECTOR_ENABLED) {
      return error('Flaky test detector feature is not enabled', 404);
    }

    const body = JSON.parse(event.body || '{}');
    const { tests } = body;

    if (!Array.isArray(tests) || tests.length === 0) {
      return error('tests array is required and must not be empty', 400);
    }

    // Validate test records
    for (const test of tests) {
      if (!test.suite || !test.testName || !test.status || typeof test.durationMs !== 'number') {
        return error('Each test must have suite, testName, status, and durationMs', 400);
      }
    }

    const prisma = getPrisma();

    // Bulk create test run records
    const result = await prisma.testRun.createMany({
      data: tests.map(test => ({
        suite: test.suite,
        testName: test.testName,
        status: test.status,
        durationMs: test.durationMs,
        metadata: test.metadata || null,
      })),
    });

    return json({
      message: 'Test runs ingested successfully',
      count: result.count,
    }, 201);
  } catch (e) {
    console.error('Test ingest error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /internal/tests/flaky-candidates
 * Get tests that show flaky behavior (failing between 20-60% of time)
 * Query params: minRuns (default 10)
 */
export const getFlakyCandidates = async (event) => {
  try {
    if (!FLAKY_DETECTOR_ENABLED) {
      return error('Flaky test detector feature is not enabled', 404);
    }

    const minRuns = parseInt(event.queryStringParameters?.minRuns || '10', 10);

    const prisma = getPrisma();

    // Get all tests with their run counts
    const testStats = await prisma.$queryRaw`
      SELECT 
        suite,
        "testName",
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_runs,
        AVG("durationMs") as avg_duration,
        MAX("runAt") as last_run
      FROM test_runs
      GROUP BY suite, "testName"
      HAVING COUNT(*) >= ${minRuns}
    `;

    // Calculate flakiness and filter
    const flakyCandidates = testStats
      .map(test => {
        const totalRuns = Number(test.total_runs);
        const failedRuns = Number(test.failed_runs);
        const failureRate = failedRuns / totalRuns;
        
        return {
          suite: test.suite,
          testName: test.testName,
          totalRuns,
          failedRuns,
          passedRuns: Number(test.passed_runs),
          failureRate: Math.round(failureRate * 1000) / 10, // percentage with 1 decimal
          avgDuration: Math.round(Number(test.avg_duration)),
          lastRun: test.last_run,
          isFlaky: failureRate >= 0.2 && failureRate <= 0.6, // 20-60% failure rate
        };
      })
      .filter(test => test.isFlaky)
      .sort((a, b) => {
        // Sort by how close to 50% (most unpredictable)
        const aDist = Math.abs(a.failureRate - 50);
        const bDist = Math.abs(b.failureRate - 50);
        return aDist - bDist;
      });

    return json({
      flakyCandidates,
      totalCandidates: flakyCandidates.length,
      minRuns,
      analysisDate: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Get flaky candidates error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

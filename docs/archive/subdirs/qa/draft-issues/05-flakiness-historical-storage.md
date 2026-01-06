# Enhancement: Flakiness Historical Storage (Persist Test Results Snapshot)

**Labels:** `enhancement`, `analyzer`, `testing`  
**Dependency:** None

## Context

The orchestration analysis tool identifies flaky tests (< 20% failure rate) in Playwright results but doesn't persist historical data. Without historical context, it's impossible to track:
- Which tests are consistently flaky over time
- Whether flakiness is improving or degrading
- Patterns in flaky test behavior (time of day, specific commits, etc.)
- Long-term trends in test stability

## Problem Statement

Current limitations:
- No historical test result storage
- Cannot track flakiness trends over time
- No way to identify "always flaky" vs "newly flaky" tests
- Difficult to prioritize which flaky tests to fix first
- No metrics for test suite health over time

This leads to:
- Repeatedly triaging the same flaky tests
- No visibility into test stability improvements
- Difficulty justifying time spent fixing flaky tests
- No data-driven approach to test suite maintenance

## Rationale

Historical test result storage enables:
- **Trend analysis**: Track test stability over weeks/months
- **Prioritization**: Fix consistently flaky tests first
- **Regression detection**: Identify when tests became flaky
- **Health metrics**: Dashboard of test suite stability
- **Data-driven decisions**: Justify test maintenance work

## Proposed Solution

Store minimal test result snapshots in a lightweight database or file storage:

```javascript
// Minimal snapshot schema
{
  "workflow_run_id": "123456789",
  "commit_sha": "abc123def456",
  "branch": "main",
  "timestamp": "2025-11-10T19:30:00Z",
  "test_results": [
    {
      "test_name": "login > should allow valid credentials",
      "file": "tests/auth.spec.js",
      "status": "passed",
      "duration_ms": 1234,
      "retries": 0
    },
    {
      "test_name": "dashboard > should load user stats",
      "file": "tests/dashboard.spec.js",
      "status": "failed",
      "duration_ms": 5678,
      "retries": 2,
      "error": "Timeout waiting for selector"
    }
  ],
  "summary": {
    "total": 150,
    "passed": 148,
    "failed": 2,
    "flaky": 1
  }
}
```

### Storage Options

**Option 1: DynamoDB (Serverless)**
```javascript
// Store in DynamoDB
await dynamoDB.putItem({
  TableName: 'orchestrator-test-results',
  Item: {
    pk: { S: `REPO#${owner}/${repo}` },
    sk: { S: `RUN#${runId}` },
    timestamp: { N: Date.now().toString() },
    data: { S: JSON.stringify(snapshot) }
  }
});

// Query historical data
const history = await dynamoDB.query({
  TableName: 'orchestrator-test-results',
  KeyConditionExpression: 'pk = :repo AND sk BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':repo': { S: `REPO#${owner}/${repo}` },
    ':start': { S: `RUN#${startRunId}` },
    ':end': { S: `RUN#${endRunId}` }
  }
});
```

**Option 2: GitHub Gist (Simple)**
```javascript
// Append to a gist file
const gistId = 'abc123def456';
const filename = 'test-results-2025-11.jsonl';

// Append new line
await octokit.gists.update({
  gist_id: gistId,
  files: {
    [filename]: {
      content: existingContent + '\n' + JSON.stringify(snapshot)
    }
  }
});
```

**Option 3: S3 with Lifecycle (Cost-effective)**
```javascript
// Store in S3 with retention policy
const key = `test-results/${owner}/${repo}/${year}/${month}/${runId}.json`;

await s3.putObject({
  Bucket: 'orchestrator-test-history',
  Key: key,
  Body: JSON.stringify(snapshot),
  StorageClass: 'STANDARD_IA',  // Cheaper for infrequent access
  Metadata: {
    'x-amz-meta-retention-days': '90'  // Auto-delete after 90 days
  }
});
```

## Acceptance Criteria

- [ ] Choose storage backend (DynamoDB, S3, GitHub Gist)
- [ ] Define minimal snapshot schema (test name, status, duration)
- [ ] Implement snapshot creation from Playwright results
- [ ] Store snapshot after each workflow run analysis
- [ ] Add CLI command to query historical data
- [ ] Implement flakiness trend calculation (rolling 30-day window)
- [ ] Generate flakiness report with historical context
- [ ] Add data retention policy (default 90 days)
- [ ] Support privacy controls (anonymize test names if needed)
- [ ] Include historical context in main analysis report
- [ ] Add visualization (optional: charts for trends)
- [ ] Document storage schema and query patterns
- [ ] Add migration tool for future schema changes
- [ ] Include integration tests with mocked storage

## Example Usage

```powershell
# Store snapshot (automatic after analysis)
node scripts/analyze-orchestration-run.mjs 123456 --store-snapshot

# Query flakiness history for specific test
node scripts/query-test-history.mjs \
  --test "login > should allow valid credentials" \
  --days 30

# Generate flakiness trend report
node scripts/flakiness-report.mjs \
  --repo gcolon75/Project-Valine \
  --since 2025-10-01

# Output:
# Top 5 Flakiest Tests (Last 30 Days)
# 1. dashboard > load stats: 15% failure rate (12/80 runs)
# 2. notifications > mark read: 8% failure rate (6/75 runs)
# ...
```

## Flakiness Trend Report Example

```markdown
## Test Flakiness Trends (Last 30 Days)

**Overall Health**: 94.2% pass rate (down from 95.1% last month)

### Most Flaky Tests

| Test Name | Failure Rate | Trend | Last Failed |
|-----------|--------------|-------|-------------|
| dashboard > load stats | 15% (12/80) | 📈 +3% | 2 days ago |
| notifications > mark read | 8% (6/75) | 📉 -2% | 1 week ago |
| profile > edit bio | 5% (4/82) | ➡️ stable | 3 days ago |

### Newly Flaky (This Month)

- `messages > send attachment` - 10% failure rate (first failed Nov 5)
- `reels > swipe navigation` - 7% failure rate (first failed Nov 8)

### Fixed Tests (No longer flaky)

- ✅ `auth > two-factor` - 0% failure last 30 days (was 12% in October)
```

## Technical Notes

### Data Retention Strategies

- **Hot data** (last 30 days): DynamoDB or S3 Standard
- **Warm data** (31-90 days): S3 Standard-IA
- **Archive** (91+ days): S3 Glacier or delete

### Privacy Considerations

- Anonymize test names if they contain sensitive data
- Allow opt-out for specific repositories
- Support GDPR/data deletion requests

### Query Patterns

```javascript
// Get flakiness for specific test
getTestHistory(testName, days = 30)

// Get all flaky tests in timeframe
getFlakyTests(sinceDate, untilDate)

// Get overall test suite health
getTestSuiteHealth(repo, branch, days = 30)

// Get tests that became flaky recently
getNewlyFlakyTests(days = 7)
```

## Storage Cost Estimation

**S3 Example** (100 workflow runs/month, 150 tests each):
- Storage: ~10KB per snapshot × 100 runs = 1MB/month
- Cost: $0.023/GB × 0.001GB = $0.00002/month (~free)
- Lifecycle transition to IA after 30 days
- Delete after 90 days

**DynamoDB Example**:
- On-demand pricing: $0.25 per million writes
- 100 writes/month = $0.000025/month (~free)
- Storage: $0.25/GB/month × 0.001GB = $0.00025/month

## References

- Test Flakiness Research: https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- DynamoDB Best Practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- S3 Lifecycle Management: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html

## Related Issues

- Enhancement #4: Visual diff integration (also needs historical storage)
- Enhancement #7: Performance profiling (similar storage needs)

## Priority

**P2** - High value for test suite health monitoring, moderate complexity.

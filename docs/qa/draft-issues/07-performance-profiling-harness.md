# Enhancement: Performance Profiling Harness for Large Artifacts

**Labels:** `enhancement`, `analyzer`, `performance`  
**Dependency:** None

## Context

The orchestration analysis tool processes large artifact collections containing accessibility reports, Playwright results, screenshots, and logs. As repositories grow and test suites expand, artifact processing time can become a bottleneck. Currently, there's no systematic way to measure or optimize performance.

## Problem Statement

Current limitations:
- No performance metrics collection
- Cannot identify bottlenecks in artifact processing
- No baseline for "acceptable" performance
- Difficult to measure impact of optimizations
- No alerts when performance degrades

This leads to:
- Slow CI/CD pipelines waiting for analysis
- Unknown resource consumption patterns
- Difficulty justifying performance work
- No regression detection for performance

## Rationale

Performance profiling enables:
- **Identify bottlenecks**: Focus optimization efforts
- **Track improvements**: Measure impact of changes
- **Set SLOs**: Define acceptable performance targets
- **Regression detection**: Alert on performance degradation
- **Resource planning**: Predict scaling needs

## Proposed Solution

Add comprehensive performance profiling throughout the analysis pipeline:

```javascript
/**
 * Performance profiling harness
 */
class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }
  
  // Start timing a phase
  start(phase) {
    this.startTimes.set(phase, process.hrtime.bigint());
  }
  
  // End timing and record
  end(phase, metadata = {}) {
    const startTime = this.startTimes.get(phase);
    if (!startTime) return;
    
    const duration = Number(process.hrtime.bigint() - startTime) / 1e6; // ms
    
    if (!this.metrics.has(phase)) {
      this.metrics.set(phase, []);
    }
    
    this.metrics.get(phase).push({
      duration,
      timestamp: Date.now(),
      ...metadata
    });
  }
  
  // Get summary statistics
  getSummary() {
    const summary = {};
    
    for (const [phase, measurements] of this.metrics) {
      const durations = measurements.map(m => m.duration);
      summary[phase] = {
        count: durations.length,
        total: durations.reduce((a, b) => a + b, 0),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
        p99: percentile(durations, 99)
      };
    }
    
    return summary;
  }
  
  // Memory snapshot
  captureMemory() {
    const mem = process.memoryUsage();
    return {
      rss: mem.rss / 1024 / 1024, // MB
      heapTotal: mem.heapTotal / 1024 / 1024,
      heapUsed: mem.heapUsed / 1024 / 1024,
      external: mem.external / 1024 / 1024
    };
  }
}

// Usage in analyze-orchestration-run.mjs
const profiler = new PerformanceProfiler();

// Profile each phase
profiler.start('fetch-artifacts');
const artifacts = await fetchAllArtifacts(runId);
profiler.end('fetch-artifacts', { count: artifacts.length });

profiler.start('extract-artifacts');
const extracted = await extractArtifacts(artifacts);
profiler.end('extract-artifacts', { 
  sizeBytes: extracted.totalSize,
  fileCount: extracted.files.length 
});

profiler.start('parse-accessibility');
const a11yResults = await parseAccessibilityReports(extracted);
profiler.end('parse-accessibility', { 
  violations: a11yResults.violations.length 
});

// Generate performance report
const perfReport = profiler.getSummary();
console.log('\nPerformance Profile:');
console.table(perfReport);
```

## Phases to Profile

1. **Artifact Retrieval**
   - List artifacts API call
   - Download each artifact (parallel)
   - Network throughput measurement

2. **Artifact Extraction**
   - ZIP decompression
   - File extraction and filtering
   - Disk I/O metrics

3. **Content Parsing**
   - JSON parsing (accessibility, Playwright)
   - HTML parsing (reports)
   - CSV parsing (if applicable)

4. **Analysis**
   - A11y violation processing
   - Flakiness calculation
   - Issue prioritization

5. **Report Generation**
   - Markdown generation
   - JSON export
   - PR comment formatting

## Acceptance Criteria

- [ ] Implement performance profiler class
- [ ] Add timing to all major phases
- [ ] Capture memory usage at key checkpoints
- [ ] Track artifact size and file counts
- [ ] Generate performance summary report
- [ ] Add `--profile` flag to enable detailed profiling
- [ ] Include performance data in JSON output
- [ ] Add performance regression tests (max duration thresholds)
- [ ] Create performance baseline benchmarks
- [ ] Document expected performance characteristics
- [ ] Add CLI command to compare performance across runs
- [ ] Support exporting profiles to external tools (Chrome DevTools)
- [ ] Include performance tips in documentation

## Example Usage

```bash
# Enable performance profiling
node scripts/analyze-orchestration-run.mjs 123456 --profile

# Output includes performance table
# ┌─────────────────────┬───────┬─────────┬────────┬────────┬────────┬────────┬────────┐
# │ Phase               │ Count │ Total   │ Avg    │ Min    │ Max    │ P95    │ P99    │
# ├─────────────────────┼───────┼─────────┼────────┼────────┼────────┼────────┼────────┤
# │ fetch-artifacts     │ 1     │ 2345ms  │ 2345ms │ 2345ms │ 2345ms │ 2345ms │ 2345ms │
# │ extract-artifacts   │ 4     │ 1820ms  │ 455ms  │ 320ms  │ 680ms  │ 650ms  │ 680ms  │
# │ parse-accessibility │ 1     │ 890ms   │ 890ms  │ 890ms  │ 890ms  │ 890ms  │ 890ms  │
# │ parse-playwright    │ 1     │ 1120ms  │ 1120ms │ 1120ms │ 1120ms │ 1120ms │ 1120ms │
# │ generate-report     │ 1     │ 560ms   │ 560ms  │ 560ms  │ 560ms  │ 560ms  │ 560ms  │
# └─────────────────────┴───────┴─────────┴────────┴────────┴────────┴────────┴────────┘
# 
# Memory: Peak 145MB, Final 87MB

# Compare performance across runs
node scripts/compare-performance.mjs 123456 234567

# Export profile for Chrome DevTools
node scripts/analyze-orchestration-run.mjs 123456 --profile --trace-file trace.json
```

## Performance Targets (SLOs)

| Artifact Size | Target Duration | Max Memory |
|---------------|-----------------|------------|
| Small (<10MB) | <5 seconds | <100MB |
| Medium (10-50MB) | <15 seconds | <200MB |
| Large (50-100MB) | <30 seconds | <300MB |
| XL (>100MB) | <60 seconds | <500MB |

## Output Examples

### Console Performance Summary

```
🚀 Performance Summary

Total Duration: 6.73s
Peak Memory: 145MB

Breakdown:
  ⏱️  Fetch artifacts:      2.35s (34.9%)
  📦 Extract artifacts:     1.82s (27.0%)
  🔍 Parse accessibility:   0.89s (13.2%)
  🎭 Parse Playwright:      1.12s (16.6%)
  📝 Generate report:       0.56s (8.3%)

Artifacts Processed:
  - 4 artifacts (68.5MB compressed, 142.3MB uncompressed)
  - 523 files extracted
  - 1,234 accessibility violations analyzed
  - 150 Playwright tests parsed

Recommendations:
  ⚠️  Artifact extraction took 27% of total time
      → Consider streaming extraction (Enhancement #2)
  ⚠️  Memory peaked at 145MB
      → Monitor for large artifact sets
```

### JSON Performance Output

```json
{
  "performance": {
    "total_duration_ms": 6734,
    "peak_memory_mb": 145,
    "phases": [
      {
        "name": "fetch-artifacts",
        "duration_ms": 2345,
        "percentage": 34.9,
        "metadata": {
          "artifact_count": 4,
          "total_size_mb": 68.5
        }
      },
      {
        "name": "extract-artifacts",
        "duration_ms": 1820,
        "percentage": 27.0,
        "metadata": {
          "file_count": 523,
          "uncompressed_mb": 142.3
        }
      }
    ],
    "recommendations": [
      {
        "type": "warning",
        "message": "Artifact extraction took 27% of total time",
        "suggestion": "Consider streaming extraction (Enhancement #2)"
      }
    ]
  }
}
```

## Technical Notes

### Node.js Profiling Tools

- `process.hrtime.bigint()`: High-resolution timing
- `process.memoryUsage()`: Memory snapshots
- `performance.now()`: Alternative timing API
- `--inspect`: Chrome DevTools integration
- `clinic.js`: Production profiling suite

### Chrome DevTools Integration

```javascript
// Generate Chrome trace format
function generateChromeTrace(profiler) {
  const events = [];
  
  for (const [phase, measurements] of profiler.metrics) {
    for (const m of measurements) {
      events.push({
        name: phase,
        cat: 'analyzer',
        ph: 'X', // Complete event
        ts: m.timestamp * 1000,
        dur: m.duration * 1000,
        args: m.metadata
      });
    }
  }
  
  return JSON.stringify({ traceEvents: events });
}
```

### Performance Regression Tests

```javascript
// tests/performance.test.mjs
describe('Performance Regression', () => {
  it('completes analysis within SLO', async () => {
    const start = Date.now();
    await analyzeRun(sampleRunId);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(30000); // 30s max
  });
  
  it('stays within memory budget', async () => {
    const before = process.memoryUsage().heapUsed;
    await analyzeRun(sampleRunId);
    const after = process.memoryUsage().heapUsed;
    const delta = (after - before) / 1024 / 1024;
    
    expect(delta).toBeLessThan(300); // 300MB max
  });
});
```

## Benchmarking Scenarios

Create test fixtures for benchmarking:
- **Tiny**: 1 artifact, 5MB, 10 files
- **Small**: 2 artifacts, 15MB, 50 files
- **Medium**: 4 artifacts, 50MB, 200 files
- **Large**: 8 artifacts, 150MB, 1000 files

## References

- Node.js Performance Timing: https://nodejs.org/api/perf_hooks.html
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/
- clinic.js: https://clinicjs.org/
- Lighthouse Performance: https://web.dev/lighthouse-performance/

## Related Issues

- Enhancement #2: Streaming extraction (major performance win)
- Enhancement #5: Historical storage (track performance over time)

## Priority

**P2** - Important for optimization and scaling, but not blocking current functionality.

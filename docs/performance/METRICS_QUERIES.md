# Performance Metrics Queries

## Overview

This document provides queries and methods to measure and compare performance metrics before and after caching implementation.

## Baseline Metrics Collection

### Running Baseline Tests

**Before Caching (Baseline)**:

```powershell
# Ensure caching is disabled
$env:CACHE_ENABLED = "false"
$env:API_URL = "http://localhost:5000"
$env:TEST_USER_ID = "<valid-user-id>"
$env:TEST_SEARCH_QUERY = "actor"

# Start server
npm run start &

# Wait for server to be ready
sleep 5

# Run baseline test
node server/scripts/perf/baseline-profiles-search.mjs \
  --output docs/performance/BASELINE_BEFORE.json
```

**After Caching**:

```powershell
# Enable caching
$env:CACHE_ENABLED = "true"
$env:REDIS_URL = "redis://localhost:6379"

# Restart server
pkill node
npm run start &
sleep 5

# Run performance test with caching
node server/scripts/perf/baseline-profiles-search.mjs \
  --output docs/performance/BASELINE_AFTER.json
```

## Comparing Results

### Manual Comparison

**Extract Key Metrics**:

```powershell
# Before caching - p95 latencies
jq '.tests.profileWarm.stats.p95' docs/performance/BASELINE_BEFORE.json
jq '.tests.searchWarm.stats.p95' docs/performance/BASELINE_BEFORE.json

# After caching - p95 latencies
jq '.tests.profileWarm.stats.p95' docs/performance/BASELINE_AFTER.json
jq '.tests.searchWarm.stats.p95' docs/performance/BASELINE_AFTER.json
```

**Calculate Improvement**:

```powershell
# Profile improvement
before_profile=$(jq '.tests.profileWarm.stats.p95' docs/performance/BASELINE_BEFORE.json)
after_profile=$(jq '.tests.profileWarm.stats.p95' docs/performance/BASELINE_AFTER.json)
improvement=$(echo "scale=2; (($before_profile - $after_profile) / $before_profile) * 100" | bc)
echo "Profile p95 improvement: ${improvement}%"

# Search improvement
before_search=$(jq '.tests.searchWarm.stats.p95' docs/performance/BASELINE_BEFORE.json)
after_search=$(jq '.tests.searchWarm.stats.p95' docs/performance/BASELINE_AFTER.json)
improvement=$(echo "scale=2; (($before_search - $after_search) / $before_search) * 100" | bc)
echo "Search p95 improvement: ${improvement}%"
```

### Automated Comparison Script

Create `server/scripts/perf/compare-results.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync } from 'fs'

const beforeFile = process.argv[2] || 'docs/performance/BASELINE_BEFORE.json'
const afterFile = process.argv[3] || 'docs/performance/BASELINE_AFTER.json'

const before = JSON.parse(readFileSync(beforeFile, 'utf8'))
const after = JSON.parse(readFileSync(afterFile, 'utf8'))

function calculateImprovement(beforeVal, afterVal) {
  const improvement = ((beforeVal - afterVal) / beforeVal) * 100
  return improvement.toFixed(2)
}

console.log('Performance Comparison Report')
console.log('=' .repeat(60))
console.log()

// Profile endpoint
console.log('Profile Endpoint (Warm)')
console.log('-' .repeat(60))
const profileBefore = before.tests.profileWarm.stats
const profileAfter = after.tests.profileWarm.stats

console.log(`p50: ${profileBefore.p50}ms → ${profileAfter.p50}ms (${calculateImprovement(profileBefore.p50, profileAfter.p50)}% improvement)`)
console.log(`p95: ${profileBefore.p95}ms → ${profileAfter.p95}ms (${calculateImprovement(profileBefore.p95, profileAfter.p95)}% improvement)`)
console.log(`p99: ${profileBefore.p99}ms → ${profileAfter.p99}ms (${calculateImprovement(profileBefore.p99, profileAfter.p99)}% improvement)`)
console.log()

// Search endpoint
console.log('Search Endpoint (Warm)')
console.log('-' .repeat(60))
const searchBefore = before.tests.searchWarm.stats
const searchAfter = after.tests.searchWarm.stats

console.log(`p50: ${searchBefore.p50}ms → ${searchAfter.p50}ms (${calculateImprovement(searchBefore.p50, searchAfter.p50)}% improvement)`)
console.log(`p95: ${searchBefore.p95}ms → ${searchAfter.p95}ms (${calculateImprovement(searchBefore.p95, searchAfter.p95)}% improvement)`)
console.log(`p99: ${searchBefore.p99}ms → ${searchAfter.p99}ms (${calculateImprovement(searchBefore.p99, searchAfter.p99)}% improvement)`)
console.log()

// Success criteria check
console.log('Success Criteria')
console.log('-' .repeat(60))
const profileP95Improvement = parseFloat(calculateImprovement(profileBefore.p95, profileAfter.p95))
const searchP95Improvement = parseFloat(calculateImprovement(searchBefore.p95, searchAfter.p95))

console.log(`✓ Profile p95 ≥15% improvement: ${profileP95Improvement >= 15 ? 'PASS' : 'FAIL'} (${profileP95Improvement}%)`)
console.log(`✓ Search p95 ≥15% improvement: ${searchP95Improvement >= 15 ? 'PASS' : 'FAIL'} (${searchP95Improvement}%)`)
```

**Usage**:

```powershell
node server/scripts/perf/compare-results.mjs \
  docs/performance/BASELINE_BEFORE.json \
  docs/performance/BASELINE_AFTER.json
```

## Cache Hit Ratio Measurement

### Via API

```powershell
# Make some requests to warm cache
for i in {1..10}; do
Invoke-RestMethod -Uri "-s" -Method Get
done

# Check hit ratio
Invoke-RestMethod -Uri "http://localhost:5000/api/cache/metrics" -Method Get
```

**Expected**: ≥0.7 (70%)

### Via Response Headers

```powershell
# First request (cold)
Invoke-RestMethod -Uri "-i" -Method Get
# Expected: X-Cache-Hit: false

# Second request (warm)
Invoke-RestMethod -Uri "-i" -Method Get
# Expected: X-Cache-Hit: true
```

## Observability Integration

### Application Performance Monitoring (APM)

If using APM tools (New Relic, Datadog, etc.), track:

**Custom Metrics**:

```javascript
// Example with generic APM library
import { getMetrics } from './cache/index.js'

setInterval(() => {
  const metrics = getMetrics()
  
  apm.gauge('cache.hits', metrics.hits)
  apm.gauge('cache.misses', metrics.misses)
  apm.gauge('cache.hit_ratio', metrics.hitRatio)
  apm.gauge('cache.total_requests', metrics.total)
}, 60000) // Every minute
```

**Transaction Metrics**:

- Tag cached vs. uncached requests
- Measure latency separately for cache hits/misses
- Alert on cache hit ratio < threshold

### Log Analysis

**Parse Response Time Headers**:

```powershell
# Extract response times from access logs
Select-String "X-Response-Time" /var/log/nginx/access.log | \
  awk '{print $NF}' | \
  sed 's/ms//' | \
  sort -n | \
  awk '
    BEGIN { c = 0; sum = 0 }
    { a[c++] = $1; sum += $1 }
    END {
      print "Count:", c
      print "Mean:", sum/c
      print "p50:", a[int(c*0.5)]
      print "p95:", a[int(c*0.95)]
      print "p99:", a[int(c*0.99)]
    }
  '
```

**Parse Cache Hit Headers**:

```powershell
# Calculate hit ratio from logs
hits=$(Select-String -c "X-Cache-Hit: true" /var/log/nginx/access.log)
misses=$(Select-String -c "X-Cache-Hit: false" /var/log/nginx/access.log)
total=$((hits + misses))
ratio=$(echo "scale=2; $hits / $total" | bc)
echo "Hit ratio: $ratio"
```

## Production Monitoring

### CloudWatch Metrics (AWS)

**Custom Metric Publishing**:

```javascript
import AWS from 'aws-sdk'
import { getMetrics } from './cache/index.js'

const cloudwatch = new AWS.CloudWatch()

setInterval(async () => {
  const metrics = getMetrics()
  
  await cloudwatch.putMetricData({
    Namespace: 'Valine/Cache',
    MetricData: [
      {
        MetricName: 'HitRatio',
        Value: metrics.hitRatio,
        Unit: 'None'
      },
      {
        MetricName: 'TotalRequests',
        Value: metrics.total,
        Unit: 'Count'
      }
    ]
  }).promise()
}, 60000)
```

**Query CloudWatch**:

```powershell
# Get average hit ratio over last hour
aws cloudwatch get-metric-statistics \
  --namespace Valine/Cache \
  --metric-name HitRatio \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average
```

### Grafana Dashboard

**Sample PromQL Queries**:

```promql
# Cache hit ratio
sum(rate(cache_hits_total[5m])) / 
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# p95 response time (cached requests)
histogram_quantile(0.95, 
  sum(rate(http_request_duration_ms_bucket{cached="true"}[5m])) by (le))

# p95 response time (uncached requests)
histogram_quantile(0.95, 
  sum(rate(http_request_duration_ms_bucket{cached="false"}[5m])) by (le))
```

## Success Criteria Verification

### Checklist

Run after caching implementation:

```powershell
# 1. Run performance tests
node server/scripts/perf/baseline-profiles-search.mjs

# 2. Check p95 improvement
# Profile p95: Before vs. After (target: ≥15% reduction)
# Search p95: Before vs. After (target: ≥15% reduction)

# 3. Verify hit ratio
Invoke-RestMethod -Uri "http://localhost:5000/api/cache/metrics" -Method Get
# Target: ≥0.7 for profiles after warm-up

# 4. Test rollback
CACHE_ENABLED=false npm run start
# Verify no errors, latencies return to baseline

# 5. Security scan
npm run security:scan
# Ensure no sensitive data cached
```

### Report Template

```markdown
# Performance Improvement Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Development/Staging/Production]

## Results

### Profile Endpoint

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| p50    | XXXms  | XXXms | XX%         |
| p95    | XXXms  | XXXms | XX%         |
| p99    | XXXms  | XXXms | XX%         |

### Search Endpoint

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| p50    | XXXms  | XXXms | XX%         |
| p95    | XXXms  | XXXms | XX%         |
| p99    | XXXms  | XXXms | XX%         |

### Cache Metrics

- **Hit Ratio**: XX%
- **Total Requests**: XXX
- **Cache Type**: [redis/memory]

## Success Criteria

- [ ] Profile p95 improved by ≥15%
- [ ] Search p95 improved by ≥15%
- [ ] Hit ratio ≥70% (profiles)
- [ ] Hit ratio ≥50% (search)
- [ ] No test regressions
- [ ] Rollback successful
- [ ] No sensitive data in cache

## Notes

[Any additional observations or issues]
```

## References

- [Caching Layer Documentation](./CACHING_LAYER.md)
- [Support Guide](./SUPPORT_CACHE_OPERATIONS.md)
- [Performance Testing Script](../../server/scripts/perf/baseline-profiles-search.mjs)

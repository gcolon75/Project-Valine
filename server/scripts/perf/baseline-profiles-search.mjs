#!/usr/bin/env node
/**
 * Baseline Performance Measurement Script
 * Measures p50, p95, p99 latencies for profile and search endpoints
 * 
 * Usage:
 *   node scripts/perf/baseline-profiles-search.mjs [--output <path>]
 * 
 * Runs:
 *   - 50 warm requests (cached after first)
 *   - 50 cold requests (with cache bypass header)
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const BASE_URL = process.env.API_URL || 'http://localhost:5000'
const NUM_REQUESTS = 50
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123'
const TEST_SEARCH_QUERY = process.env.TEST_SEARCH_QUERY || 'test'

/**
 * Calculate percentiles from sorted array
 */
function calculatePercentiles(values) {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0 }
  
  const sorted = [...values].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const p99 = sorted[Math.floor(sorted.length * 0.99)]
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  
  return { p50, p95, p99, mean, min, max }
}

/**
 * Run performance test for an endpoint
 */
async function testEndpoint(url, headers = {}, numRequests = NUM_REQUESTS) {
  const durations = []
  
  for (let i = 0; i < numRequests; i++) {
    const start = Date.now()
    
    try {
      const response = await fetch(url, { headers })
      await response.json() // Consume response body
      const duration = Date.now() - start
      durations.push(duration)
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message)
    }
    
    // Small delay between requests to avoid overwhelming server
    if (i < numRequests - 1) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  return durations
}

/**
 * Main test runner
 */
async function runBaseline() {
  console.log('Performance Baseline Measurement')
  console.log('=' .repeat(50))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Number of requests: ${NUM_REQUESTS}`)
  console.log(`Test User ID: ${TEST_USER_ID}`)
  console.log(`Test Search Query: ${TEST_SEARCH_QUERY}`)
  console.log('=' .repeat(50))
  console.log()
  
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    numRequests: NUM_REQUESTS,
    testUserId: TEST_USER_ID,
    testSearchQuery: TEST_SEARCH_QUERY,
    cacheEnabled: process.env.CACHE_ENABLED === 'true',
    tests: {}
  }
  
  // Test 1: Profile Endpoint - Warm (cached after first)
  console.log('Testing GET /profiles/:userId (warm)...')
  const profileUrl = `${BASE_URL}/profiles/${TEST_USER_ID}`
  const profileWarmDurations = await testEndpoint(profileUrl)
  const profileWarmStats = calculatePercentiles(profileWarmDurations)
  results.tests.profileWarm = {
    url: profileUrl,
    type: 'warm',
    durations: profileWarmDurations,
    stats: profileWarmStats
  }
  console.log(`  p50: ${profileWarmStats.p50}ms, p95: ${profileWarmStats.p95}ms, p99: ${profileWarmStats.p99}ms`)
  console.log()
  
  // Test 2: Profile Endpoint - Cold (bypass cache)
  console.log('Testing GET /profiles/:userId (cold, bypass cache)...')
  const profileColdDurations = await testEndpoint(profileUrl, { 'X-Cache-Bypass': 'true' })
  const profileColdStats = calculatePercentiles(profileColdDurations)
  results.tests.profileCold = {
    url: profileUrl,
    type: 'cold',
    durations: profileColdDurations,
    stats: profileColdStats
  }
  console.log(`  p50: ${profileColdStats.p50}ms, p95: ${profileColdStats.p95}ms, p99: ${profileColdStats.p99}ms`)
  console.log()
  
  // Test 3: Search Endpoint - Warm (cached after first)
  console.log('Testing GET /search (warm)...')
  const searchUrl = `${BASE_URL}/search?q=${TEST_SEARCH_QUERY}`
  const searchWarmDurations = await testEndpoint(searchUrl)
  const searchWarmStats = calculatePercentiles(searchWarmDurations)
  results.tests.searchWarm = {
    url: searchUrl,
    type: 'warm',
    durations: searchWarmDurations,
    stats: searchWarmStats
  }
  console.log(`  p50: ${searchWarmStats.p50}ms, p95: ${searchWarmStats.p95}ms, p99: ${searchWarmStats.p99}ms`)
  console.log()
  
  // Test 4: Search Endpoint - Cold (bypass cache)
  console.log('Testing GET /search (cold, bypass cache)...')
  const searchColdDurations = await testEndpoint(searchUrl, { 'X-Cache-Bypass': 'true' })
  const searchColdStats = calculatePercentiles(searchColdDurations)
  results.tests.searchCold = {
    url: searchUrl,
    type: 'cold',
    durations: searchColdDurations,
    stats: searchColdStats
  }
  console.log(`  p50: ${searchColdStats.p50}ms, p95: ${searchColdStats.p95}ms, p99: ${searchColdStats.p99}ms`)
  console.log()
  
  // Generate summary table
  console.log('=' .repeat(50))
  console.log('Summary')
  console.log('=' .repeat(50))
  console.log()
  console.log('| Endpoint        | Type | p50   | p95   | p99   | Mean  | Min   | Max   |')
  console.log('|-----------------|------|-------|-------|-------|-------|-------|-------|')
  console.log(`| Profile         | Warm | ${profileWarmStats.p50.toFixed(1).padEnd(5)} | ${profileWarmStats.p95.toFixed(1).padEnd(5)} | ${profileWarmStats.p99.toFixed(1).padEnd(5)} | ${profileWarmStats.mean.toFixed(1).padEnd(5)} | ${profileWarmStats.min.toFixed(1).padEnd(5)} | ${profileWarmStats.max.toFixed(1).padEnd(5)} |`)
  console.log(`| Profile         | Cold | ${profileColdStats.p50.toFixed(1).padEnd(5)} | ${profileColdStats.p95.toFixed(1).padEnd(5)} | ${profileColdStats.p99.toFixed(1).padEnd(5)} | ${profileColdStats.mean.toFixed(1).padEnd(5)} | ${profileColdStats.min.toFixed(1).padEnd(5)} | ${profileColdStats.max.toFixed(1).padEnd(5)} |`)
  console.log(`| Search          | Warm | ${searchWarmStats.p50.toFixed(1).padEnd(5)} | ${searchWarmStats.p95.toFixed(1).padEnd(5)} | ${searchWarmStats.p99.toFixed(1).padEnd(5)} | ${searchWarmStats.mean.toFixed(1).padEnd(5)} | ${searchWarmStats.min.toFixed(1).padEnd(5)} | ${searchWarmStats.max.toFixed(1).padEnd(5)} |`)
  console.log(`| Search          | Cold | ${searchColdStats.p50.toFixed(1).padEnd(5)} | ${searchColdStats.p95.toFixed(1).padEnd(5)} | ${searchColdStats.p99.toFixed(1).padEnd(5)} | ${searchColdStats.mean.toFixed(1).padEnd(5)} | ${searchColdStats.min.toFixed(1).padEnd(5)} | ${searchColdStats.max.toFixed(1).padEnd(5)} |`)
  console.log()
  
  // Save results
  const outputArg = process.argv.indexOf('--output')
  const outputPath = outputArg !== -1 
    ? process.argv[outputArg + 1]
    : `docs/performance/BASELINE_${new Date().toISOString().split('T')[0]}.json`
  
  try {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`Results saved to: ${outputPath}`)
  } catch (error) {
    console.error('Failed to save results:', error.message)
  }
  
  // Also save markdown version
  const mdPath = outputPath.replace('.json', '.md')
  const markdown = `
# Performance Baseline - ${new Date().toISOString().split('T')[0]}

**Cache Enabled:** ${results.cacheEnabled ? 'Yes' : 'No'}
**Base URL:** ${BASE_URL}
**Number of Requests:** ${NUM_REQUESTS}

## Results

| Endpoint        | Type | p50 (ms) | p95 (ms) | p99 (ms) | Mean (ms) | Min (ms) | Max (ms) |
|-----------------|------|----------|----------|----------|-----------|----------|----------|
| Profile         | Warm | ${profileWarmStats.p50.toFixed(1)} | ${profileWarmStats.p95.toFixed(1)} | ${profileWarmStats.p99.toFixed(1)} | ${profileWarmStats.mean.toFixed(1)} | ${profileWarmStats.min.toFixed(1)} | ${profileWarmStats.max.toFixed(1)} |
| Profile         | Cold | ${profileColdStats.p50.toFixed(1)} | ${profileColdStats.p95.toFixed(1)} | ${profileColdStats.p99.toFixed(1)} | ${profileColdStats.mean.toFixed(1)} | ${profileColdStats.min.toFixed(1)} | ${profileColdStats.max.toFixed(1)} |
| Search          | Warm | ${searchWarmStats.p50.toFixed(1)} | ${searchWarmStats.p95.toFixed(1)} | ${searchWarmStats.p99.toFixed(1)} | ${searchWarmStats.mean.toFixed(1)} | ${searchWarmStats.min.toFixed(1)} | ${searchWarmStats.max.toFixed(1)} |
| Search          | Cold | ${searchColdStats.p50.toFixed(1)} | ${searchColdStats.p95.toFixed(1)} | ${searchColdStats.p99.toFixed(1)} | ${searchColdStats.mean.toFixed(1)} | ${searchColdStats.min.toFixed(1)} | ${searchColdStats.max.toFixed(1)} |

## Test Configuration

- **Test User ID:** ${TEST_USER_ID}
- **Test Search Query:** ${TEST_SEARCH_QUERY}
- **Timestamp:** ${results.timestamp}

## Notes

- Warm tests: Multiple requests to the same endpoint (cached after first if caching enabled)
- Cold tests: Each request bypasses cache using X-Cache-Bypass header
`
  
  try {
    writeFileSync(mdPath, markdown)
    console.log(`Markdown report saved to: ${mdPath}`)
  } catch (error) {
    console.error('Failed to save markdown report:', error.message)
  }
}

runBaseline().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Test Failure Analysis Script
 * Parses Vitest JSON output and groups failures by suite category
 * 
 * Usage:
 *   npm test -- --reporter=json > test-results.json
 *   node scripts/analyze-test-failures.mjs test-results.json
 * 
 * Or pipe directly:
 *   npm test -- --reporter=json 2>/dev/null | node scripts/analyze-test-failures.mjs
 */

import { readFileSync } from 'fs';

/**
 * Categorize test suite by name
 */
function categorizeTest(testName, suiteName) {
  const combined = `${suiteName} ${testName}`.toLowerCase();
  
  if (combined.includes('auth') || combined.includes('login') || combined.includes('register')) {
    return 'auth';
  }
  if (combined.includes('moderation') || combined.includes('report')) {
    return 'moderation';
  }
  if (combined.includes('analytics')) {
    return 'analytics';
  }
  if (combined.includes('rate') || combined.includes('limit')) {
    return 'rate-limit';
  }
  if (combined.includes('verification') || combined.includes('email')) {
    return 'verification';
  }
  if (combined.includes('orchestr') || combined.includes('intel') || combined.includes('journey')) {
    return 'orchestration';
  }
  if (combined.includes('cookie') || combined.includes('cors') || combined.includes('csrf')) {
    return 'security';
  }
  
  return 'other';
}

/**
 * Extract failure reason from error message
 */
function extractFailureReason(error) {
  if (!error) return 'Unknown error';
  
  const msg = error.message || error.toString();
  
  // Extract assertion failures
  const assertMatch = msg.match(/expected .+ to (?:be|equal|contain|match) .+/i);
  if (assertMatch) {
    return assertMatch[0].substring(0, 100);
  }
  
  // Extract first line of error
  const firstLine = msg.split('\n')[0];
  return firstLine.substring(0, 100);
}

/**
 * Parse Vitest JSON output
 */
function parseVitestJson(jsonData) {
  const failures = [];
  
  // Handle both array and object formats
  const testResults = Array.isArray(jsonData) ? jsonData : [jsonData];
  
  for (const result of testResults) {
    if (!result.testResults) continue;
    
    for (const suite of result.testResults) {
      const suiteName = suite.name || 'Unknown Suite';
      
      if (suite.assertionResults) {
        for (const test of suite.assertionResults) {
          if (test.status === 'failed') {
            failures.push({
              suite: suiteName,
              test: test.title || test.fullName,
              category: categorizeTest(test.title || test.fullName, suiteName),
              reason: extractFailureReason(test.failureMessages?.[0] || test.error),
              duration: test.duration || 0
            });
          }
        }
      }
    }
  }
  
  return failures;
}

/**
 * Group and analyze failures
 */
function analyzeFailures(failures) {
  const byCategory = {};
  const byReason = {};
  
  for (const failure of failures) {
    // Group by category
    if (!byCategory[failure.category]) {
      byCategory[failure.category] = [];
    }
    byCategory[failure.category].push(failure);
    
    // Count by reason
    const reasonKey = failure.reason.substring(0, 80);
    byReason[reasonKey] = (byReason[reasonKey] || 0) + 1;
  }
  
  return { byCategory, byReason };
}

/**
 * Generate summary report
 */
function generateReport(failures, analysis) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                   TEST FAILURE ANALYSIS                        ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Total Failures: ${failures.length}\n`);
  
  // Category breakdown
  console.log('Failures by Category:');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const sortedCategories = Object.entries(analysis.byCategory)
    .sort((a, b) => b[1].length - a[1].length);
  
  for (const [category, tests] of sortedCategories) {
    console.log(`  ${category.toUpperCase().padEnd(20)} ${tests.length} failures`);
  }
  
  // Top recurring reasons
  console.log('\n\nTop 3 Recurring Assertion Failures:');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const topReasons = Object.entries(analysis.byReason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  for (let i = 0; i < topReasons.length; i++) {
    const [reason, count] = topReasons[i];
    console.log(`  ${i + 1}. [${count}x] ${reason}`);
  }
  
  // Detailed category breakdown
  console.log('\n\nDetailed Breakdown:');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  for (const [category, tests] of sortedCategories) {
    console.log(`\n${category.toUpperCase()} (${tests.length}):`);
    for (const test of tests.slice(0, 5)) { // Show max 5 per category
      console.log(`  • ${test.test.substring(0, 70)}`);
      console.log(`    ${test.reason}`);
    }
    if (tests.length > 5) {
      console.log(`  ... and ${tests.length - 5} more`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  let jsonData;
  
  if (args.length === 0) {
    // Read from stdin
    try {
      const stdin = readFileSync(0, 'utf-8');
      if (!stdin.trim()) {
        console.error('Error: No input provided');
        console.error('Usage: npm test -- --reporter=json | node scripts/analyze-test-failures.mjs');
        process.exit(1);
      }
      jsonData = JSON.parse(stdin);
    } catch (e) {
      console.error('Error reading/parsing stdin:', e.message);
      process.exit(1);
    }
  } else {
    // Read from file
    try {
      const fileContent = readFileSync(args[0], 'utf-8');
      jsonData = JSON.parse(fileContent);
    } catch (e) {
      console.error(`Error reading file ${args[0]}:`, e.message);
      process.exit(1);
    }
  }
  
  const failures = parseVitestJson(jsonData);
  
  if (failures.length === 0) {
    console.log('\n✓ No test failures found!\n');
    return;
  }
  
  const analysis = analyzeFailures(failures);
  generateReport(failures, analysis);
}

main();

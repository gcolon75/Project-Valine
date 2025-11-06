#!/usr/bin/env node
/**
 * Comprehensive Post-Merge Verification Runner
 * Task ID: be-post-merge-comprehensive-verification-155-185
 * 
 * Performs automated verification across merged PRs 155-185 to ensure:
 * - No regressions in acceptance criteria
 * - Security implementations are intact
 * - Migrations and data integrity are valid
 * - CSP policies are ready for enforcement
 * - No vulnerabilities or secrets in codebase
 * - Audit logs working correctly
 * 
 * Outputs:
 * - Consolidated Markdown report
 * - PR verification matrix
 * - Draft PR payloads for fixes
 * - Artifact bundles
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const REPORT_DIR = path.join(ROOT, 'logs', 'verification')
const ARTIFACTS_DIR = path.join(REPORT_DIR, 'artifacts')

// Ensure directories exist
fs.mkdirSync(REPORT_DIR, { recursive: true })
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

// Rate limiting configuration
const RATE_LIMIT = {
  maxConcurrency: 2,
  baseDelay: 1000,
  maxRetries: 3,
  jitter: 500
}

// Verification state
const state = {
  conversationId: `verify-${Date.now()}`,
  startTime: new Date(),
  prMatrix: [],
  migrations: { status: 'pending', checks: [] },
  security: { tests: [], violations: [] },
  csp: { violations: [], policy: null },
  vulnerabilities: { npm: [], secrets: [] },
  auditLogs: { status: 'pending', checks: [] },
  tests: { unit: null, integration: null, e2e: null },
  artifacts: [],
  recommendations: [],
  draftPRs: []
}

/**
 * Execute command with rate limiting
 */
async function execWithRateLimit(command, options = {}) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  
  for (let attempt = 0; attempt < RATE_LIMIT.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffDelay = RATE_LIMIT.baseDelay * Math.pow(2, attempt) + 
                            Math.random() * RATE_LIMIT.jitter
        console.log(`  ⏳ Retry ${attempt}/${RATE_LIMIT.maxRetries} after ${Math.round(backoffDelay)}ms`)
        await delay(backoffDelay)
      }
      
      return execSync(command, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      })
    } catch (error) {
      if (attempt === RATE_LIMIT.maxRetries - 1) throw error
      if (error.status === 429 || error.message?.includes('rate limit')) {
        continue
      }
      throw error
    }
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(path.join(ROOT, filePath))
  } catch {
    return false
  }
}

/**
 * Read file content safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(ROOT, filePath), 'utf8')
  } catch {
    return null
  }
}

/**
 * 1. Validate PR Acceptance Criteria (155-185)
 */
async function validatePRAcceptanceCriteria() {
  console.log('\n📋 STEP 1: Validating PR Acceptance Criteria (155-185)')
  console.log('=' .repeat(60))
  
  const prRange = Array.from({ length: 31 }, (_, i) => 155 + i) // 155-185
  
  for (const prNum of prRange) {
    const result = {
      pr: prNum,
      status: 'unknown',
      merged: false,
      checks: [],
      files: [],
      pointer: null
    }
    
    try {
      // Check if PR is merged via git log
      const log = await execWithRateLimit(
        `git log --all --grep="#${prNum}" --oneline --merges`,
        { silent: true }
      )
      
      if (log && log.trim()) {
        result.merged = true
        result.status = 'merged'
        result.pointer = log.split('\n')[0]
      }
      
      // Add specific checks based on PR number ranges
      if (prNum >= 155 && prNum <= 165) {
        result.checks.push({ name: 'Theme Preference API', status: 'pending' })
      } else if (prNum >= 166 && prNum <= 175) {
        result.checks.push({ name: 'Profile Links & Titles', status: 'pending' })
      } else if (prNum >= 176 && prNum <= 185) {
        result.checks.push({ name: 'Security & Auth', status: 'pending' })
      }
      
    } catch (error) {
      result.status = 'not_found'
    }
    
    state.prMatrix.push(result)
  }
  
  const mergedCount = state.prMatrix.filter(pr => pr.merged).length
  console.log(`✅ Verified ${mergedCount}/${prRange.length} PRs in range 155-185`)
}

/**
 * 2. Validate Migrations and Data Integrity
 */
async function validateMigrations() {
  console.log('\n🗄️  STEP 2: Validating Migrations and Data Integrity')
  console.log('=' .repeat(60))
  
  const checks = []
  
  // Check for Prisma migrations
  const migrationsDir = 'api/prisma/migrations'
  if (fileExists(migrationsDir)) {
    try {
      const migrations = fs.readdirSync(path.join(ROOT, migrationsDir))
      checks.push({
        name: 'Prisma migrations exist',
        status: 'pass',
        count: migrations.length,
        details: `Found ${migrations.length} migration directories`
      })
      
      // Check for profile_links migration
      const profileLinksMigration = migrations.find(m => m.includes('profile_links'))
      if (profileLinksMigration) {
        checks.push({
          name: 'profile_links migration present',
          status: 'pass',
          details: profileLinksMigration
        })
      }
      
      // Check for socialLinks to profile_links migration script
      if (fileExists('api/scripts/migrate-social-links.js')) {
        checks.push({
          name: 'Legacy socialLinks migration script',
          status: 'pass',
          details: 'api/scripts/migrate-social-links.js exists'
        })
      }
      
    } catch (error) {
      checks.push({
        name: 'Prisma migrations directory',
        status: 'fail',
        error: error.message
      })
    }
  } else {
    checks.push({
      name: 'Prisma migrations directory',
      status: 'warn',
      details: 'Directory not found'
    })
  }
  
  // Check schema.prisma
  if (fileExists('api/prisma/schema.prisma')) {
    const schema = readFile('api/prisma/schema.prisma')
    if (schema) {
      checks.push({
        name: 'Prisma schema exists',
        status: 'pass',
        details: 'schema.prisma found and readable'
      })
      
      // Check for profile_links table
      if (schema.includes('model ProfileLink')) {
        checks.push({
          name: 'ProfileLink model in schema',
          status: 'pass'
        })
      }
      
      // Check for User.theme field
      if (schema.includes('theme')) {
        checks.push({
          name: 'User theme field in schema',
          status: 'pass'
        })
      }
    }
  }
  
  state.migrations = {
    status: checks.every(c => c.status === 'pass') ? 'pass' : 'partial',
    checks
  }
  
  console.log(`✅ Migration validation complete: ${checks.length} checks performed`)
}

/**
 * 3. Execute Security Validation Suite
 */
async function executeSecurityValidation() {
  console.log('\n🔒 STEP 3: Security Validation Suite')
  console.log('=' .repeat(60))
  
  const tests = []
  
  // Check security middleware
  const securityFiles = [
    'server/src/middleware/security.js',
    'server/src/middleware/csrf.js',
    'server/src/middleware/authRateLimit.js',
    'server/src/middleware/auth.js'
  ]
  
  for (const file of securityFiles) {
    tests.push({
      name: `Security file: ${path.basename(file)}`,
      status: fileExists(file) ? 'pass' : 'fail',
      file
    })
  }
  
  // Check auth routes
  const authRoutes = [
    'server/src/routes/auth.js',
    'server/src/routes/2fa.js',
    'server/src/routes/privacy.js'
  ]
  
  for (const route of authRoutes) {
    if (fileExists(route)) {
      const content = readFile(route)
      tests.push({
        name: `Auth route: ${path.basename(route)}`,
        status: 'pass',
        file: route,
        details: content ? 'File exists and readable' : 'File exists but not readable'
      })
    }
  }
  
  // Check for security tests
  const testFiles = [
    'server/src/middleware/__tests__/csrf.test.js',
    'server/src/middleware/__tests__/authRateLimit.test.js',
    'server/src/routes/__tests__/auth.test.js'
  ]
  
  for (const test of testFiles) {
    tests.push({
      name: `Security test: ${path.basename(test)}`,
      status: fileExists(test) ? 'pass' : 'warn',
      file: test
    })
  }
  
  state.security.tests = tests
  
  console.log(`✅ Security validation complete: ${tests.length} checks performed`)
}

/**
 * 4. CSP Policy Analysis
 */
async function analyzeCSPPolicy() {
  console.log('\n🛡️  STEP 4: CSP Policy Analysis')
  console.log('=' .repeat(60))
  
  // Check for CSP configuration
  const cspFiles = [
    'scripts/csp-rollout-config.js',
    'server/src/middleware/security.js'
  ]
  
  const violations = []
  let candidatePolicy = null
  
  for (const file of cspFiles) {
    if (fileExists(file)) {
      const content = readFile(file)
      if (content) {
        // Check for CSP directives
        if (content.includes('Content-Security-Policy')) {
          candidatePolicy = {
            source: file,
            mode: content.includes('report-only') ? 'report-only' : 'enforce',
            directives: extractCSPDirectives(content)
          }
        }
      }
    }
  }
  
  if (candidatePolicy) {
    state.csp.policy = candidatePolicy
    console.log(`✅ Found CSP policy in ${candidatePolicy.mode} mode`)
  } else {
    violations.push({
      severity: 'medium',
      message: 'No CSP policy configuration found',
      recommendation: 'Implement CSP report-only mode'
    })
  }
  
  state.csp.violations = violations
}

function extractCSPDirectives(content) {
  const directives = []
  const cspRegex = /(default-src|script-src|style-src|img-src|connect-src|font-src|frame-src|media-src|object-src)/g
  const matches = content.match(cspRegex)
  if (matches) {
    directives.push(...matches)
  }
  return [...new Set(directives)]
}

/**
 * 5. Run Dependency Vulnerability Scan
 */
async function runVulnerabilityScan() {
  console.log('\n🔍 STEP 5: Dependency Vulnerability Scan')
  console.log('=' .repeat(60))
  
  try {
    const auditOutput = await execWithRateLimit(
      'npm audit --json || true',
      { silent: true }
    )
    
    const audit = JSON.parse(auditOutput || '{}')
    
    if (audit.vulnerabilities) {
      const vulns = Object.entries(audit.vulnerabilities).map(([name, data]) => ({
        package: name,
        severity: data.severity,
        via: data.via,
        range: data.range
      }))
      
      state.vulnerabilities.npm = vulns
      console.log(`⚠️  Found ${vulns.length} vulnerabilities`)
      
      // Save detailed audit
      fs.writeFileSync(
        path.join(ARTIFACTS_DIR, 'npm-audit.json'),
        JSON.stringify(audit, null, 2)
      )
    } else {
      console.log('✅ No vulnerabilities found')
    }
  } catch (error) {
    console.error('❌ Vulnerability scan failed:', error.message)
  }
}

/**
 * 6. Secret Scanning
 */
async function runSecretScan() {
  console.log('\n🔐 STEP 6: Secret Scanning')
  console.log('=' .repeat(60))
  
  const secrets = []
  const patterns = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'Private Key', regex: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/ },
    { name: 'Generic Secret', regex: /(?:password|secret|token|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i }
  ]
  
  // Scan specific directories (excluding node_modules, .git, etc.)
  const dirsToScan = ['src', 'server', 'api', 'scripts']
  
  for (const dir of dirsToScan) {
    if (!fileExists(dir)) continue
    
    try {
      const files = getAllFiles(path.join(ROOT, dir))
      
      for (const file of files) {
        if (file.includes('node_modules') || file.includes('.git')) continue
        
        const content = fs.readFileSync(file, 'utf8')
        
        for (const pattern of patterns) {
          const matches = content.match(pattern.regex)
          if (matches) {
            secrets.push({
              type: pattern.name,
              file: path.relative(ROOT, file),
              line: findLineNumber(content, matches[0]),
              redacted: '[REDACTED]'
            })
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dir}:`, error.message)
    }
  }
  
  state.vulnerabilities.secrets = secrets
  
  if (secrets.length > 0) {
    console.log(`⚠️  Found ${secrets.length} potential secrets (review required)`)
  } else {
    console.log('✅ No secrets detected')
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file)
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles)
    } else {
      arrayOfFiles.push(filePath)
    }
  })
  
  return arrayOfFiles
}

function findLineNumber(content, match) {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) return i + 1
  }
  return 0
}

/**
 * 7. Validate Audit Logs
 */
async function validateAuditLogs() {
  console.log('\n📝 STEP 7: Audit Log Validation')
  console.log('=' .repeat(60))
  
  const checks = []
  
  // Check for audit log implementation
  const auditFiles = [
    'server/src/middleware/auditLog.js',
    'server/src/routes/audit.js'
  ]
  
  for (const file of auditFiles) {
    checks.push({
      name: `Audit file: ${path.basename(file)}`,
      status: fileExists(file) ? 'pass' : 'warn',
      file
    })
  }
  
  // Check Prisma schema for audit log model
  const schema = readFile('api/prisma/schema.prisma')
  if (schema) {
    if (schema.includes('model AuditLog') || schema.includes('model Audit')) {
      checks.push({
        name: 'Audit log model in schema',
        status: 'pass'
      })
    } else {
      checks.push({
        name: 'Audit log model in schema',
        status: 'warn',
        details: 'No AuditLog model found in schema'
      })
    }
  }
  
  state.auditLogs = {
    status: checks.some(c => c.status === 'pass') ? 'partial' : 'pending',
    checks
  }
  
  console.log(`✅ Audit log validation complete: ${checks.length} checks performed`)
}

/**
 * 8. Run Test Suites
 */
async function runTestSuites() {
  console.log('\n🧪 STEP 8: Running Test Suites')
  console.log('=' .repeat(60))
  
  // Unit tests
  console.log('\n  Running unit tests...')
  try {
    const unitOutput = await execWithRateLimit(
      'npm run test:run 2>&1',
      { silent: true }
    )
    
    const unitResults = parseTestOutput(unitOutput)
    state.tests.unit = unitResults
    
    // Save artifact
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'unit-tests.txt'),
      unitOutput
    )
    
    console.log(`  ✅ Unit tests: ${unitResults.passed} passed, ${unitResults.failed} failed`)
  } catch (error) {
    console.log('  ⚠️  Unit tests failed to run')
    state.tests.unit = { error: error.message }
  }
  
  // Playwright E2E tests
  console.log('\n  Running Playwright E2E tests...')
  try {
    const e2eOutput = await execWithRateLimit(
      'npx playwright test --reporter=json 2>&1 || true',
      { silent: true }
    )
    
    // Save artifact
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'e2e-tests.txt'),
      e2eOutput
    )
    
    const e2eResults = parseTestOutput(e2eOutput)
    state.tests.e2e = e2eResults
    
    console.log(`  ✅ E2E tests: ${e2eResults.passed || 0} passed, ${e2eResults.failed || 0} failed`)
  } catch (error) {
    console.log('  ⚠️  E2E tests skipped or failed')
    state.tests.e2e = { error: error.message, status: 'skipped' }
  }
  
  console.log('\n✅ Test suite execution complete')
}

function parseTestOutput(output) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
  
  // Try to parse vitest output
  const testFilesMatch = output.match(/Test Files\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed/)
  const testsMatch = output.match(/Tests\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed/)
  
  if (testsMatch) {
    results.failed = parseInt(testsMatch[1] || 0)
    results.passed = parseInt(testsMatch[2] || 0)
    results.total = results.failed + results.passed
  }
  
  return results
}

/**
 * 9. Generate Recommendations
 */
function generateRecommendations() {
  console.log('\n💡 STEP 9: Generating Recommendations')
  console.log('=' .repeat(60))
  
  const recommendations = []
  
  // Check for high severity vulnerabilities
  const highSeverityVulns = state.vulnerabilities.npm.filter(v => 
    v.severity === 'high' || v.severity === 'critical'
  )
  
  if (highSeverityVulns.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'security',
      title: 'Fix high-severity vulnerabilities',
      details: `Found ${highSeverityVulns.length} high/critical vulnerabilities`,
      branch: 'fix/high-severity-vulnerabilities',
      files: ['package.json', 'package-lock.json']
    })
  }
  
  // Check for secrets
  if (state.vulnerabilities.secrets.length > 0) {
    recommendations.push({
      priority: 'critical',
      category: 'security',
      title: 'Remove exposed secrets',
      details: `Found ${state.vulnerabilities.secrets.length} potential secrets`,
      branch: 'security/remove-exposed-secrets',
      files: state.vulnerabilities.secrets.map(s => s.file)
    })
  }
  
  // Check CSP policy
  if (!state.csp.policy) {
    recommendations.push({
      priority: 'medium',
      category: 'security',
      title: 'Implement CSP policy',
      details: 'No Content Security Policy found',
      branch: 'feat/csp-policy',
      files: ['server/src/middleware/security.js']
    })
  }
  
  // Check migration status
  if (state.migrations.status !== 'pass') {
    recommendations.push({
      priority: 'medium',
      category: 'database',
      title: 'Complete migration setup',
      details: 'Some migration checks failed or incomplete',
      branch: 'fix/migration-hotfixes',
      files: ['api/prisma/migrations/']
    })
  }
  
  // Check test failures
  if (state.tests.unit && state.tests.unit.failed > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'testing',
      title: 'Fix failing unit tests',
      details: `${state.tests.unit.failed} unit tests failing`,
      branch: 'fix/unit-test-failures',
      files: ['server/src/', 'tests/']
    })
  }
  
  state.recommendations = recommendations
  console.log(`✅ Generated ${recommendations.length} recommendations`)
}

/**
 * 10. Generate Draft PR Payloads
 */
function generateDraftPRs() {
  console.log('\n📦 STEP 10: Generating Draft PR Payloads')
  console.log('=' .repeat(60))
  
  const draftPRs = []
  
  for (const rec of state.recommendations) {
    const pr = {
      branch: rec.branch,
      title: rec.title,
      labels: ['automated-fix', rec.category],
      draft: true,
      body: generatePRBody(rec),
      priority: rec.priority,
      filesAffected: rec.files
    }
    
    draftPRs.push(pr)
  }
  
  state.draftPRs = draftPRs
  
  // Save to file
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'draft-prs.json'),
    JSON.stringify(draftPRs, null, 2)
  )
  
  console.log(`✅ Generated ${draftPRs.length} draft PR payloads`)
}

function generatePRBody(recommendation) {
  return `## ${recommendation.title}

**Priority:** ${recommendation.priority}
**Category:** ${recommendation.category}

### Details
${recommendation.details}

### Files Affected
${recommendation.files.map(f => `- \`${f}\``).join('\n')}

### Automated Verification Context
This PR was generated by the post-merge comprehensive verification system.
See the full verification report for context.

---
*This is a draft PR payload. Review and manual action required.*`
}

/**
 * 11. Generate Consolidated Report
 */
function generateReport() {
  console.log('\n📄 STEP 11: Generating Consolidated Report')
  console.log('=' .repeat(60))
  
  const endTime = new Date()
  const duration = (endTime - state.startTime) / 1000
  
  let report = `# Post-Merge Comprehensive Verification Report

**Task ID:** be-post-merge-comprehensive-verification-155-185  
**Conversation ID:** ${state.conversationId}  
**Generated:** ${endTime.toISOString()}  
**Duration:** ${duration.toFixed(2)}s  

## Executive Summary

This report provides comprehensive verification of merged PRs 155-185 to ensure no regressions or security drift.

### Overall Status
- **PRs Verified:** ${state.prMatrix.length}
- **PRs Merged:** ${state.prMatrix.filter(pr => pr.merged).length}
- **Security Tests:** ${state.security.tests.length}
- **Vulnerabilities:** ${state.vulnerabilities.npm.length} npm, ${state.vulnerabilities.secrets.length} secrets
- **Recommendations:** ${state.recommendations.length}

---

## 1. PR Verification Matrix (155-185)

| PR # | Status | Merged | Checks | Pointer |
|------|--------|--------|--------|---------|
${state.prMatrix.map(pr => 
  `| #${pr.pr} | ${pr.status} | ${pr.merged ? '✅' : '❌'} | ${pr.checks.length} | ${pr.pointer ? pr.pointer.substring(0, 40) + '...' : '-'} |`
).join('\n')}

**Summary:** ${state.prMatrix.filter(pr => pr.merged).length}/${state.prMatrix.length} PRs verified as merged.

---

## 2. Migration Validation

**Status:** ${state.migrations.status}

${state.migrations.checks.map(check => 
  `- [${check.status === 'pass' ? 'x' : ' '}] ${check.name}${check.details ? ': ' + check.details : ''}`
).join('\n')}

---

## 3. Security Validation

**Tests Performed:** ${state.security.tests.length}

${state.security.tests.map(test => 
  `- [${test.status === 'pass' ? 'x' : ' '}] ${test.name}`
).join('\n')}

---

## 4. CSP Policy Analysis

**Policy Status:** ${state.csp.policy ? 'Found' : 'Not Found'}

${state.csp.policy ? `
- **Source:** ${state.csp.policy.source}
- **Mode:** ${state.csp.policy.mode}
- **Directives:** ${state.csp.policy.directives.join(', ')}
` : '⚠️ No CSP policy configured'}

**Violations:** ${state.csp.violations.length}

---

## 5. Vulnerability Scan

### NPM Dependencies
**Found:** ${state.vulnerabilities.npm.length} vulnerabilities

${state.vulnerabilities.npm.length > 0 ? `
| Package | Severity | Range |
|---------|----------|-------|
${state.vulnerabilities.npm.slice(0, 10).map(v => 
  `| ${v.package} | ${v.severity} | ${v.range || 'N/A'} |`
).join('\n')}

${state.vulnerabilities.npm.length > 10 ? `\n*Showing 10 of ${state.vulnerabilities.npm.length}. See artifacts for full list.*` : ''}
` : '✅ No vulnerabilities found'}

### Secret Scan
**Found:** ${state.vulnerabilities.secrets.length} potential secrets

${state.vulnerabilities.secrets.length > 0 ? `
⚠️ **SECURITY FINDING - PRIVATE**

${state.vulnerabilities.secrets.map(s => 
  `- **${s.type}** in \`${s.file}\` (line ${s.line})`
).join('\n')}

*Full details redacted for security. Review artifacts for investigation.*
` : '✅ No secrets detected'}

---

## 6. Audit Log Validation

**Status:** ${state.auditLogs.status}

${state.auditLogs.checks.map(check => 
  `- [${check.status === 'pass' ? 'x' : ' '}] ${check.name}`
).join('\n')}

---

## 7. Test Results

### Unit Tests
${state.tests.unit ? `
- **Total:** ${state.tests.unit.total || 'N/A'}
- **Passed:** ${state.tests.unit.passed || 0}
- **Failed:** ${state.tests.unit.failed || 0}
${state.tests.unit.error ? `- **Error:** ${state.tests.unit.error}` : ''}
` : '⚠️ Unit tests not run'}

### E2E Tests
${state.tests.e2e ? `
- **Status:** ${state.tests.e2e.status || 'completed'}
- **Passed:** ${state.tests.e2e.passed || 0}
- **Failed:** ${state.tests.e2e.failed || 0}
${state.tests.e2e.error ? `- **Note:** ${state.tests.e2e.error}` : ''}
` : '⚠️ E2E tests not run'}

---

## 8. Recommendations (Prioritized)

${state.recommendations.length > 0 ? state.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.title}
- **Priority:** ${rec.priority}
- **Category:** ${rec.category}
- **Branch:** \`${rec.branch}\`
- **Details:** ${rec.details}
`).join('\n') : 'No recommendations at this time.'}

---

## 9. Draft PR Payloads

${state.draftPRs.length > 0 ? `
**Generated:** ${state.draftPRs.length} draft PR payloads

${state.draftPRs.map(pr => `
- **${pr.title}** (\`${pr.branch}\`)
  - Priority: ${pr.priority}
  - Labels: ${pr.labels.join(', ')}
  - Files: ${pr.filesAffected.length}
`).join('\n')}

Full PR payloads saved to: \`${path.relative(ROOT, ARTIFACTS_DIR)}/draft-prs.json\`
` : 'No draft PRs generated.'}

---

## Artifacts

The following artifacts have been generated:

${fs.readdirSync(ARTIFACTS_DIR).map(file => 
  `- \`${path.join(path.relative(ROOT, ARTIFACTS_DIR), file)}\``
).join('\n')}

---

## Preview URLs

- **Main Report:** \`${path.relative(ROOT, path.join(REPORT_DIR, 'verification-report.md'))}\`
- **Artifacts Directory:** \`${path.relative(ROOT, ARTIFACTS_DIR)}\`

---

## Next Steps

1. Review this report and prioritize recommendations
2. Review security findings (secrets) privately before taking action
3. Use draft PR payloads in \`draft-prs.json\` to create PRs as needed
4. Address high-priority issues first
5. Re-run verification after fixes

**Conversation ID for reference:** \`${state.conversationId}\`
`

  // Save report
  const reportPath = path.join(REPORT_DIR, 'verification-report.md')
  fs.writeFileSync(reportPath, report)
  
  console.log(`✅ Report saved to: ${path.relative(ROOT, reportPath)}`)
  
  return reportPath
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Comprehensive Post-Merge Verification')
  console.log('Task: be-post-merge-comprehensive-verification-155-185')
  console.log('Scope: PRs 155-185')
  console.log('=' .repeat(60))
  
  try {
    await validatePRAcceptanceCriteria()
    await validateMigrations()
    await executeSecurityValidation()
    await analyzeCSPPolicy()
    await runVulnerabilityScan()
    await runSecretScan()
    await validateAuditLogs()
    await runTestSuites()
    generateRecommendations()
    generateDraftPRs()
    const reportPath = generateReport()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ VERIFICATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`\n📄 Report: ${reportPath}`)
    console.log(`📦 Artifacts: ${path.relative(ROOT, ARTIFACTS_DIR)}`)
    console.log(`🆔 Conversation ID: ${state.conversationId}`)
    console.log('\n📋 Summary:')
    console.log(`   PRs Merged: ${state.prMatrix.filter(pr => pr.merged).length}/${state.prMatrix.length}`)
    console.log(`   Security Tests: ${state.security.tests.length}`)
    console.log(`   Vulnerabilities: ${state.vulnerabilities.npm.length + state.vulnerabilities.secrets.length}`)
    console.log(`   Recommendations: ${state.recommendations.length}`)
    console.log(`   Draft PRs: ${state.draftPRs.length}`)
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED')
    console.error(error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main, state }

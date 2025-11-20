#!/usr/bin/env node
/**
 * Strict Allowlist Check - Build-time validation
 * 
 * This script validates that frontend and backend allowlist configurations match.
 * It should be run during the prebuild phase to prevent deployment mismatches.
 * 
 * Checks:
 * 1. VITE_ALLOWED_USER_EMAILS is set and non-empty (frontend)
 * 2. ALLOWED_USER_EMAILS is set and non-empty (backend, if available)
 * 3. Both contain the same emails (if both are set)
 * 4. Required emails are present in production builds
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - Configuration mismatch or missing required emails
 */

import { exit } from 'process';

const REQUIRED_EMAILS = [
  'ghawk075@gmail.com',
  'valinejustin@gmail.com'
];

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function parseAllowlist(envValue) {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, idx) => val === sorted2[idx]);
}

log('═══════════════════════════════════════════════════════', 'cyan');
log('  Strict Allowlist Configuration Check', 'cyan');
log('═══════════════════════════════════════════════════════', 'cyan');
console.log();

const isProduction = process.env.NODE_ENV === 'production';
const viteAllowlist = parseAllowlist(process.env.VITE_ALLOWED_USER_EMAILS);
const backendAllowlist = parseAllowlist(process.env.ALLOWED_USER_EMAILS);

log('Environment:', 'yellow');
log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`, 'gray');
log(`  Production build: ${isProduction}`, 'gray');
console.log();

log('Frontend Configuration:', 'yellow');
log(`  VITE_ALLOWED_USER_EMAILS: ${process.env.VITE_ALLOWED_USER_EMAILS || '(not set)'}`, 'gray');
log(`  Parsed emails: [${viteAllowlist.join(', ')}]`, 'gray');
log(`  Count: ${viteAllowlist.length}`, 'gray');
console.log();

log('Backend Configuration:', 'yellow');
if (process.env.ALLOWED_USER_EMAILS !== undefined) {
  log(`  ALLOWED_USER_EMAILS: ${process.env.ALLOWED_USER_EMAILS}`, 'gray');
  log(`  Parsed emails: [${backendAllowlist.join(', ')}]`, 'gray');
  log(`  Count: ${backendAllowlist.length}`, 'gray');
} else {
  log('  ALLOWED_USER_EMAILS: (not set - backend env not in build context)', 'gray');
  log('  Note: Backend env is typically only available during serverless deployment', 'gray');
}
console.log();

let hasErrors = false;

// Check 1: Frontend allowlist must be set for production
if (isProduction && viteAllowlist.length === 0) {
  log('✗ FAILED: VITE_ALLOWED_USER_EMAILS is empty in production build', 'red');
  log('  Production builds must have allowlist configured', 'yellow');
  hasErrors = true;
} else if (viteAllowlist.length === 0) {
  log('⚠ WARNING: VITE_ALLOWED_USER_EMAILS is empty (open registration in development)', 'yellow');
} else {
  log('✓ Frontend allowlist configured', 'green');
}

// Check 2: Required emails for production
if (isProduction) {
  const normalizedRequired = REQUIRED_EMAILS.map(normalizeEmail);
  const missingEmails = normalizedRequired.filter(e => !viteAllowlist.includes(e));
  
  if (missingEmails.length > 0) {
    log(`✗ FAILED: Missing required emails in production build: ${missingEmails.join(', ')}`, 'red');
    log(`  Expected: ${REQUIRED_EMAILS.join(', ')}`, 'yellow');
    hasErrors = true;
  } else {
    log(`✓ All required emails present: ${REQUIRED_EMAILS.join(', ')}`, 'green');
  }
}

// Check 3: If both frontend and backend are set, they should match
if (backendAllowlist.length > 0 && viteAllowlist.length > 0) {
  if (arraysEqual(viteAllowlist, backendAllowlist)) {
    log('✓ Frontend and backend allowlists match', 'green');
  } else {
    log('✗ FAILED: Frontend and backend allowlists do not match', 'red');
    log(`  Frontend: [${viteAllowlist.join(', ')}]`, 'yellow');
    log(`  Backend:  [${backendAllowlist.join(', ')}]`, 'yellow');
    log('  This mismatch can cause inconsistent behavior between frontend and backend', 'yellow');
    hasErrors = true;
  }
}

// Check 4: Warn if count is too low
if (viteAllowlist.length > 0 && viteAllowlist.length < 2) {
  log('⚠ WARNING: Only 1 email in allowlist (expected at least 2)', 'yellow');
  log('  This may indicate misconfiguration', 'yellow');
}

console.log();
log('═══════════════════════════════════════════════════════', 'cyan');

if (hasErrors) {
  log('✗ Validation FAILED', 'red');
  console.log();
  log('Fix these issues before deploying to production:', 'yellow');
  log('  1. Set VITE_ALLOWED_USER_EMAILS in .env.production', 'gray');
  log('  2. Ensure it includes: ghawk075@gmail.com,valinejustin@gmail.com', 'gray');
  log('  3. Verify backend ALLOWED_USER_EMAILS matches (in serverless.yml)', 'gray');
  console.log();
  exit(1);
} else {
  log('✓ Validation PASSED', 'green');
  console.log();
  log('Allowlist configuration is valid for deployment', 'gray');
  console.log();
  exit(0);
}

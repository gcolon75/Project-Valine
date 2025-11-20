#!/usr/bin/env node

/**
 * Environment Contract Verification Script
 * 
 * Validates that environment variables meet requirements for the current environment.
 * Ensures required production variables are set, no test-only variables in production,
 * no insecure defaults, and proper variable naming conformity.
 */

import { validateSecret, isInsecureDefault } from '../serverless/src/utils/redaction.js';

// Required variables by environment
const REQUIRED_VARS = {
  production: [
    'JWT_SECRET',
    'DATABASE_URL',
    'FRONTEND_URL',
    'ALLOWED_USER_EMAILS',
    'NODE_ENV'
  ],
  staging: [
    'JWT_SECRET',
    'DATABASE_URL',
    'FRONTEND_URL',
    'NODE_ENV'
  ],
  development: [
    'DATABASE_URL'
  ]
};

// Variables that MUST NOT be present in production
const PROHIBITED_IN_PRODUCTION = [
  'TEST_USER_PASSWORD',
  'VITE_ENABLE_DEV_BYPASS'
];

// Deprecated variables that should trigger warnings
const DEPRECATED_VARS = [
  {
    old: 'FRONTEND_BASE_URL',
    new: 'FRONTEND_URL',
    message: 'FRONTEND_BASE_URL is deprecated. Use FRONTEND_URL instead.'
  },
  {
    old: 'AUTH_JWT_SECRET',
    new: 'JWT_SECRET',
    message: 'AUTH_JWT_SECRET is deprecated. Use JWT_SECRET instead.'
  }
];

// Variables that should be validated for security
const SECURITY_CRITICAL_VARS = [
  'JWT_SECRET',
  'DISCORD_BOT_TOKEN',
  'PAT',
  'ORCHESTRATION_BOT_PAT',
  'SMTP_PASS',
  'DATABASE_URL'
];

/**
 * Get current environment
 */
function getEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Map NODE_ENV to our environment names
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'staging') return 'staging';
  return 'development';
}

/**
 * Validate required variables are set
 */
function validateRequired(env) {
  const environment = getEnvironment();
  const required = REQUIRED_VARS[environment] || [];
  const missing = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    environment
  };
}

/**
 * Check for prohibited variables in production
 */
function checkProhibited(env) {
  const environment = getEnvironment();
  
  if (environment !== 'production') {
    return { valid: true, found: [] };
  }
  
  const found = [];
  
  for (const varName of PROHIBITED_IN_PRODUCTION) {
    if (process.env[varName]) {
      found.push(varName);
    }
  }
  
  return {
    valid: found.length === 0,
    found
  };
}

/**
 * Check for deprecated variables
 */
function checkDeprecated(env) {
  const warnings = [];
  
  for (const { old, new: newVar, message } of DEPRECATED_VARS) {
    if (process.env[old]) {
      warnings.push({
        variable: old,
        replacement: newVar,
        message,
        hasReplacement: !!process.env[newVar]
      });
    }
  }
  
  return {
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Validate security-critical variables
 */
function validateSecurity(env) {
  const issues = [];
  
  for (const varName of SECURITY_CRITICAL_VARS) {
    const value = process.env[varName];
    
    if (!value) {
      continue; // Skip if not set (handled by required check)
    }
    
    // Check for insecure defaults
    if (isInsecureDefault(varName, value)) {
      issues.push({
        variable: varName,
        issue: 'insecure_default',
        message: `${varName} is set to an insecure default value`
      });
      continue;
    }
    
    // Validate secret requirements
    const validation = validateSecret(varName, value);
    if (!validation.valid) {
      issues.push({
        variable: varName,
        issue: 'validation_failed',
        message: `${varName}: ${validation.reason}`
      });
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Check variable naming conformity
 */
function checkNamingConformity(env) {
  const issues = [];
  
  // Check for FRONTEND_BASE_URL when FRONTEND_URL should be used
  if (process.env.FRONTEND_BASE_URL && !process.env.FRONTEND_URL) {
    issues.push({
      variable: 'FRONTEND_BASE_URL',
      issue: 'deprecated_usage',
      message: 'FRONTEND_BASE_URL is set but FRONTEND_URL is not. Migrate to FRONTEND_URL.'
    });
  }
  
  // Check for inconsistent test user variables
  const hasTestEmail = !!process.env.TEST_USER_EMAIL;
  const hasTestPassword = !!process.env.TEST_USER_PASSWORD;
  
  if (hasTestEmail !== hasTestPassword) {
    issues.push({
      variable: 'TEST_USER_*',
      issue: 'inconsistent_config',
      message: 'TEST_USER_EMAIL and TEST_USER_PASSWORD should both be set or both unset'
    });
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Main validation function
 */
function validateEnvironment() {
  const results = {
    environment: getEnvironment(),
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // Run all checks
  results.checks.required = validateRequired();
  results.checks.prohibited = checkProhibited();
  results.checks.deprecated = checkDeprecated();
  results.checks.security = validateSecurity();
  results.checks.naming = checkNamingConformity();
  
  // Determine overall status
  results.valid = 
    results.checks.required.valid &&
    results.checks.prohibited.valid &&
    results.checks.security.valid &&
    results.checks.naming.valid;
  
  return results;
}

/**
 * Format results for output
 */
function formatResults(results) {
  const lines = [];
  
  lines.push('');
  lines.push('🔍 Environment Contract Validation');
  lines.push('═'.repeat(50));
  lines.push(`Environment: ${results.environment.toUpperCase()}`);
  lines.push(`Timestamp: ${results.timestamp}`);
  lines.push('');
  
  // Required variables
  if (results.checks.required.valid) {
    lines.push('✅ Required Variables: All present');
  } else {
    lines.push('❌ Required Variables: Missing variables');
    for (const varName of results.checks.required.missing) {
      lines.push(`   - ${varName}`);
    }
  }
  lines.push('');
  
  // Prohibited variables
  if (results.checks.prohibited.valid) {
    lines.push('✅ Prohibited Variables: None found');
  } else {
    lines.push('❌ Prohibited Variables: Found in production');
    for (const varName of results.checks.prohibited.found) {
      lines.push(`   - ${varName} (must not be set in production)`);
    }
  }
  lines.push('');
  
  // Deprecated variables
  if (results.checks.deprecated.hasWarnings) {
    lines.push('⚠️  Deprecated Variables: Found');
    for (const warning of results.checks.deprecated.warnings) {
      lines.push(`   - ${warning.variable}`);
      lines.push(`     → ${warning.message}`);
      if (warning.hasReplacement) {
        lines.push(`     ✓ Replacement ${warning.replacement} is set`);
      } else {
        lines.push(`     ✗ Replacement ${warning.replacement} is NOT set`);
      }
    }
  } else {
    lines.push('✅ Deprecated Variables: None found');
  }
  lines.push('');
  
  // Security validation
  if (results.checks.security.valid) {
    lines.push('✅ Security Validation: All secrets valid');
  } else {
    lines.push('❌ Security Validation: Issues detected');
    for (const issue of results.checks.security.issues) {
      lines.push(`   - ${issue.variable}: ${issue.message}`);
    }
  }
  lines.push('');
  
  // Naming conformity
  if (results.checks.naming.valid) {
    lines.push('✅ Naming Conformity: All variables use correct names');
  } else {
    lines.push('⚠️  Naming Conformity: Issues detected');
    for (const issue of results.checks.naming.issues) {
      lines.push(`   - ${issue.variable}: ${issue.message}`);
    }
  }
  lines.push('');
  
  // Overall result
  lines.push('═'.repeat(50));
  if (results.valid) {
    lines.push('✅ VALIDATION PASSED: Environment is properly configured');
  } else {
    lines.push('❌ VALIDATION FAILED: Environment has configuration issues');
    lines.push('');
    lines.push('Please fix the issues above before deploying.');
  }
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  const results = validateEnvironment();
  
  // JSON output mode
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.valid ? 0 : 1);
  }
  
  // Human-readable output
  console.log(formatResults(results));
  
  // Exit with appropriate code
  process.exit(results.valid ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateEnvironment, getEnvironment, REQUIRED_VARS };

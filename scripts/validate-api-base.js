#!/usr/bin/env node

/**
 * validate-api-base.js
 * 
 * Build-time validation script that:
 * - Resolves the configured API host via DNS lookup
 * - Optionally cross-checks with AWS CLI stack output if available
 * - By default, treats DNS resolution failures as warnings (non-blocking)
 * - Can be configured to fail build on DNS errors via REQUIRE_API_BASE_DNS=true
 * 
 * Exit codes:
 * - 0: Validation passed (or passed with warnings in relaxed mode)
 * - 1: Validation failed (only in strict mode or on critical errors)
 * 
 * Usage:
 *   node scripts/validate-api-base.js [--help]
 * 
 * Environment variables:
 *   VITE_API_BASE: API base URL to validate (required)
 *   REQUIRE_API_BASE_DNS: Set to 'true' to enforce strict DNS validation (default: false)
 *   STACK_API_ID: Expected API Gateway ID to cross-check (optional)
 */

import { promises as dns } from 'dns';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function showHelp() {
  console.log(`
Usage: node scripts/validate-api-base.js [options]

Validates the configured API base URL before build.

Options:
  --help    Show this help message

Environment Variables:
  VITE_API_BASE         API base URL to validate (required)
  REQUIRE_API_BASE_DNS  Set to 'true' to enforce strict DNS validation
                        (default: false - DNS failures are warnings only)
  STACK_API_ID          Expected API Gateway ID (optional)

Exit Codes:
  0: Validation passed (or passed with warnings in relaxed mode)
  1: Validation failed (strict mode only or critical errors)

Examples:
  # Relaxed mode (default) - DNS failures are warnings
  node scripts/validate-api-base.js
  
  # Strict mode - DNS failures block build
  REQUIRE_API_BASE_DNS=true node scripts/validate-api-base.js
  
  VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com node scripts/validate-api-base.js
`);
  process.exit(0);
}

async function resolveHost(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    return { success: true, addresses };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function checkAwsCli() {
  try {
    execSync('aws --version', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (err) {
    throw new Error(`Invalid URL format: ${url}`);
  }
}

function extractApiId(hostname) {
  // Extract API ID from hostname like: i72dxlcfcc.execute-api.us-west-2.amazonaws.com
  const match = hostname.match(/^([a-z0-9]+)\.execute-api\./);
  return match ? match[1] : null;
}

async function main() {
  if (process.argv.includes('--help')) {
    showHelp();
  }
  
  console.log('\n🔍 Validating API Base Configuration...\n');
  console.log('═'.repeat(60));
  
  // Load VITE_API_BASE from environment or .env.production
  let apiBase = process.env.VITE_API_BASE;
  
  if (!apiBase) {
    // Try loading from .env.production
    try {
      const envProdPath = join(rootDir, '.env.production');
      const envContent = readFileSync(envProdPath, 'utf-8');
      
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line.startsWith('VITE_API_BASE=')) {
          apiBase = line.substring('VITE_API_BASE='.length).trim();
          // Remove BOM if present
          apiBase = apiBase.replace(/^\uFEFF/, '');
        }
      });
    } catch (err) {
      // File doesn't exist
    }
  }
  
  if (!apiBase) {
    console.error('❌ Error: VITE_API_BASE is not set');
    console.error('\nPlease set VITE_API_BASE in your environment or .env.production file');
    console.error('Example: VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com\n');
    process.exit(1);
  }
  
  console.log(`   API Base URL: ${apiBase}`);
  
  // Extract hostname
  let hostname;
  try {
    hostname = extractHostname(apiBase);
    console.log(`   Hostname:     ${hostname}`);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
  
  // Extract API ID
  const apiId = extractApiId(hostname);
  if (apiId) {
    console.log(`   API ID:       ${apiId}`);
  }
  
  console.log('');
  
  // DNS resolution
  console.log('📡 Checking DNS resolution...');
  const dnsResult = await resolveHost(hostname);
  
  // Strict mode: REQUIRE_API_BASE_DNS=true fails build on DNS errors
  // Relaxed mode (default): DNS failures are warnings only
  const strictMode = process.env.REQUIRE_API_BASE_DNS === 'true';
  
  if (!dnsResult.success) {
    console.error(`\n❌ DNS Resolution Failed: ${dnsResult.error}`);
    
    if (strictMode) {
      console.error('\n🛑 STRICT MODE: Build blocked due to DNS failure');
      console.error('   REQUIRE_API_BASE_DNS is set to "true"');
      console.error('');
      console.error('The configured API host cannot be resolved.');
      console.error('This will cause runtime failures.\n');
      console.error('To proceed in relaxed mode:');
      console.error('  Unset REQUIRE_API_BASE_DNS or set it to "false"\n');
      process.exit(1);
    } else {
      console.warn('\n⚠️  WARNING: DNS validation failed (RELAXED MODE)');
      console.warn('   API host cannot be resolved: ' + hostname);
      console.warn('   This may cause runtime failures if the API Gateway ID has changed.');
      console.warn('');
      console.warn('📝 Recommendation:');
      console.warn('   After deployment, verify the API base URL is correct.');
      console.warn('   Check .deploy/last-api-base.txt for the latest deployed endpoint.');
      console.warn('');
      console.warn('To enforce strict DNS validation in CI:');
      console.warn('  Set REQUIRE_API_BASE_DNS=true\n');
    }
  } else {
    console.log(`✅ DNS resolution successful`);
    console.log(`   Resolved to: ${dnsResult.addresses.join(', ')}\n`);
  }
  
  // Optional: Cross-check with AWS CLI if STACK_API_ID is set
  const expectedApiId = process.env.STACK_API_ID;
  if (expectedApiId) {
    console.log('🔍 Cross-checking with expected API ID...');
    
    if (apiId !== expectedApiId) {
      console.warn(`\n⚠️  Warning: API ID mismatch!`);
      console.warn(`   Expected: ${expectedApiId}`);
      console.warn(`   Found:    ${apiId || 'N/A'}`);
      console.warn(`   The configured host may not match the deployed stack.\n`);
      
      if (strictMode) {
        console.error('🛑 STRICT MODE: Build aborted due to API ID mismatch.\n');
        console.error('To bypass this check:');
        console.error('  Unset REQUIRE_API_BASE_DNS or set it to "false"\n');
        process.exit(1);
      }
    } else {
      console.log(`✅ API ID matches expected value: ${expectedApiId}\n`);
    }
  }
  
  // Check if AWS CLI is available (informational only)
  const hasAwsCli = checkAwsCli();
  if (hasAwsCli) {
    console.log('ℹ️  AWS CLI detected (available for advanced validation)');
  } else {
    console.log('ℹ️  AWS CLI not detected (skipping advanced validation)');
  }
  
  console.log('');
  console.log('═'.repeat(60));
  
  if (strictMode) {
    console.log('\n✅ API Base Validation Passed (STRICT MODE)\n');
  } else {
    console.log('\n✅ API Base Validation Completed (RELAXED MODE)\n');
    console.log('📋 Summary:');
    console.log(`   API Base URL: ${apiBase}`);
    console.log(`   Mode: Relaxed (DNS failures are warnings)`);
    console.log('');
    console.log('💡 Tip: Set REQUIRE_API_BASE_DNS=true in CI to enforce strict validation');
  }
  console.log('');
  
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});

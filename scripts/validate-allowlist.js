#!/usr/bin/env node

/**
 * Allowlist Prebuild Validation Script
 * 
 * Validates that VITE_ALLOWED_USER_EMAILS is properly configured before building.
 * This ensures production deployments always have the correct allowlist configured.
 * 
 * Required emails: ghawk075@gmail.com, valinejustin@gmail.com
 * 
 * Exit codes:
 * 0 - Validation passed
 * 1 - Validation failed (missing or incorrect allowlist)
 */

const REQUIRED_EMAILS = [
  'ghawk075@gmail.com',
  'valinejustin@gmail.com'
];

const PRODUCTION_DOMAINS = [
  'cloudfront.net',
  'projectvaline.com'
];

/**
 * Check if this is a production build
 */
function isProductionBuild() {
  const frontendUrl = process.env.VITE_FRONTEND_URL || '';
  return PRODUCTION_DOMAINS.some(domain => frontendUrl.includes(domain));
}

/**
 * Parse and validate the allowlist
 */
function validateAllowlist() {
  console.log('\n🔍 Validating allowlist configuration...\n');

  const allowlistEnv = process.env.VITE_ALLOWED_USER_EMAILS || '';
  
  // In development, allowlist is optional
  if (!isProductionBuild() && !allowlistEnv) {
    console.log('ℹ️  Development build: Allowlist not required');
    console.log('✅ Validation passed\n');
    return true;
  }

  // Parse allowlist
  const allowedEmails = allowlistEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  console.log(`📋 Configured allowlist (${allowedEmails.length} emails):`);
  allowedEmails.forEach(email => console.log(`   - ${email}`));
  console.log('');

  // Validate required emails are present
  const missingEmails = REQUIRED_EMAILS.filter(
    required => !allowedEmails.includes(required.toLowerCase())
  );

  if (missingEmails.length > 0) {
    console.error('❌ ALLOWLIST VALIDATION FAILED\n');
    console.error('Missing required emails:');
    missingEmails.forEach(email => console.error(`   - ${email}`));
    console.error('\nRequired emails:');
    REQUIRED_EMAILS.forEach(email => console.error(`   - ${email}`));
    console.error('\nPlease set VITE_ALLOWED_USER_EMAILS with all required emails.');
    console.error('Example: VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com\n');
    return false;
  }

  // Check for production build requirements
  if (isProductionBuild()) {
    console.log('🚀 Production build detected');
    console.log(`   Frontend URL: ${process.env.VITE_FRONTEND_URL}`);
    
    if (allowedEmails.length === 0) {
      console.error('\n❌ PRODUCTION BUILD REQUIRES ALLOWLIST\n');
      console.error('VITE_ALLOWED_USER_EMAILS must be set for production builds.');
      console.error('This ensures only authorized users can register.\n');
      return false;
    }
  }

  console.log('✅ Allowlist validation passed');
  console.log(`   All ${REQUIRED_EMAILS.length} required emails are configured\n`);
  return true;
}

// Run validation
const success = validateAllowlist();
process.exit(success ? 0 : 1);

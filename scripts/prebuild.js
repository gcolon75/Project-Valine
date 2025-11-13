#!/usr/bin/env node

/**
 * Pre-build validation script
 * 
 * Ensures dev bypass is never accidentally deployed to production.
 * Fails the build if VITE_ENABLE_DEV_BYPASS=true AND 
 * VITE_FRONTEND_URL contains production domains.
 */

const devBypassEnabled = process.env.VITE_ENABLE_DEV_BYPASS === 'true';
const frontendUrl = process.env.VITE_FRONTEND_URL || '';

console.log('🔍 Running pre-build validation...');
console.log(`   VITE_ENABLE_DEV_BYPASS: ${process.env.VITE_ENABLE_DEV_BYPASS}`);
console.log(`   VITE_FRONTEND_URL: ${frontendUrl}`);

if (devBypassEnabled) {
  // Check if frontend URL contains production domains
  const productionDomainPattern = /cloudfront\.net|projectvaline\.com/i;
  
  if (productionDomainPattern.test(frontendUrl)) {
    console.error('\n❌ BUILD FAILED: Dev Bypass Security Check');
    console.error('═══════════════════════════════════════════════════');
    console.error('');
    console.error('VITE_ENABLE_DEV_BYPASS is set to "true" but VITE_FRONTEND_URL');
    console.error('contains a production domain:');
    console.error(`  ${frontendUrl}`);
    console.error('');
    console.error('This is a security risk! Dev bypass MUST NOT be enabled in production.');
    console.error('');
    console.error('To fix this:');
    console.error('  1. Set VITE_ENABLE_DEV_BYPASS=false in your .env.production file');
    console.error('  2. Or use a localhost URL for VITE_FRONTEND_URL in development');
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    process.exit(1);
  }
  
  console.log('⚠️  Dev Bypass is ENABLED - this build should only be used locally');
}

console.log('✅ Pre-build validation passed\n');

#!/usr/bin/env node

/**
 * Pre-build validation script
 * 
 * Ensures dev bypass is never accidentally deployed to production.
 * Fails the build if VITE_ENABLE_DEV_BYPASS=true AND 
 * VITE_FRONTEND_URL contains production domains.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load env vars from process.env first (from shell or .env)
let devBypassEnabled = process.env.VITE_ENABLE_DEV_BYPASS === 'true';
let frontendUrl = process.env.VITE_FRONTEND_URL || '';

// If running production build, also check .env.production file
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
if (mode === 'production') {
  try {
    const envProdPath = join(rootDir, '.env.production');
    const envProdContent = readFileSync(envProdPath, 'utf-8');
    
    // Parse simple KEY=value lines (ignore comments and empty lines)
    envProdContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^VITE_ENABLE_DEV_BYPASS=(.+)$/);
      if (match) {
        devBypassEnabled = match[1] === 'true';
      }
      
      const urlMatch = line.match(/^VITE_FRONTEND_URL=(.+)$/);
      if (urlMatch) {
        frontendUrl = urlMatch[1];
      }
    });
  } catch (e) {
    // .env.production doesn't exist, that's okay
    console.log('   (No .env.production file found, using shell env vars)');
  }
}

console.log('🔍 Running pre-build validation...');
console.log(`   Mode: ${mode}`);
console.log(`   VITE_ENABLE_DEV_BYPASS: ${devBypassEnabled}`);
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

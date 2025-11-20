#!/usr/bin/env node
/**
 * Pre-deployment Verification Script
 * Validates critical configuration before production deployment
 * 
 * Usage:
 *   node scripts/verify-predeploy.mjs
 * 
 * Checks:
 *   1. error() helper signature is correct
 *   2. JWT_SECRET is not default in production
 *   3. Prisma binaryTargets matches environment
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;

let hasErrors = false;

/**
 * Log error and set exit flag
 */
function error(msg) {
  console.error(`❌ ERROR: ${msg}`);
  hasErrors = true;
}

/**
 * Log warning
 */
function warn(msg) {
  console.warn(`⚠️  WARNING: ${msg}`);
}

/**
 * Log success
 */
function success(msg) {
  console.log(`✓ ${msg}`);
}

/**
 * Check error() helper signature
 */
function checkErrorHelper() {
  const headersPath = resolve(__dirname, '../serverless/src/utils/headers.js');
  
  try {
    const content = readFileSync(headersPath, 'utf-8');
    
    // Check for correct signature: error(statusCode = 400, message = 'Bad Request', extra = {})
    const correctSignature = /export\s+function\s+error\s*\(\s*statusCode\s*=\s*\d+/;
    
    if (correctSignature.test(content)) {
      success('error() helper signature is correct (statusCode first)');
    } else {
      error('error() helper signature may be incorrect. Expected: error(statusCode, message, extra)');
    }
  } catch (e) {
    error(`Could not read headers.js: ${e.message}`);
  }
}

/**
 * Check JWT secret in production
 */
function checkJwtSecret() {
  const isProd = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  
  if (isProd && jwtSecret === 'dev-secret-key-change-in-production') {
    error('JWT_SECRET is set to default value in production! This is a CRITICAL security issue.');
    error('Set a strong JWT_SECRET environment variable before deploying.');
  } else if (isProd) {
    success('JWT_SECRET is configured for production');
  } else {
    warn('Running in development mode - JWT_SECRET validation skipped');
  }
}

/**
 * Check Prisma binaryTargets
 */
function checkPrismaBinaryTargets() {
  const schemaPath = resolve(__dirname, '../serverless/prisma/schema.prisma');
  const isProd = process.env.NODE_ENV === 'production';
  
  try {
    const content = readFileSync(schemaPath, 'utf-8');
    
    // Extract binaryTargets
    const match = content.match(/binaryTargets\s*=\s*\[(.*?)\]/s);
    
    if (!match) {
      warn('Could not find binaryTargets in schema.prisma');
      return;
    }
    
    const targets = match[1];
    const hasMultiplePlatforms = targets.includes('windows') || targets.includes('darwin');
    
    if (isProd && hasMultiplePlatforms) {
      warn('Production build includes multiple platforms in binaryTargets');
      warn('Consider running: node scripts/prisma-optimize.mjs --prod');
      warn('This will reduce Lambda package size by ~50-70%');
    } else if (isProd) {
      success('Prisma binaryTargets optimized for production (Linux only)');
    } else {
      success('Prisma binaryTargets configured for development (multi-platform)');
    }
  } catch (e) {
    warn(`Could not read schema.prisma: ${e.message}`);
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentVars() {
  const requiredVars = ['DATABASE_URL'];
  const prodVars = ['ALLOWED_USER_EMAILS', 'COOKIE_DOMAIN'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      error(`Missing required environment variable: ${varName}`);
    }
  }
  
  if (process.env.NODE_ENV === 'production') {
    for (const varName of prodVars) {
      if (!process.env[varName]) {
        warn(`Production deployment missing recommended variable: ${varName}`);
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('              PRE-DEPLOYMENT VERIFICATION                      ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
  
  checkErrorHelper();
  checkJwtSecret();
  checkPrismaBinaryTargets();
  checkEnvironmentVars();
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  
  if (hasErrors) {
    console.error('❌ Verification FAILED - fix errors before deploying\n');
    process.exit(EXIT_ERROR);
  } else {
    console.log('✅ All checks passed - ready for deployment\n');
    process.exit(EXIT_SUCCESS);
  }
}

main();

#!/usr/bin/env node
/**
 * Prisma Binary Optimization Script
 * Rewrites schema.prisma binaryTargets for production deployment
 * 
 * Usage:
 *   # Development (keeps all targets):
 *   node scripts/prisma-optimize.mjs --dev
 * 
 *   # Production (slim build - Linux only):
 *   node scripts/prisma-optimize.mjs --prod
 * 
 * Workflow:
 *   - Dev: Use expanded targets for cross-platform development
 *   - Prod CI: Run with --prod before prisma generate
 *   - Result: Production bundle ~50-70% smaller (query engine is largest artifact)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const SCHEMA_PATH = resolve(__dirname, '../serverless/prisma/schema.prisma');

// Target configurations
const DEV_TARGETS = '["native", "rhel-openssl-3.0.x", "windows", "darwin", "darwin-arm64"]';
const PROD_TARGETS = '["rhel-openssl-3.0.x"]';

/**
 * Rewrite binaryTargets in schema.prisma
 */
function optimizeSchema(isProd) {
  console.log('[prisma-optimize] Reading schema.prisma...');
  
  let schema;
  try {
    schema = readFileSync(SCHEMA_PATH, 'utf-8');
  } catch (e) {
    console.error('[prisma-optimize] Error reading schema.prisma:', e.message);
    process.exit(1);
  }
  
  const targets = isProd ? PROD_TARGETS : DEV_TARGETS;
  const mode = isProd ? 'PRODUCTION' : 'DEVELOPMENT';
  
  // Match binaryTargets line and replace
  const updatedSchema = schema.replace(
    /binaryTargets\s*=\s*\[.*?\]/s,
    `binaryTargets = ${targets}`
  );
  
  if (updatedSchema === schema) {
    console.warn('[prisma-optimize] Warning: No binaryTargets found to replace');
    console.warn('[prisma-optimize] Schema may already be in target state or malformed');
  }
  
  console.log(`[prisma-optimize] Writing ${mode} configuration...`);
  console.log(`[prisma-optimize] Targets: ${targets}`);
  
  try {
    writeFileSync(SCHEMA_PATH, updatedSchema, 'utf-8');
    console.log('[prisma-optimize] ✓ Schema updated successfully');
  } catch (e) {
    console.error('[prisma-optimize] Error writing schema.prisma:', e.message);
    process.exit(1);
  }
  
  console.log('\nNext steps:');
  if (isProd) {
    console.log('  1. Run: cd serverless && npm run prisma:generate');
    console.log('  2. Deploy Lambda with slimmed Prisma client');
    console.log('  3. Production binary size reduced by ~50-70%');
  } else {
    console.log('  1. Run: cd serverless && npm run prisma:generate');
    console.log('  2. Continue local development with cross-platform support');
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || (!args.includes('--dev') && !args.includes('--prod'))) {
    console.error('Usage: node scripts/prisma-optimize.mjs [--dev|--prod]');
    console.error('');
    console.error('  --dev   Use development targets (all platforms)');
    console.error('  --prod  Use production targets (Linux only)');
    process.exit(1);
  }
  
  const isProd = args.includes('--prod');
  optimizeSchema(isProd);
}

main();

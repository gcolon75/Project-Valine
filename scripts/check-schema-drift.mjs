#!/usr/bin/env node
/**
 * Schema Drift Checker
 * 
 * Compares api/prisma/schema.prisma and serverless/prisma/schema.prisma
 * to ensure they remain synchronized. Exits with error code 1 if differences found.
 * 
 * Usage: node scripts/check-schema-drift.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const apiSchemaPath = resolve(projectRoot, 'api/prisma/schema.prisma');
const serverlessSchemaPath = resolve(projectRoot, 'serverless/prisma/schema.prisma');

try {
  const apiSchema = readFileSync(apiSchemaPath, 'utf8');
  const serverlessSchema = readFileSync(serverlessSchemaPath, 'utf8');

  if (apiSchema === serverlessSchema) {
    console.log('✅ Schema files are in sync');
    process.exit(0);
  } else {
    console.error('❌ Schema drift detected!');
    console.error('');
    console.error('The following files are out of sync:');
    console.error(`  - ${apiSchemaPath}`);
    console.error(`  - ${serverlessSchemaPath}`);
    console.error('');
    console.error('These schemas MUST be kept identical to prevent Prisma client generation drift.');
    console.error('');
    console.error('To fix:');
    console.error('  1. Review differences: diff -u api/prisma/schema.prisma serverless/prisma/schema.prisma');
    console.error('  2. Manually sync the schemas or copy one to the other');
    console.error('  3. Ensure both are identical');
    console.error('');
    console.error('WORKFLOW:');
    console.error('  - Development: Make changes to api/prisma/schema.prisma first');
    console.error('  - Create migration: cd api && npx prisma migrate dev --name your_migration');
    console.error('  - Sync to serverless: Copy updated schema and migration to serverless/prisma/');
    console.error('  - Deploy: Production uses serverless/prisma/ for Prisma client generation');
    console.error('  - Both schemas MUST stay in sync to prevent runtime errors!');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error reading schema files:', error.message);
  process.exit(1);
}

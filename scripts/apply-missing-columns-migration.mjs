#!/usr/bin/env node

/**
 * Script to directly apply missing columns migration to PostgreSQL
 * This bypasses Prisma and executes SQL directly
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required');
  console.error('');
  console.error('Please set DATABASE_URL with your PostgreSQL connection string:');
  console.error('  export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"');
  console.error('');
  process.exit(1);
}

const MIGRATION_FILE = path.join(
  __dirname, 
  '../api/prisma/migrations/20251122012600_fix_missing_user_columns/migration.sql'
);

async function applyMigration() {
  console.log('🔄 Applying missing columns migration...\n');
  
  // Configure SSL based on environment
  const sslConfig = process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }  // Strict SSL validation in production
    : { rejectUnauthorized: false }; // Relaxed for development/testing
  
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: sslConfig
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Read migration SQL
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
    console.log('📄 Executing migration SQL...\n');
    
    // Execute migration
    await client.query(sql);
    console.log('✅ Migration executed successfully\n');
    
    // Verify columns exist
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('onboardingComplete', 'status', 'theme')
      ORDER BY column_name;
    `);
    
    console.log('📊 Verification Results:');
    console.log('========================\n');
    
    if (result.rows.length === 3) {
      console.log('✅ All 3 columns exist:\n');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}`);
        console.log(`    Type: ${row.data_type}`);
        console.log(`    Nullable: ${row.is_nullable}`);
        console.log(`    Default: ${row.column_default || 'none'}\n`);
      });
    } else {
      console.error('❌ Some columns are still missing!');
      console.error(`Expected 3 columns, found ${result.rows.length}`);
      process.exit(1);
    }
    
    // Mark migration as applied in Prisma's migration table
    // Calculate checksum of migration file for Prisma's tracking
    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    
    await client.query(`
      INSERT INTO "_prisma_migrations" 
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES 
        (gen_random_uuid(), $1, NOW(), '20251122012600_fix_missing_user_columns', '', NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `, [checksum]);
    
    console.log('✅ Migration marked as applied in Prisma history\n');
    console.log('🎉 Migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

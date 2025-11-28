#!/usr/bin/env node

/**
 * Script to directly apply missing columns migration to PostgreSQL
 * This bypasses Prisma and executes SQL directly
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_NAME = '20251122012600_fix_missing_user_columns';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required');
  console.error('');
  console.error('Please set DATABASE_URL with your PostgreSQL connection string:');
  console.error('  export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"');
  console.error('');
  process.exit(1);
}

// Validate DATABASE_URL for common issues
function validateDatabaseUrl(url) {
  // Check for spaces in the URL (common copy-paste issue)
  if (/\s/.test(url)) {
    const sanitizedUrl = url.replace(/:([^@]+)@/, ':***@');
    console.error('❌ DATABASE_URL contains spaces!');
    console.error('');
    console.error('Sanitized URL showing space location:');
    console.error(`  ${sanitizedUrl}`);
    console.error('');
    console.error('Common issue: Space in hostname (e.g., "rds. amazonaws.com" should be "rds.amazonaws.com")');
    console.error('');
    return false;
  }
  return true;
}

if (!validateDatabaseUrl(DATABASE_URL)) {
  process.exit(1);
}

const MIGRATION_FILE = path.join(
  __dirname, 
  `../api/prisma/migrations/${MIGRATION_NAME}/migration.sql`
);

async function applyMigration() {
  console.log('🔄 Applying missing columns migration...\n');
  
  // Log connection info (without password)
  try {
    const urlObj = new URL(DATABASE_URL);
    console.log(`📡 Connecting to: ${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`);
  } catch {
    console.log('📡 Connecting to database...');
  }

  // Configure SSL for AWS RDS
  // AWS RDS uses certificates signed by Amazon's CA which may not be in the default trust store
  // Using rejectUnauthorized: false allows connections to AWS RDS
  // For production with strict validation, download the AWS RDS CA bundle from:
  // https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
  // Then use: ssl: { rejectUnauthorized: true, ca: fs.readFileSync('rds-ca-cert.pem') }
  const sslConfig = {
    rejectUnauthorized: false  // Required for AWS RDS self-signed certificate chain
  };
  
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
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    
    await client.query(`
      INSERT INTO "_prisma_migrations" 
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES 
        (gen_random_uuid(), $1, NOW(), $2, '', NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `, [checksum, MIGRATION_NAME]);
    
    console.log('✅ Migration marked as applied in Prisma history\n');
    console.log('🎉 Migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    
    // Provide helpful debugging info based on error type
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 DNS lookup failed - hostname not found');
      console.error('   Check for spaces or typos in the DATABASE_URL hostname');
      console.error('   Example: "rds. amazonaws.com" should be "rds.amazonaws.com"');
    } else if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN' || error.message.includes('self-signed certificate')) {
      console.error('🔐 SSL certificate error');
      console.error('   This script uses rejectUnauthorized: false for AWS RDS');
      console.error('   If you still see this error, check your pg library version');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused');
      console.error('   Check if the database server is running and accessible');
      console.error('   Verify security group/firewall rules allow your connection');
    }
    
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

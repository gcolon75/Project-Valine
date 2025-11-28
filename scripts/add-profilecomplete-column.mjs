#!/usr/bin/env node

/**
 * Script to apply profileComplete column migration to PostgreSQL
 * This executes SQL directly, bypassing Prisma
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_NAME = '20251128020000_add_profilecomplete';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  console.error('');
  console.error('Please set DATABASE_URL with your PostgreSQL connection string:');
  console.error('  export DATABASE_URL="postgresql://USER:PASS@HOST:PORT/DB?sslmode=require"');
  console.error('');
  process.exit(1);
}

const MIGRATION_FILE = path.join(
  __dirname,
  `../serverless/prisma/migrations/${MIGRATION_NAME}/migration.sql`
);

async function applyMigration() {
  console.log('🔄 Applying profileComplete column migration...\n');

  // Configure SSL based on environment
  const sslConfig = process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: sslConfig
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
    console.log('📄 Executing migration...\n');

    await client.query(sql);
    console.log('✅ Migration executed successfully\n');

    // Verify column exists
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'profileComplete';
    `);

    console.log('📊 Verification Results:');
    console.log('========================\n');

    if (result.rows.length > 0) {
      console.log('✅ Verification: profileComplete column exists');
      console.table(result.rows);
    } else {
      console.error('❌ Verification failed: profileComplete column not found');
      process.exit(1);
    }

    // Mark migration as applied in Prisma's migration table
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    await client.query(`
      INSERT INTO "_prisma_migrations" 
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES 
        (gen_random_uuid(), $1, NOW(), $2, '', NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `, [checksum, MIGRATION_NAME]);

    console.log('\n✅ Migration marked as applied in Prisma history');
    console.log('🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

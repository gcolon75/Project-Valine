#!/usr/bin/env node

/**
 * Verify that users table has all required columns
 */

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required');
  console.error('');
  console.error('Please set DATABASE_URL with your PostgreSQL connection string:');
  console.error('  export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"');
  console.error('');
  process.exit(1);
}

async function verifyColumns() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Users Table Schema:');
    console.log('======================\n');
    
    const requiredColumns = ['onboardingComplete', 'status', 'theme'];
    const existingColumns = result.rows.map(r => r.column_name);
    
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      const icon = exists ? '✅' : '❌';
      console.log(`${icon} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    console.log('\n📊 Full Column List:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    const allExist = requiredColumns.every(col => existingColumns.includes(col));
    
    if (allExist) {
      console.log('\n✅ All required columns exist!\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some columns are missing!\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyColumns();

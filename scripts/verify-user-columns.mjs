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

async function verifyColumns() {
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
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyColumns();

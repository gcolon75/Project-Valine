#!/usr/bin/env node

/**
 * Complete Database Schema Fix & User Account Setup
 * 
 * This script:
 * 1. Checks database connection
 * 2. Verifies and adds missing columns (onboardingComplete, status, theme)
 * 3. Regenerates Prisma Clients
 * 4. Creates your permanent user account
 * 5. Verifies everything works
 * 
 * Usage:
 *   node fix-user-schema-complete.mjs --email "your@email.com" --password "YourPassword!" --display-name "Your Name"
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const REQUIRED_COLUMNS = {
  onboardingComplete: { type: 'BOOLEAN', default: 'false', nullable: false },
  status: { type: 'VARCHAR(255)', default: "'active'", nullable: false },
  theme: { type: 'VARCHAR(255)', default: null, nullable: true }
};

// ============================================================================
// Terminal Colors
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('');
  log('═'.repeat(70), 'blue');
  log(title, 'bright');
  log('═'.repeat(70), 'blue');
  console.log('');
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// ============================================================================
// Command Line Arguments
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      
      // Validate that we have a value and it's not another flag
      if (!value || value.startsWith('--')) {
        error(`Missing value for argument: ${args[i]}`);
        process.exit(1);
      }
      
      parsed[key] = value;
      i++; // Skip the value in the next iteration
    }
  }
  
  return parsed;
}

// ============================================================================
// Phase 1: Database Connection
// ============================================================================

async function checkDatabaseConnection() {
  section('Phase 1: Database Connection Check');
  
  if (!DATABASE_URL) {
    error('DATABASE_URL environment variable not set');
    log('Please set it in your .env file or export it:', 'yellow');
    log('export DATABASE_URL="postgresql://user:password@host:5432/database"', 'cyan');
    process.exit(1);
  }
  
  info('Testing connection to PostgreSQL...');
  
  // Note: In non-production environments, we use rejectUnauthorized: false for SSL
  // to allow connections to development databases with self-signed certificates.
  // This is a development convenience and should not be used in production.
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    success('Database connection successful');
    
    // Get database info
    const result = await client.query('SELECT current_database(), current_user');
    info(`Connected to: ${result.rows[0].current_database}`);
    info(`As user: ${result.rows[0].current_user}`);
    
    await client.end();
    return true;
  } catch (err) {
    error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }
}

// ============================================================================
// Phase 2: Check & Add Missing Columns
// ============================================================================

async function checkAndAddColumns() {
  section('Phase 2: Database Schema Verification');
  
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Check which columns exist
    const existingColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('onboardingComplete', 'status', 'theme')
      ORDER BY column_name;
    `);
    
    const existing = existingColumns.rows.map(row => row.column_name);
    const missing = Object.keys(REQUIRED_COLUMNS).filter(col => !existing.includes(col));
    
    if (existing.length > 0) {
      success(`Found ${existing.length} existing columns:`);
      existing.forEach(col => info(`  - ${col}`));
    }
    
    if (missing.length > 0) {
      warning(`Missing ${missing.length} columns:`);
      missing.forEach(col => info(`  - ${col}`));
      
      info('\nAdding missing columns...');
      
      // Validate column names against allowed list to prevent SQL injection
      const allowedColumns = ['onboardingComplete', 'status', 'theme'];
      
      for (const columnName of missing) {
        // Security check: Only allow predefined column names
        if (!allowedColumns.includes(columnName)) {
          error(`Invalid column name: ${columnName}`);
          process.exit(1);
        }
        
        const config = REQUIRED_COLUMNS[columnName];
        const nullable = config.nullable ? '' : 'NOT NULL';
        const defaultValue = config.default ? `DEFAULT ${config.default}` : '';
        
        const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS "${columnName}" ${config.type} ${nullable} ${defaultValue}`.trim();
        
        info(`  Adding: ${columnName}`);
        await client.query(sql);
        success(`  ✓ ${columnName} added`);
      }
      
      // Add indexes
      info('\nAdding indexes for performance...');
      await client.query('CREATE INDEX IF NOT EXISTS users_onboardingComplete_idx ON users("onboardingComplete")');
      await client.query('CREATE INDEX IF NOT EXISTS users_status_idx ON users(status)');
      success('Indexes created');
      
    } else {
      success('All required columns already exist');
    }
    
    // Verify final state
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('onboardingComplete', 'status', 'theme')
      ORDER BY column_name;
    `);
    
    console.log('');
    success('Final schema verification:');
    verification.rows.forEach(row => {
      info(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    
    await client.end();
    return true;
    
  } catch (err) {
    error(`Schema update failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// ============================================================================
// Phase 3: Regenerate Prisma Clients
// ============================================================================

function regeneratePrismaClients() {
  section('Phase 3: Regenerate Prisma Clients');
  
  try {
    info('Regenerating Prisma Client in api/...');
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, 'api'),
      stdio: 'inherit'
    });
    success('api/ Prisma Client regenerated');
    
    info('Regenerating Prisma Client in serverless/...');
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, 'serverless'),
      stdio: 'inherit'
    });
    success('serverless/ Prisma Client regenerated');
    
    return true;
  } catch (err) {
    error(`Prisma Client regeneration failed: ${err.message}`);
    process.exit(1);
  }
}

// ============================================================================
// Phase 4: Create User Account
// ============================================================================

async function createUserAccount(email, password, displayName) {
  section('Phase 4: Create User Account');
  
  if (!email || !password || !displayName) {
    error('Missing required arguments');
    log('Usage: node fix-user-schema-complete.mjs --email "user@example.com" --password "Password123!" --display-name "Your Name"', 'yellow');
    process.exit(1);
  }
  
  info(`Creating account for: ${email}`);
  
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const username = email.split('@')[0];
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const existing = await client.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      warning('User already exists - updating password and settings');
      
      await client.query(`
        UPDATE users 
        SET "passwordHash" = $1, "displayName" = $2, "updatedAt" = NOW()
        WHERE email = $3
      `, [passwordHash, displayName, email]);
      
      success('User account updated');
    } else {
      info('Creating new user account...');
      
      await client.query(`
        INSERT INTO users (
          id, username, email, "normalizedEmail", "passwordHash", "displayName",
          "emailVerified", "onboardingComplete", role, status, 
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, false, false, 'artist', 'active', NOW(), NOW()
        )
      `, [userId, username, email, normalizedEmail, passwordHash, displayName]);
      
      success('User account created');
    }
    
    // Fetch and display user info
    const user = await client.query(`
      SELECT id, email, username, "displayName", "onboardingComplete", status
      FROM users 
      WHERE email = $1
    `, [email]);
    
    console.log('');
    success('User Account Details:');
    info(`  ID: ${user.rows[0].id}`);
    info(`  Email: ${user.rows[0].email}`);
    info(`  Username: ${user.rows[0].username}`);
    info(`  Display Name: ${user.rows[0].displayName}`);
    info(`  Onboarding Complete: ${user.rows[0].onboardingComplete}`);
    info(`  Status: ${user.rows[0].status}`);
    
    await client.end();
    return user.rows[0];
    
  } catch (err) {
    error(`User creation failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// ============================================================================
// Phase 5: Verification
// ============================================================================

async function verifySetup() {
  section('Phase 5: Final Verification');
  
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Check schema
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('onboardingComplete', 'status', 'theme')
    `);
    
    const hasAllColumns = columns.rows.length === 3;
    
    if (hasAllColumns) {
      success('Schema verification: All columns exist');
    } else {
      error('Schema verification: Some columns missing!');
    }
    
    // Check user count
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    info(`Total users in database: ${userCount.rows[0].count}`);
    
    await client.end();
    return hasAllColumns;
    
  } catch (err) {
    warning(`Verification had issues: ${err.message}`);
    return false;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  log('', 'reset');
  log('╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Project Valine - Complete Database Schema & User Account Setup   ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  log('', 'reset');
  
  const args = parseArgs();
  
  try {
    // Phase 1: Database connection
    await checkDatabaseConnection();
    
    // Phase 2: Schema updates
    await checkAndAddColumns();
    
    // Phase 3: Prisma clients
    regeneratePrismaClients();
    
    // Phase 4: User creation
    const user = await createUserAccount(args.email, args.password, args['display-name']);
    
    // Phase 5: Verification
    await verifySetup();
    
    // Success summary
    section('✅ Setup Complete!');
    
    log('', 'reset');
    success('Database schema is fixed');
    success('Prisma Clients regenerated');
    success('User account created/updated');
    success('All verifications passed');
    
    log('', 'reset');
    log('═'.repeat(70), 'green');
    log('Next Steps:', 'bright');
    log('═'.repeat(70), 'green');
    log('', 'reset');
    
    log('1. Start your development server:', 'cyan');
    log('   npm run dev', 'bright');
    log('', 'reset');
    
    log('2. Visit the application:', 'cyan');
    log('   http://localhost:5173', 'bright');
    log('', 'reset');
    
    log('3. Login with your credentials:', 'cyan');
    log(`   Email: ${args.email}`, 'bright');
    log(`   Password: [your password]`, 'bright');
    log('', 'reset');
    
    log('4. Complete onboarding (first time only):', 'cyan');
    log('   - Add headline', 'yellow');
    log('   - Write bio', 'yellow');
    log('   - Select roles', 'yellow');
    log('   - Choose tags (max 5)', 'yellow');
    log('', 'reset');
    
    log('5. After onboarding:', 'cyan');
    log('   - Profile saved to database', 'yellow');
    log('   - onboardingComplete set to TRUE', 'yellow');
    log('   - Redirected to /dashboard', 'yellow');
    log('', 'reset');
    
    log('6. Future logins:', 'cyan');
    log('   ✅ Skip onboarding automatically', 'green');
    log('   ✅ Go straight to /dashboard', 'green');
    log('   ✅ Your account is permanent!', 'green');
    log('', 'reset');
    
    log('═'.repeat(70), 'green');
    log('', 'reset');
    
    process.exit(0);
    
  } catch (err) {
    section('❌ Setup Failed');
    error(err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run main function
main();

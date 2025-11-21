#!/usr/bin/env node
/**
 * Admin User Upsert Script
 * 
 * Safely creates or updates user accounts for owner-only mode
 * 
 * Usage (RECOMMENDED - uses serverless dependencies):
 *   DATABASE_URL=postgresql://... node scripts/admin-upsert-user.mjs \
 *     --email friend@example.com \
 *     --password SecurePassword123! \
 *     --display-name "Friend Name" \
 *     [--dry-run] [--skip-if-exists]
 * 
 * Arguments:
 *   --email           User email address (required)
 *   --password        Password (min 8 chars, must contain uppercase, lowercase, numbers)
 *   --display-name    Display name (optional, defaults to username)
 *   --dry-run         Test mode - no database changes
 *   --skip-if-exists  Skip operation if user already exists
 * 
 * Environment:
 *   DATABASE_URL           PostgreSQL connection string (required)
 *   NODE_ENV               Environment (production requires confirmation)
 *   ALLOWED_USER_EMAILS    Comma-separated allowlist (optional)
 * 
 * Security:
 * - Requires DATABASE_URL environment variable
 * - Hashes password with bcrypt (cost factor 10)
 * - Creates both User and Profile records
 * - Production mode requires confirmation
 * 
 * Note: This script imports dependencies from serverless/node_modules to avoid
 * requiring duplicate installations at the repository root.
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamically import dependencies with error handling
let PrismaClient, bcrypt;
try {
  // Try importing from serverless node_modules first
  const serverlessNodeModules = join(__dirname, '..', 'serverless', 'node_modules');
  const prismaPath = join(serverlessNodeModules, '@prisma/client', 'index.js');
  const bcryptPath = join(serverlessNodeModules, 'bcryptjs', 'index.js');
  
  if (existsSync(prismaPath) && existsSync(bcryptPath)) {
    // Convert paths to file URLs for Windows compatibility
    const prismaUrl = pathToFileURL(prismaPath).href;
    const bcryptUrl = pathToFileURL(bcryptPath).href;
    
    const prismaModule = await import(prismaUrl);
    PrismaClient = prismaModule.PrismaClient;
    const bcryptModule = await import(bcryptUrl);
    bcrypt = bcryptModule.default;
  } else {
    // Fall back to trying root-level dependencies
    const prismaModule = await import('@prisma/client');
    PrismaClient = prismaModule.PrismaClient;
    const bcryptModule = await import('bcryptjs');
    bcrypt = bcryptModule.default;
  }
} catch (error) {
  console.error('[ERROR] Missing required dependencies.');
  console.error('');
  console.error('Please install dependencies in the serverless directory:');
  console.error('  cd serverless');
  console.error('  npm install');
  console.error('');
  console.error('Or install dependencies at the repository root:');
  console.error('  npm install @prisma/client bcryptjs');
  console.error('');
  console.error('Error details:', error.message);
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') {
      config.email = args[++i];
    } else if (args[i] === '--password') {
      config.password = args[++i];
    } else if (args[i] === '--display-name') {
      config.displayName = args[++i];
    } else if (args[i] === '--dry-run') {
      config.dryRun = true;
    } else if (args[i] === '--skip-if-exists') {
      config.skipIfExists = true;
    }
  }
  
  return config;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate password strength
 * Requires: min 8 chars, uppercase, lowercase, numbers
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, reason: 'Password must be less than 128 characters' };
  }
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasUpper || !hasLower || !hasNumber) {
    return { 
      valid: false, 
      reason: 'Password must contain uppercase, lowercase, and numbers' 
    };
  }
  
  return { valid: true };
}

/**
 * Generate username from email
 * Converts local part to lowercase and replaces non-alphanumeric with underscore
 */
function generateUsername(email) {
  const localPart = email.split('@')[0];
  return localPart.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Generate vanity URL from username
 */
function generateVanityUrl(username) {
  // Start with username, ensure it's URL-safe
  let vanity = username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return vanity;
}

/**
 * Confirm action in production
 */
async function confirmAction(message) {
  if (process.env.NODE_ENV !== 'production') {
    return true; // Auto-confirm in non-production
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (type 'yes' to confirm): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main upsert logic
 */
async function upsertUser(config) {
  const { email, password, displayName, dryRun, skipIfExists } = config;
  
  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Validation
  if (!email || !validateEmail(email)) {
    throw new Error('Invalid email address');
  }
  
  if (!password) {
    throw new Error('Password is required');
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.reason);
  }
  
  // Normalize email for lookup
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      profile: {
        select: {
          id: true,
          vanityUrl: true
        }
      }
    }
  });
  
  if (existingUser && skipIfExists) {
    console.log(`ℹ️  User ${email} already exists - skipping (--skip-if-exists)`);
    return;
  }
  
  // Generate values
  const username = generateUsername(email);
  const passwordHash = await bcrypt.hash(password, 10);
  const finalDisplayName = displayName || username;
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('USER UPSERT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Email:        ${email}`);
  console.log(`Username:     ${username}`);
  console.log(`Display Name: ${finalDisplayName}`);
  console.log(`Action:       ${existingUser ? 'UPDATE' : 'CREATE'}`);
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`Dry Run:      ${dryRun ? 'YES' : 'NO'}`);
  console.log('='.repeat(60) + '\n');
  
  if (dryRun) {
    console.log('🏃 Dry run mode - no changes will be made');
    return;
  }
  
  // Confirm in production
  const confirmed = await confirmAction(
    `Create/update user ${email} in ${process.env.NODE_ENV || 'development'}?`
  );
  
  if (!confirmed) {
    console.log('❌ Operation cancelled');
    return;
  }
  
  // Execute upsert
  try {
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        passwordHash,
        displayName: finalDisplayName,
      },
      create: {
        email: normalizedEmail,
        normalizedEmail: normalizedEmail,
        username,
        passwordHash,
        displayName: finalDisplayName,
        emailVerified: false,
        onboardingComplete: false,
        role: 'artist',
        status: 'active',
      },
    });
    
    // Create/update profile
    const vanityUrl = generateVanityUrl(username);
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        vanityUrl,
        headline: '',
        bio: '',
        roles: [],
        tags: [],
      },
    });
    
    console.log('✅ User created/updated successfully');
    console.log(`User ID:      ${user.id}`);
    console.log(`Username:     ${user.username}`);
    console.log(`Profile ID:   ${profile.id}`);
    console.log(`Vanity URL:   ${profile.vanityUrl}`);
    
    // Optionally add to ALLOWED_USER_EMAILS
    const currentAllowlist = process.env.ALLOWED_USER_EMAILS || '';
    const allowedEmails = currentAllowlist.split(',').map(e => e.trim()).filter(Boolean);
    
    if (!allowedEmails.includes(normalizedEmail)) {
      console.log('\n⚠️  Remember to add this email to ALLOWED_USER_EMAILS:');
      console.log(`ALLOWED_USER_EMAILS="${[...allowedEmails, normalizedEmail].join(',')}"`);
    }
    
  } catch (error) {
    console.error('❌ Error creating/updating user:', error.message);
    if (error.code === 'P2002') {
      console.error('[HINT] Unique constraint violation - username or email may already exist');
    }
    throw error;
  }
}

/**
 * Entry point
 */
async function main() {
  try {
    const config = parseArgs();
    
    // Validate required arguments
    if (!config.email || !config.password) {
      console.error('Usage: node scripts/admin-upsert-user.mjs \\');
      console.error('  --email friend@example.com \\');
      console.error('  --password SecurePassword123! \\');
      console.error('  --display-name "Friend Name" \\');
      console.error('  [--dry-run] [--skip-if-exists]');
      console.error('');
      console.error('Required arguments:');
      console.error('  --email        User email address');
      console.error('  --password     Password (min 8 chars, uppercase, lowercase, numbers)');
      console.error('');
      console.error('Optional arguments:');
      console.error('  --display-name Display name (defaults to username from email)');
      console.error('  --dry-run      Test mode - no database changes');
      console.error('  --skip-if-exists  Skip if user already exists');
      console.error('');
      console.error('Environment variables:');
      console.error('  DATABASE_URL   PostgreSQL connection string (required)');
      process.exit(1);
    }
    
    await upsertUser(config);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

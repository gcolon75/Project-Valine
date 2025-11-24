#!/usr/bin/env node
/**
 * Production Account Provisioning Script
 * 
 * Creates production user accounts with allowlist validation.
 * This is a wrapper around admin-upsert-user.mjs with additional
 * allowlist validation and friendlier output.
 * 
 * Usage:
 *   export DATABASE_URL="postgresql://..."
 *   export ALLOWED_USER_EMAILS="email1@example.com,email2@example.com"
 *   node scripts/provision-production-accounts.mjs --email=EMAIL --password=PASS --name=NAME
 * 
 * Arguments:
 *   --email       User email address (must be in allowlist)
 *   --password    Password (min 8 chars, uppercase, lowercase, numbers)
 *   --name        Display name
 *   --dry-run     Test mode - validate inputs but don't create account
 * 
 * Security:
 * - Validates email against ALLOWED_USER_EMAILS
 * - Validates password strength
 * - Hashes password with bcrypt
 * - Creates User and Profile records
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      config.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      config.password = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      config.displayName = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    }
  }
  
  return config;
}

// Dynamically import dependencies with error handling
async function loadDependencies() {
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
      // Fall back to root-level dependencies
      const prismaModule = await import('@prisma/client');
      PrismaClient = prismaModule.PrismaClient;
      const bcryptModule = await import('bcryptjs');
      bcrypt = bcryptModule.default;
    }
    
    return { PrismaClient, bcrypt };
  } catch (error) {
    console.error('❌ Missing required dependencies.');
    console.error('');
    console.error('Please install dependencies in the serverless directory:');
    console.error('  cd serverless');
    console.error('  npm install');
    console.error('');
    console.error('Or install dependencies at the repository root:');
    console.error('  npm install @prisma/client bcryptjs');
    console.error('');
    process.exit(1);
  }
}

// Validate email format
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate password strength
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

// Generate username from email
function generateUsername(email) {
  const localPart = email.split('@')[0];
  return localPart.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Main provisioning function
async function provisionAccount(config) {
  const { PrismaClient, bcrypt } = await loadDependencies();
  const prisma = new PrismaClient();
  
  try {
    const { email, password, displayName, dryRun } = config;
    
    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      console.error('');
      console.error('Example:');
      console.error('  export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
      process.exit(1);
    }
    
    // Parse allowlist
    const allowlistRaw = process.env.ALLOWED_USER_EMAILS || '';
    const ALLOWED_EMAILS = allowlistRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      console.error(`❌ Invalid email format: "${email}"`);
      process.exit(1);
    }
    
    // Validate against allowlist
    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(normalizedEmail)) {
      console.error(`❌ Email ${email} is not in allowlist.`);
      console.error('');
      console.error('Allowed emails:');
      ALLOWED_EMAILS.forEach(e => console.error(`  - ${e}`));
      console.error('');
      console.error('Add to allowlist:');
      console.error(`  export ALLOWED_USER_EMAILS="${[...ALLOWED_EMAILS, normalizedEmail].join(',')}"`);
      process.exit(1);
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ ${passwordValidation.reason}`);
      process.exit(1);
    }
    
    // Validate display name
    if (!displayName) {
      console.error('❌ Display name is required (--name=NAME)');
      process.exit(1);
    }
    
    // Generate values
    const username = generateUsername(email);
    const vanityUrl = username;
    
    // Summary
    console.log('');
    console.log('═'.repeat(60));
    console.log('  PRODUCTION ACCOUNT PROVISIONING');
    console.log('═'.repeat(60));
    console.log(`  Email:        ${normalizedEmail}`);
    console.log(`  Username:     ${username}`);
    console.log(`  Display Name: ${displayName}`);
    console.log(`  Vanity URL:   /${vanityUrl}`);
    console.log(`  Dry Run:      ${dryRun ? 'YES' : 'NO'}`);
    console.log('═'.repeat(60));
    console.log('');
    
    if (dryRun) {
      console.log('🏃 Dry run mode - validation passed, no changes made');
      return;
    }
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ 
      where: { email: normalizedEmail },
      select: { id: true, email: true, username: true }
    });
    
    if (existing) {
      console.log(`✅ User ${normalizedEmail} already exists (ID: ${existing.id})`);
      console.log('');
      console.log('To update password, use:');
      console.log(`  node scripts/admin-set-password.mjs "${normalizedEmail}" "NewPassword123!"`);
      return;
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    console.log('👤 Creating user...');
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail: normalizedEmail,
        username,
        passwordHash,
        displayName,
        emailVerified: false,
        onboardingComplete: false,
        role: 'artist',
        status: 'active',
      },
    });
    console.log(`✅ User created (ID: ${user.id})`);
    
    // Create profile
    console.log('📄 Creating profile...');
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        vanityUrl,
        headline: '',
        bio: '',
        roles: [],
        tags: [],
      },
    });
    console.log(`✅ Profile created (ID: ${profile.id})`);
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('  ✅ ACCOUNT PROVISIONED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log(`  1. User can login at your frontend URL`);
    console.log(`  2. Email: ${normalizedEmail}`);
    console.log(`  3. Password: [as provided]`);
    console.log(`  4. Profile URL: /profile/${vanityUrl}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error provisioning account:', error.message);
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('email') ? 'email' : 
                    error.meta?.target?.includes('username') ? 'username' : 'field';
      console.error(`[HINT] Unique constraint violation on ${field} - this value already exists in database`);
      console.error('[TIP] If updating an existing user, use scripts/admin-set-password.mjs instead');
    } else if (error.code === 'P1001') {
      console.error('[HINT] Cannot reach database server');
      console.error('[TROUBLESHOOTING]');
      console.error('  1. Verify DATABASE_URL is correct');
      console.error('  2. Check if database server is running');
      console.error('  3. For RDS: Ensure security group allows your IP');
      console.error('  4. For VPN users: Verify VPN connection is active');
      console.error('  5. Test connection: psql "$DATABASE_URL" -c "SELECT 1"');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main entry point
async function main() {
  const config = parseArgs();
  
  // Show usage if missing required args
  if (!config.email || !config.password || !config.displayName) {
    console.log('');
    console.log('Production Account Provisioning');
    console.log('================================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/provision-production-accounts.mjs \\');
    console.log('    --email=EMAIL \\');
    console.log('    --password=PASSWORD \\');
    console.log('    --name="Display Name" \\');
    console.log('    [--dry-run]');
    console.log('');
    console.log('Required arguments:');
    console.log('  --email       User email address (must be in allowlist)');
    console.log('  --password    Password (min 8 chars, uppercase, lowercase, numbers)');
    console.log('  --name        Display name');
    console.log('');
    console.log('Optional arguments:');
    console.log('  --dry-run     Validate inputs but don\'t create account');
    console.log('');
    console.log('Environment variables:');
    console.log('  DATABASE_URL          PostgreSQL connection string (required)');
    console.log('  ALLOWED_USER_EMAILS   Comma-separated allowlist (optional)');
    console.log('');
    console.log('Example:');
    console.log('  export DATABASE_URL="postgresql://user:pass@host:5432/db"');
    console.log('  export ALLOWED_USER_EMAILS="ghawk075@gmail.com"');
    console.log('  node scripts/provision-production-accounts.mjs \\');
    console.log('    --email=ghawk075@gmail.com \\');
    console.log('    --password=SecurePass123! \\');
    console.log('    --name="Gabriel Colon"');
    console.log('');
    process.exit(1);
  }
  
  await provisionAccount(config);
}

main().catch(error => {
  console.error('');
  console.error('Fatal error:', error.message);
  process.exit(1);
});

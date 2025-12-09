#!/usr/bin/env node
/**
 * Upsert User and Profile Script
 * 
 * Creates or updates a user and their associated profile in the database.
 * Generates UUIDs, hashes passwords with bcrypt (12 rounds), and sets all required fields.
 * 
 * Usage:
 *   node scripts/upsert-user-profile.mjs \
 *     --email ghawk75@gmail.com \
 *     --password "SecurePass123!" \
 *     --display-name "Gabriel Hawk" \
 *     --headline "Voice Actor" \
 *     --bio "Professional voice actor"
 * 
 * Arguments:
 *   --email           User email address (required)
 *   --password        Plain text password (required)
 *   --username        Username (optional, derived from email if not provided)
 *   --display-name    Display name (optional, defaults to username)
 *   --vanity-url      Vanity URL (optional, defaults to username)
 *   --headline        Profile headline (optional)
 *   --bio             Profile bio (optional)
 * 
 * Environment:
 *   DATABASE_URL      PostgreSQL connection string (optional, uses default if not set)
 * 
 * Default DATABASE_URL:
 *   postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default DATABASE_URL (no spaces)
// WARNING: This contains credentials for a development database.
// In production, always use $env:DATABASE_URL instead of this default.
const DEFAULT_DATABASE_URL = 'postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require';

// Dynamically import dependencies
let PrismaClient, bcrypt;
try {
  // Try importing from serverless node_modules first
  const serverlessNodeModules = join(__dirname, '..', 'serverless', 'node_modules');
  const prismaPath = join(serverlessNodeModules, '@prisma/client', 'index.js');
  const bcryptPath = join(serverlessNodeModules, 'bcryptjs', 'index.js');
  
  if (existsSync(prismaPath) && existsSync(bcryptPath)) {
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

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    headline: '',
    bio: ''
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') {
      config.email = args[++i];
    } else if (args[i] === '--password') {
      config.password = args[++i];
    } else if (args[i] === '--username') {
      config.username = args[++i];
    } else if (args[i] === '--display-name') {
      config.displayName = args[++i];
    } else if (args[i] === '--vanity-url') {
      config.vanityUrl = args[++i];
    } else if (args[i] === '--headline') {
      config.headline = args[++i];
    } else if (args[i] === '--bio') {
      config.bio = args[++i];
    }
  }
  
  return config;
}

/**
 * Generate username from email
 */
function generateUsername(email) {
  const localPart = email.split('@')[0];
  return localPart.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Generate vanity URL from username
 */
function generateVanityUrl(username) {
  return username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

/**
 * Main upsert logic
 */
async function upsertUserProfile(config) {
  const { email, password, headline, bio } = config;
  
  // Determine DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  if (!process.env.DATABASE_URL) {
    console.log('[INFO] Using default DATABASE_URL');
  }
  
  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = databaseUrl;
  
  const prisma = new PrismaClient();
  
  try {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Generate or use provided values
    const username = config.username || generateUsername(normalizedEmail);
    const displayName = config.displayName || username;
    const vanityUrl = config.vanityUrl || generateVanityUrl(username);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('USER/PROFILE UPSERT');
    console.log('='.repeat(60));
    console.log(`Email:        ${normalizedEmail}`);
    console.log(`Username:     ${username}`);
    console.log(`Display Name: ${displayName}`);
    console.log(`Vanity URL:   ${vanityUrl}`);
    console.log(`Headline:     ${headline}`);
    console.log(`Bio:          ${bio}`);
    console.log('='.repeat(60));
    console.log('');
    
    // Generate UUIDs
    const userId = randomUUID();
    const profileId = randomUUID();
    
    console.log('[1/4] Generating UUIDs and hashing password...');
    console.log(`  User ID:     ${userId}`);
    console.log(`  Profile ID:  ${profileId}`);
    
    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('  Password hashed successfully');
    console.log('');
    
    console.log('[2/4] Executing database upsert...');
    
    // Get current timestamp
    const now = new Date();
    
    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        passwordHash,
        displayName,
        bio,
        emailVerified: true,
        emailVerifiedAt: now,
        onboardingComplete: true,
        profileComplete: true,
        updatedAt: now,
      },
      create: {
        id: userId,
        email: normalizedEmail,
        normalizedEmail: normalizedEmail,
        username,
        displayName,
        bio,
        passwordHash,
        role: 'artist',
        status: 'active',
        emailVerified: true,
        emailVerifiedAt: now,
        onboardingComplete: true,
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    
    console.log('  User upserted successfully');
    
    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        vanityUrl,
        headline,
        bio,
        updatedAt: now,
      },
      create: {
        id: profileId,
        userId: user.id,
        vanityUrl,
        headline,
        bio,
        roles: [],
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    });
    
    console.log('  Profile upserted successfully');
    console.log('');
    
    console.log('[3/4] Upsert completed successfully');
    console.log('');
    
    // Verification query
    console.log('[4/4] Verification Results:');
    const verification = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
      },
    });
    
    if (verification) {
      console.log('');
      console.log('User Record:');
      console.log(`  ID:                  ${verification.id}`);
      console.log(`  Email:               ${verification.email}`);
      console.log(`  Username:            ${verification.username}`);
      console.log(`  Display Name:        ${verification.displayName}`);
      console.log(`  Email Verified:      ${verification.emailVerified}`);
      console.log(`  Onboarding Complete: ${verification.onboardingComplete}`);
      console.log(`  Profile Complete:    ${verification.profileComplete}`);
      console.log(`  Created At:          ${verification.createdAt}`);
      console.log(`  Updated At:          ${verification.updatedAt}`);
      
      if (verification.profile) {
        console.log('');
        console.log('Profile Record:');
        console.log(`  ID:          ${verification.profile.id}`);
        console.log(`  User ID:     ${verification.profile.userId}`);
        console.log(`  Vanity URL:  ${verification.profile.vanityUrl}`);
        console.log(`  Headline:    ${verification.profile.headline}`);
        console.log(`  Bio:         ${verification.profile.bio}`);
        console.log(`  Created At:  ${verification.profile.createdAt}`);
        console.log(`  Updated At:  ${verification.profile.updatedAt}`);
      }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! User and profile created/updated');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Test login with: ${normalizedEmail}`);
    console.log(`  2. Verify profile at: /profile/${vanityUrl}`);
    console.log('');
    
  } catch (error) {
    console.error('[ERROR] Upsert failed:', error.message);
    if (error.code === 'P2002') {
      console.error('[HINT] Unique constraint violation - username or vanityUrl may already exist');
    } else if (error.code === 'P1001') {
      console.error('[HINT] Cannot reach database. Check DATABASE_URL and network connectivity');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
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
      console.error('Usage: node scripts/upsert-user-profile.mjs \\');
      console.error('  --email ghawk75@gmail.com \\');
      console.error('  --password "SecurePass123!" \\');
      console.error('  --display-name "Gabriel Hawk" \\');
      console.error('  --headline "Voice Actor" \\');
      console.error('  --bio "Professional voice actor"');
      console.error('');
      console.error('Required arguments:');
      console.error('  --email        User email address');
      console.error('  --password     Plain text password');
      console.error('');
      console.error('Optional arguments:');
      console.error('  --username     Username (defaults to email local part)');
      console.error('  --display-name Display name (defaults to username)');
      console.error('  --vanity-url   Vanity URL (defaults to username)');
      console.error('  --headline     Profile headline');
      console.error('  --bio          Profile bio');
      console.error('');
      console.error('Environment variables:');
      console.error('  DATABASE_URL   PostgreSQL connection string (optional, uses default)');
      process.exit(1);
    }
    
    await upsertUserProfile(config);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

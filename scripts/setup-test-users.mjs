#!/usr/bin/env node
/**
 * Setup Test Users Script
 * 
 * Creates test user accounts for development and testing.
 * 
 * Usage:
 *   export DATABASE_URL="postgresql://..."
 *   node scripts/setup-test-users.mjs
 * 
 * Test Users Created:
 *   - ghawk075@gmail.com (Gabriel Colon) - Password: Test123!
 *   - valinejustin@gmail.com (Justin Valine) - Password: Test123!
 * 
 * Both accounts are created with:
 *   - onboardingComplete = true (can log in directly to dashboard)
 *   - emailVerified = true
 *   - Public profile visibility
 *   - Associated Profile record
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test users to create
const TEST_USERS = [
  {
    email: 'ghawk075@gmail.com',
    username: 'ghawk75',
    displayName: 'Gabriel Colon',
    password: 'Test123!',
    headline: 'Voice & Stage Actor',
    bio: 'Passionate about voice acting and theater. Always looking for new opportunities to collaborate.',
  },
  {
    email: 'valinejustin@gmail.com',
    username: 'valinejustin',
    displayName: 'Justin Valine',
    password: 'Test123!',
    headline: 'Voice Actor & Theater Artist',
    bio: 'Professional voice actor with experience in animation, video games, and audiobooks.',
  },
];

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

// Main setup function
async function setupTestUsers() {
  const { PrismaClient, bcrypt } = await loadDependencies();
  const prisma = new PrismaClient();
  
  try {
    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      console.error('');
      console.error('Example:');
      console.error('  export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
      process.exit(1);
    }
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('  TEST USERS SETUP');
    console.log('═'.repeat(60));
    console.log('');
    
    for (const userData of TEST_USERS) {
      const normalizedEmail = userData.email.toLowerCase().trim();
      
      console.log(`📧 Processing: ${normalizedEmail}`);
      
      // Check if user already exists
      const existing = await prisma.user.findUnique({ 
        where: { email: normalizedEmail },
        select: { id: true, email: true, username: true, onboardingComplete: true }
      });
      
      if (existing) {
        console.log(`   ✓ User already exists (ID: ${existing.id})`);
        
        // Update to ensure onboardingComplete is true
        if (!existing.onboardingComplete) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { 
              onboardingComplete: true,
              emailVerified: true,
            }
          });
          console.log(`   ✓ Updated onboardingComplete = true`);
        }
        
        // Update password
        const passwordHash = await bcrypt.hash(userData.password, 10);
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash }
        });
        console.log(`   ✓ Password updated to: ${userData.password}`);
        
        continue;
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          normalizedEmail: normalizedEmail,
          username: userData.username,
          passwordHash,
          displayName: userData.displayName,
          bio: userData.bio,
          emailVerified: true,
          onboardingComplete: true,
          role: 'artist',
          status: 'active',
        },
      });
      console.log(`   ✓ User created (ID: ${user.id})`);
      
      // Check if profile exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: user.id }
      });
      
      if (!existingProfile) {
        // Create profile
        const profile = await prisma.profile.create({
          data: {
            userId: user.id,
            vanityUrl: userData.username,
            headline: userData.headline,
            bio: userData.bio,
            roles: ['Actor', 'Voice Actor'],
            tags: ['voice acting', 'theater', 'animation'],
            privacy: { visibility: 'public' },
          },
        });
        console.log(`   ✓ Profile created (ID: ${profile.id})`);
      } else {
        console.log(`   ✓ Profile already exists`);
      }
      
      console.log('');
    }
    
    console.log('═'.repeat(60));
    console.log('  ✅ TEST USERS SETUP COMPLETE');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Test Accounts:');
    console.log('');
    for (const userData of TEST_USERS) {
      console.log(`  📧 Email:    ${userData.email}`);
      console.log(`  🔑 Password: ${userData.password}`);
      console.log(`  👤 Username: @${userData.username}`);
      console.log('');
    }
    console.log('Both accounts have onboardingComplete = true');
    console.log('Login will go directly to Dashboard (no onboarding)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error setting up test users:', error.message);
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('email') ? 'email' : 
                    error.meta?.target?.includes('username') ? 'username' : 'field';
      console.error(`[HINT] Unique constraint violation on ${field}`);
    } else if (error.code === 'P1001') {
      console.error('[HINT] Cannot reach database server');
      console.error('[TROUBLESHOOTING]');
      console.error('  1. Verify DATABASE_URL is correct');
      console.error('  2. Check if database server is running');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupTestUsers().catch(error => {
  console.error('');
  console.error('Fatal error:', error.message);
  process.exit(1);
});

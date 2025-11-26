#!/usr/bin/env node

/**
 * Verify user profile data persistence
 * Checks that test users have onboardingComplete = true and profile data saved
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

// Test user emails to verify
const TEST_EMAILS = [
  'ghawk075@gmail.com',
  'valinejustin@gmail.com'
];

async function verifyProfiles() {
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
    
    console.log('📋 Verifying Test User Profiles:');
    console.log('=================================\n');
    
    let allPassed = true;
    
    for (const email of TEST_EMAILS) {
      console.log(`\n👤 Checking: ${email}`);
      console.log('-'.repeat(40));
      
      // Get user data
      const userResult = await client.query(`
        SELECT id, email, username, "displayName", "onboardingComplete", "profileComplete",
               headline, bio, roles, tags, avatar, "createdAt"
        FROM users
        WHERE email = $1;
      `, [email]);
      
      if (userResult.rows.length === 0) {
        console.log('  ❌ User not found in database!');
        allPassed = false;
        continue;
      }
      
      const user = userResult.rows[0];
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.username || '(not set)'}`);
      console.log(`  Display Name: ${user.displayName || '(not set)'}`);
      console.log(`  Onboarding Complete: ${user.onboardingComplete ? '✅ Yes' : '❌ No'}`);
      console.log(`  Profile Complete: ${user.profileComplete ? '✅ Yes' : '⚠️ No'}`);
      console.log(`  Headline: ${user.headline || '(not set)'}`);
      console.log(`  Bio: ${user.bio ? user.bio.substring(0, 50) + '...' : '(not set)'}`);
      console.log(`  Roles: ${user.roles && user.roles.length > 0 ? user.roles.join(', ') : '(none)'}`);
      console.log(`  Tags: ${user.tags && user.tags.length > 0 ? user.tags.join(', ') : '(none)'}`);
      console.log(`  Avatar: ${user.avatar ? '✅ Set' : '⚠️ Not set'}`);
      console.log(`  Created: ${user.createdAt}`);
      
      // Check for associated profile record
      const profileResult = await client.query(`
        SELECT id, "userId", "vanityUrl", headline, bio, roles, tags, "createdAt"
        FROM profiles
        WHERE "userId" = $1;
      `, [user.id]);
      
      if (profileResult.rows.length === 0) {
        console.log('\n  ⚠️ No Profile record found (may be stored on User)');
      } else {
        const profile = profileResult.rows[0];
        console.log('\n  📄 Profile Record:');
        console.log(`    Profile ID: ${profile.id}`);
        console.log(`    Vanity URL: ${profile.vanityUrl || '(not set)'}`);
        console.log(`    Headline: ${profile.headline || '(not set)'}`);
        console.log(`    Bio: ${profile.bio ? profile.bio.substring(0, 50) + '...' : '(not set)'}`);
        console.log(`    Roles: ${profile.roles && profile.roles.length > 0 ? profile.roles.join(', ') : '(none)'}`);
        console.log(`    Tags: ${profile.tags && profile.tags.length > 0 ? profile.tags.join(', ') : '(none)'}`);
      }
      
      // Check if onboarding is complete
      if (!user.onboardingComplete) {
        console.log('\n  ⚠️ WARNING: onboardingComplete is false - user will be forced through onboarding!');
        allPassed = false;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('✅ All test users verified successfully!');
    } else {
      console.log('⚠️ Some issues found - see details above');
    }
    console.log('');
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyProfiles();

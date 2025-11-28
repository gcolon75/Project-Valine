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

// Test user emails to verify
const TEST_EMAILS = [
  'ghawk075@gmail.com',
  'valinejustin@gmail.com'
];

async function verifyProfiles() {
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
    
    console.log('📋 Verifying Test User Profiles:');
    console.log('=================================\n');
    
    let allPassed = true;
    
    for (const email of TEST_EMAILS) {
      console.log(`\n👤 Checking: ${email}`);
      console.log('-'.repeat(40));
      
      // Get user data (only columns that exist in users table)
      const userResult = await client.query(`
        SELECT id, email, username, "displayName", "onboardingComplete", "profileComplete",
               bio, avatar, "createdAt"
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
      console.log(`  Bio (User): ${user.bio ? user.bio.substring(0, 50) + '...' : '(not set)'}`);
      console.log(`  Avatar: ${user.avatar ? '✅ Set' : '⚠️ Not set'}`);
      console.log(`  Created: ${user.createdAt}`);
      
      // Check for associated profile record (headline, roles, tags are stored in Profile table)
      const profileResult = await client.query(`
        SELECT id, "userId", "vanityUrl", headline, bio, roles, tags, "createdAt"
        FROM profiles
        WHERE "userId" = $1;
      `, [user.id]);
      
      if (profileResult.rows.length === 0) {
        console.log('\n  ⚠️ No Profile record found - onboarding data NOT persisted!');
        allPassed = false;
      } else {
        const profile = profileResult.rows[0];
        console.log('\n  📄 Profile Record (stores onboarding data):');
        console.log(`    Profile ID: ${profile.id}`);
        console.log(`    Vanity URL: ${profile.vanityUrl || '(not set)'}`);
        console.log(`    Headline: ${profile.headline || '(not set)'}`);
        console.log(`    Bio: ${profile.bio ? profile.bio.substring(0, 50) + '...' : '(not set)'}`);
        console.log(`    Roles: ${profile.roles && profile.roles.length > 0 ? profile.roles.join(', ') : '(none)'}`);
        console.log(`    Tags: ${profile.tags && profile.tags.length > 0 ? profile.tags.join(', ') : '(none)'}`);
        
        // Check if profile data has meaningful content
        const hasProfileData = profile.headline || profile.bio || 
          (profile.roles && profile.roles.length > 0) || 
          (profile.tags && profile.tags.length > 0);
        
        if (!hasProfileData) {
          console.log('\n  ⚠️ Profile record exists but has no data (headline, bio, roles, tags are all empty)');
        }
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

verifyProfiles();

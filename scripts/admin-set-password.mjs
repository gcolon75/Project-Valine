#!/usr/bin/env node
/**
 * Admin utility to set/reset user passwords via CLI
 * 
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/admin-set-password.mjs "email@example.com" "NewPassword123!"
 * 
 * Security:
 * - Requires DATABASE_URL environment variable
 * - Hashes password with bcrypt (cost factor 12)
 * - Updates passwordHash field in database
 * - Validates inputs before database operations
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (basic requirements)
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  return { valid: true, message: 'Password is valid' };
}

/**
 * Main execution function
 */
async function run() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length !== 2) {
      console.error('Usage: node scripts/admin-set-password.mjs "email@example.com" "NewPassword123!"');
      console.error('');
      console.error('Arguments:');
      console.error('  email     - User email address');
      console.error('  password  - New password (min 8 chars)');
      console.error('');
      console.error('Environment:');
      console.error('  DATABASE_URL - PostgreSQL connection string (required)');
      process.exit(1);
    }

    const [email, password] = args;

    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('[ERROR] DATABASE_URL environment variable is required');
      console.error('Example: DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require');
      process.exit(1);
    }

    // Validate email
    if (!isValidEmail(email)) {
      console.error(`[ERROR] Invalid email format: "${email}"`);
      process.exit(1);
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`[ERROR] ${passwordValidation.message}`);
      process.exit(1);
    }

    console.log('[admin-set-password] Starting password update...');
    console.log(`[admin-set-password] Email: ${email}`);

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, username: true }
    });

    if (!user) {
      console.error(`[ERROR] User not found: ${email}`);
      console.error('[HINT] Check that the email is correct and the user exists in the database');
      process.exit(1);
    }

    console.log(`[admin-set-password] Found user: ${user.username} (${user.email})`);
    console.log('[admin-set-password] Hashing password...');

    // Hash password with bcrypt (same cost factor as registration)
    const passwordHash = await bcrypt.hash(password, 12);

    console.log('[admin-set-password] Updating database...');

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    console.log('[admin-set-password] ✓ Password updated successfully');
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Test login with: ${user.email}`);
    console.log('  2. Verify authentication works in production');
    console.log('');

  } catch (error) {
    console.error('[admin-set-password] Failed:', error.message);
    if (error.code === 'P1001') {
      console.error('[HINT] Cannot reach database. Check DATABASE_URL and network connectivity');
    } else if (error.code === 'P2025') {
      console.error('[HINT] User not found or already deleted');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute and handle errors
run().catch(error => {
  console.error('[FATAL]', error);
  process.exit(1);
});

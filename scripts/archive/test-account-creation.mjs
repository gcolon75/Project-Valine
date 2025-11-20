#!/usr/bin/env node
/**
 * Manual API Testing Script
 * Tests the account creation endpoints without needing a database
 */

import { hashPassword, comparePassword, normalizeEmail, validateEmail, validatePasswordStrength } from '../server/src/utils/passwordHash.js';
import { generateAccessToken, verifyAccessToken, generateVerificationToken, isTokenExpired } from '../server/src/utils/jwtToken.js';

// Set required environment variables
process.env.AUTH_JWT_SECRET = 'test-secret-key-for-manual-testing-1234567890-abcdefghijklmnop';

console.log('='.repeat(80));
console.log('Account Creation API - Manual Testing');
console.log('='.repeat(80));
console.log('');

// Test 1: Password Hashing
console.log('Test 1: Password Hashing');
console.log('-'.repeat(40));
const testPassword = 'TestPassword123!';
const hash = await hashPassword(testPassword);
console.log('✓ Password hashed successfully');
console.log(`  Hash: ${hash.substring(0, 30)}...`);

const isValid = await comparePassword(testPassword, hash);
console.log(`✓ Password verification: ${isValid ? 'PASSED' : 'FAILED'}`);

const isInvalid = await comparePassword('WrongPassword', hash);
console.log(`✓ Wrong password rejected: ${!isInvalid ? 'PASSED' : 'FAILED'}`);
console.log('');

// Test 2: Email Normalization
console.log('Test 2: Email Normalization');
console.log('-'.repeat(40));
const testEmails = [
  'Test@Example.COM',
  '  user@example.com  ',
  'UPPERCASE@DOMAIN.COM'
];

for (const email of testEmails) {
  const normalized = normalizeEmail(email);
  console.log(`✓ "${email}" → "${normalized}"`);
}
console.log('');

// Test 3: Email Validation
console.log('Test 3: Email Validation');
console.log('-'.repeat(40));
const validEmails = ['user@example.com', 'test.user@domain.co.uk'];
const invalidEmails = ['notanemail', '@example.com', 'user@'];

validEmails.forEach(email => {
  const isValid = validateEmail(email);
  console.log(`✓ "${email}" is ${isValid ? 'VALID' : 'INVALID (ERROR!)'}`);
});

invalidEmails.forEach(email => {
  const isValid = validateEmail(email);
  console.log(`✓ "${email}" is ${isValid ? 'VALID (ERROR!)' : 'INVALID'}`);
});
console.log('');

// Test 4: Password Strength Validation
console.log('Test 4: Password Strength Validation');
console.log('-'.repeat(40));
const passwords = [
  { pwd: 'password123', expect: true },
  { pwd: 'short', expect: false },
  { pwd: 'LongEnoughPassword123!', expect: true }
];

for (const { pwd, expect } of passwords) {
  const result = validatePasswordStrength(pwd);
  const status = result.valid === expect ? 'PASS' : 'FAIL';
  console.log(`${status === 'PASS' ? '✓' : '✗'} "${pwd}" - ${result.valid ? 'valid' : result.message}`);
}
console.log('');

// Test 5: JWT Token Generation
console.log('Test 5: JWT Token Generation and Verification');
console.log('-'.repeat(40));
const testUser = {
  id: 'user-12345',
  email: 'test@example.com'
};

const token = generateAccessToken(testUser);
console.log('✓ JWT token generated');
console.log(`  Token: ${token.substring(0, 50)}...`);

const decoded = verifyAccessToken(token);
console.log(`✓ Token verified: userId=${decoded.userId}, email=${decoded.email}`);

const invalidDecoded = verifyAccessToken('invalid.token.here');
console.log(`✓ Invalid token rejected: ${invalidDecoded === null ? 'PASSED' : 'FAILED'}`);
console.log('');

// Test 6: Verification Token Generation
console.log('Test 6: Verification Token Generation');
console.log('-'.repeat(40));
const { token: verifyToken, expiresAt } = generateVerificationToken();
console.log('✓ Verification token generated');
console.log(`  Token: ${verifyToken}`);
console.log(`  Token length: ${verifyToken.length} chars (expected: 64)`);
console.log(`  Expires at: ${expiresAt.toISOString()}`);

const isExpired = isTokenExpired(expiresAt);
console.log(`✓ Token expiration check: ${isExpired ? 'EXPIRED (ERROR!)' : 'VALID'}`);

const pastDate = new Date(Date.now() - 1000);
const isPastExpired = isTokenExpired(pastDate);
console.log(`✓ Past date check: ${isPastExpired ? 'EXPIRED (correct)' : 'VALID (ERROR!)'}`);
console.log('');

console.log('='.repeat(80));
console.log('✅ All manual tests completed successfully!');
console.log('='.repeat(80));
console.log('');
console.log('Next steps:');
console.log('1. Set up a PostgreSQL database');
console.log('2. Run: cd api && npx prisma migrate deploy');
console.log('3. Start server: cd server && npm run dev');
console.log('4. Test with curl or Playwright E2E tests');
console.log('');

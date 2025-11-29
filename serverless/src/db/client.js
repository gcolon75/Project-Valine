import { PrismaClient } from '@prisma/client';

let prisma = null;

/**
 * Get or create Prisma client singleton
 * @returns {PrismaClient}
 */
export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Check if Prisma is in degraded mode (always false with simple implementation)
 * @returns {boolean}
 */
export function isPrismaDegraded() {
  return false;
}

/**
 * Validate DATABASE_URL format
 * @param {string} url
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDatabaseUrl(url) {
  if (!url) {
    return { valid: false, error: 'DATABASE_URL is not set' };
  }
  if (url.includes(' ')) {
    return { valid: false, error: 'DATABASE_URL contains spaces' };
  }
  return { valid: true };
}

// Stub functions for backward compatibility with existing code
export function getDegradedUser() { return null; }
export function createDegradedUser() { return null; }
export function verifyDegradedUserPassword() { return false; }
export function getDegradedUserCount() { return 0; }
export function initPrismaAsync() { return Promise.resolve(getPrisma()); }
export function setDegradedMode() {}
export function getPrismaInitError() { return null; }
export function clearDegradedUserStore() {}
export function getPrismaSync() { return prisma; }

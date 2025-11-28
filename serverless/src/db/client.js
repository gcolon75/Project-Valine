import bcrypt from 'bcryptjs';
import crypto from 'crypto';

let PrismaClient;
let prisma;

// Degraded mode state
let prismaDegraded = false;
let prismaInitError = null;

// In-memory user store for degraded mode (allowlisted emails only)
// Map<email, { id, email, passwordHash, createdAt }>
const degradedUserStore = new Map();

/**
 * Safely attempt to import PrismaClient
 * Returns null if import fails (e.g., missing .prisma/client)
 */
async function importPrismaClient() {
  try {
    const module = await import('@prisma/client');
    return module.PrismaClient;
  } catch (err) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      event: 'prisma_import_failed',
      level: 'error',
      details: {
        error: err.message,
        code: err.code,
        name: err.name
      }
    };
    console.error(JSON.stringify(errorLog));
    return null;
  }
}

/**
 * Initialize Prisma client with degraded mode fallback
 * Sets prismaDegraded = true if initialization fails
 */
async function initializePrisma() {
  // Skip if disabled via environment
  if (process.env.DISABLE_PRISMA_INIT === 'true') {
    prismaDegraded = true;
    prismaInitError = 'Prisma initialization disabled via DISABLE_PRISMA_INIT';
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'prisma_init_disabled',
      level: 'warn'
    }));
    return null;
  }

  if (!PrismaClient) {
    PrismaClient = await importPrismaClient();
    if (!PrismaClient) {
      prismaDegraded = true;
      prismaInitError = 'Failed to import @prisma/client - .prisma/client may be missing';
      return null;
    }
  }

  try {
    const client = new PrismaClient();
    // Test the connection with a simple query
    await client.$queryRaw`SELECT 1`;
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'prisma_init_success',
      level: 'info'
    }));
    
    prismaDegraded = false;
    prismaInitError = null;
    return client;
  } catch (err) {
    prismaDegraded = true;
    prismaInitError = err.message;
    
    const errorLog = {
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      event: 'prisma_init_failed',
      level: 'error',
      details: {
        error: err.message,
        code: err.code,
        name: err.name
      }
    };
    console.error(JSON.stringify(errorLog));
    return null;
  }
}

/**
 * Validates the DATABASE_URL format before Prisma initialization.
 * Catches common issues like spaces in hostname or malformed URLs.
 * @param {string} url - The database connection string
 * @returns {{ valid: boolean, error?: string, sanitizedUrl?: string }}
 */
export function validateDatabaseUrl(url) {
  if (!url) {
    return { valid: false, error: 'DATABASE_URL is not set' };
  }

  // Check for spaces in the URL (common copy-paste issue)
  if (url.includes(' ')) {
    // Create sanitized version for logging (hide password)
    const sanitized = url.replace(/:([^@]+)@/, ':***@');
    return { 
      valid: false, 
      error: 'DATABASE_URL contains spaces - ensure no whitespace in connection string',
      sanitizedUrl: sanitized
    };
  }

  // Validate basic PostgreSQL connection string structure
  // Note: [^:@]+ for username allows any chars except : and @
  // [^@]+ for password allows any chars except @
  const urlPattern = /^postgresql:\/\/[^:@]+:[^@]+@[^:]+:\d+\/[^?]+(\?.*)?$/;
  if (!urlPattern.test(url)) {
    const sanitized = url.replace(/:([^@]+)@/, ':***@');
    return { 
      valid: false, 
      error: 'DATABASE_URL format is invalid - expected postgresql://user:password@host:port/database?options',
      sanitizedUrl: sanitized
    };
  }

  return { valid: true };
}

/**
 * Check if Prisma is in degraded mode
 * @returns {boolean} True if Prisma initialization failed
 */
export function isPrismaDegraded() {
  return prismaDegraded;
}

/**
 * Get the Prisma initialization error message
 * @returns {string|null} Error message or null if no error
 */
export function getPrismaInitError() {
  return prismaInitError;
}

/**
 * Force degraded mode (for testing)
 * @param {boolean} degraded - Whether to enable degraded mode
 * @param {string} error - Error message to set
 */
export function setDegradedMode(degraded, error = null) {
  prismaDegraded = degraded;
  prismaInitError = error;
}

/**
 * Returns a singleton PrismaClient instance.
 * Validates DATABASE_URL on first initialization and logs any issues.
 * May return null if in degraded mode.
 */
export function getPrisma() {
  if (prismaDegraded) {
    return null;
  }
  
  if (!prisma) {
    // Validate DATABASE_URL before creating client
    const validation = validateDatabaseUrl(process.env.DATABASE_URL);
    if (!validation.valid) {
      console.error('[Prisma Validation Error]', validation.error);
      if (validation.sanitizedUrl) {
        console.error('[Sanitized URL]', validation.sanitizedUrl);
      }
      // Still create the client - Prisma will provide detailed error
      // This validation is for better error messages in CloudWatch
    }
    
    try {
      // Synchronous fallback - try to create client directly
      // Note: Full async initialization happens via initPrismaAsync
      const { PrismaClient: SyncPrismaClient } = require('@prisma/client');
      prisma = new SyncPrismaClient();
    } catch (err) {
      prismaDegraded = true;
      prismaInitError = err.message;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'prisma_sync_init_failed',
        level: 'error',
        error: err.message
      }));
      return null;
    }
  }
  return prisma;
}

/**
 * Async Prisma initialization with connection test
 * Call this at Lambda cold start for proper degraded mode detection
 * @returns {Promise<PrismaClient|null>}
 */
export async function initPrismaAsync() {
  if (!prisma && !prismaDegraded) {
    prisma = await initializePrisma();
  }
  return prisma;
}

/* ---------------------- Degraded Mode User Store ---------------------- */

/**
 * Get user from degraded mode store
 * @param {string} email - User email (case-insensitive)
 * @returns {object|null} User object or null
 */
export function getDegradedUser(email) {
  if (!email) return null;
  return degradedUserStore.get(email.toLowerCase()) || null;
}

/**
 * Create user in degraded mode store
 * Only for allowlisted emails during Prisma outage
 * @param {string} email - User email
 * @param {string} password - Plain text password (will be hashed)
 * @returns {Promise<object>} Created user object
 */
export async function createDegradedUser(email, password) {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id,
    email: email.toLowerCase(),
    passwordHash,
    username: email.split('@')[0],
    displayName: email.split('@')[0],
    createdAt: new Date(),
    onboardingComplete: false,
    profileComplete: false,
    twoFactorEnabled: false,
    _degradedMode: true // Mark as degraded mode user
  };
  degradedUserStore.set(email.toLowerCase(), user);
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'degraded_user_created',
    level: 'warn',
    email: email.replace(/^(.{2}).*(@.*)$/, '$1***$2') // Redact
  }));
  
  return user;
}

/**
 * Verify password for degraded mode user
 * @param {string} email - User email
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyDegradedUserPassword(email, password) {
  const user = getDegradedUser(email);
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * Get count of users in degraded store
 * @returns {number} Number of users
 */
export function getDegradedUserCount() {
  return degradedUserStore.size;
}

/**
 * Clear degraded user store (for testing)
 */
export function clearDegradedUserStore() {
  degradedUserStore.clear();
}

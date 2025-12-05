import { PrismaClient } from '@prisma/client';

let prisma = null;
let prismaInitError = null;
// degradedMode is ONLY set when explicitly requested via setDegradedMode(true)
// It is NOT automatically set on initialization failures
let degradedMode = false;

// In-memory user store for degraded mode (when database is unavailable)
const degradedUserStore = new Map();

/**
 * Get or create Prisma client singleton
 * Includes error handling for Lambda cold starts and native binary loading issues.
 * 
 * IMPORTANT FOR LAMBDA:
 * - @prisma/client must be marked as external in esbuild config
 * - node_modules/.prisma/** must be included in the package
 * - The rhel-openssl-3.0.x binary target is required for Amazon Linux 2023
 * 
 * DEGRADED MODE BEHAVIOR:
 * - degradedMode is ONLY activated by explicit call to setDegradedMode(true)
 * - Initialization failures are logged but do NOT trigger degraded mode automatically
 * - This ensures transient issues don't permanently lock out database access
 * 
 * @returns {PrismaClient|null} Returns null if in degraded mode or initialization failed
 */
export function getPrisma() {
  // Only return null for explicit degraded mode override
  if (degradedMode) {
    console.warn('[DB] Running in degraded mode (explicitly set)');
    return null;
  }
  
  if (!prisma) {
    try {
      // Log initialization for debugging Lambda cold starts
      console.log('[DB] Initializing Prisma client...');
      
      // Validate DATABASE_URL before attempting connection
      const dbUrl = process.env.DATABASE_URL;
      const validation = validateDatabaseUrl(dbUrl);
      if (!validation.valid) {
        console.error('[DB] DATABASE_URL validation failed:', validation.error);
        if (validation.sanitizedUrl) {
          console.error('[DB] Sanitized URL:', validation.sanitizedUrl);
        }
        // Store the error but DON'T enable degraded mode automatically
        // This allows retries on subsequent calls if the env var is fixed
        prismaInitError = new Error(`DATABASE_URL validation failed: ${validation.error}`);
        return null;
      }
      
      prisma = new PrismaClient({
        // Log queries in development for debugging
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error']
      });
      
      // Clear any previous error on successful initialization
      prismaInitError = null;
      console.log('[DB] Prisma client initialized successfully');
    } catch (error) {
      // Capture initialization errors - common in Lambda when binaries are missing
      console.error('[DB] Failed to initialize Prisma client:', {
        message: error.message,
        name: error.name,
        // Don't log stack in production to avoid exposing internals
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      });
      
      // Store error but DON'T enable degraded mode automatically
      // This allows retries if the underlying issue is fixed
      prismaInitError = error;
      return null;
    }
  }
  return prisma;
}

/**
 * Check if Prisma is in degraded mode (database unavailable)
 * @returns {boolean}
 */
export function isPrismaDegraded() {
  return degradedMode;
}

/**
 * Get the Prisma initialization error (if any)
 * @returns {Error|null}
 */
export function getPrismaInitError() {
  return prismaInitError;
}

/**
 * Validate DATABASE_URL format
 * Validates in order: existence → spaces → protocol prefix
 * @param {string} url
 * @returns {{ valid: boolean, error?: string, sanitizedUrl?: string }}
 */
export function validateDatabaseUrl(url) {
  // Check 1: URL must be set
  if (!url) {
    return { valid: false, error: 'DATABASE_URL is not set' };
  }
  
  // Check 2: No spaces allowed (common copy-paste error)
  if (url.includes(' ')) {
    // Create sanitized version for logging (hide password)
    const sanitized = url.replace(/:([^@]+)@/, ':***@');
    return { valid: false, error: 'DATABASE_URL contains spaces', sanitizedUrl: sanitized };
  }
  
  // Check 3: Must have PostgreSQL protocol prefix
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    return { valid: false, error: 'DATABASE_URL must start with postgresql:// or postgres://' };
  }
  
  return { valid: true };
}

/**
 * Manually set degraded mode (for testing or manual failover)
 * @param {boolean} enabled
 */
export function setDegradedMode(enabled) {
  degradedMode = enabled;
  if (enabled) {
    console.warn('[DB] Degraded mode enabled - database operations will use in-memory store');
  } else {
    console.log('[DB] Degraded mode disabled - will attempt normal database operations');
  }
}

/**
 * Reset Prisma client state (for testing or reconnection)
 * This clears the cached client and error state to allow fresh initialization
 */
export function resetPrismaState() {
  prisma = null;
  prismaInitError = null;
  console.log('[DB] Prisma state reset - next getPrisma() call will reinitialize');
}

// ============= Degraded Mode User Store =============
// Used when database is unavailable but we still need auth to work

/**
 * Get a user from the degraded mode store
 * @param {string} email
 * @returns {object|null}
 */
export function getDegradedUser(email) {
  return degradedUserStore.get(email?.toLowerCase()) || null;
}

/**
 * Create a user in the degraded mode store
 * @param {string} email
 * @param {string} password - Will be hashed before storage
 * @returns {Promise<object>}
 */
export async function createDegradedUser(email, password) {
  const bcrypt = await import('bcryptjs');
  const crypto = await import('crypto');
  
  const hashedPassword = await bcrypt.default.hash(password, 12);
  const user = {
    id: crypto.default.randomUUID(),
    email: email.toLowerCase(),
    passwordHash: hashedPassword,
    username: email.split('@')[0],
    displayName: email.split('@')[0],
    createdAt: new Date(),
    twoFactorEnabled: false,
    onboardingComplete: false,
    profileComplete: false,
    _degradedMode: true // Flag to identify degraded mode users
  };
  
  degradedUserStore.set(email.toLowerCase(), user);
  console.warn('[DB] Created degraded mode user:', email.toLowerCase());
  return user;
}

/**
 * Verify a user's password in degraded mode
 * @param {string} email
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyDegradedUserPassword(email, password) {
  const user = getDegradedUser(email);
  if (!user || !user.passwordHash) {
    return false;
  }
  
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.compare(password, user.passwordHash);
}

/**
 * Get the count of users in the degraded mode store
 * @returns {number}
 */
export function getDegradedUserCount() {
  return degradedUserStore.size;
}

/**
 * Clear the degraded user store (for testing)
 */
export function clearDegradedUserStore() {
  degradedUserStore.clear();
}

/**
 * Initialize Prisma asynchronously with connection test
 * Useful for Lambda cold start optimization
 * 
 * NOTE: This does NOT automatically enable degraded mode on connection failure.
 * Use setDegradedMode(true) explicitly if you want to enter degraded mode.
 * 
 * @returns {Promise<PrismaClient|null>}
 */
export async function initPrismaAsync() {
  const client = getPrisma();
  if (!client) {
    return null;
  }
  
  try {
    // Test the connection
    await client.$queryRaw`SELECT 1`;
    console.log('[DB] Database connection verified');
    return client;
  } catch (error) {
    console.error('[DB] Database connection test failed:', error.message);
    // Log the error but DON'T automatically enable degraded mode
    // The caller can decide whether to enable it based on their use case
    return null;
  }
}

/**
 * Synchronous getter for Prisma client
 * @returns {PrismaClient|null}
 */
export function getPrismaSync() {
  return getPrisma();
}

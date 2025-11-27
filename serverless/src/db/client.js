import { PrismaClient } from '@prisma/client';
let prisma;

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
  const urlPattern = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+(\?.*)?$/;
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
 * Returns a singleton PrismaClient instance.
 * Validates DATABASE_URL on first initialization and logs any issues.
 */
export function getPrisma() {
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
    prisma = new PrismaClient();
  }
  return prisma;
}

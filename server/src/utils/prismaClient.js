/**
 * Prisma Client Instance
 * Singleton pattern for database connection
 */
import { PrismaClient } from '@prisma/client';

// Global prisma instance to prevent multiple connections
let prisma;

/**
 * Get or create Prisma client instance
 * @returns {PrismaClient}
 */
export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
  
  return prisma;
}

/**
 * Disconnect Prisma client (for testing)
 */
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

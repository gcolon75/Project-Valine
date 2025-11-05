/**
 * Database client singleton
 * Provides a single Prisma client instance for the server
 */

import { PrismaClient } from '@prisma/client'

let prisma = null

/**
 * Get or create Prisma client instance
 * @returns {PrismaClient} Prisma client instance
 */
export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

/**
 * Close Prisma client connection
 * Should be called on application shutdown
 */
export async function closePrisma() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

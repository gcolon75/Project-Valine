// Vitest global setup for auth tests

process.env.NODE_ENV = 'production'; // Force production for cookie Strict tests
process.env.FRONTEND_URL = 'https://example.com';
process.env.COOKIE_DOMAIN = '.example.com';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,valinejustin@gmail.com';
process.env.ENABLE_REGISTRATION = 'false'; // Owner-only path
process.env.STRICT_ALLOWLIST = '1';

// Provide a helper to create a mock Prisma with the owner user
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export const buildMockPrismaWithOwner = async (plainPassword = 'Test123!') => {
  const hash = await bcrypt.hash(plainPassword, 10);
  const ownerUser = {
    id: uuid(),
    email: 'ghawk075@gmail.com',
    passwordHash: hash,
    twoFactorEnabled: false,
    createdAt: new Date(),
  };
  return {
    user: {
      findUnique: async ({ where: { email } }) =>
        email === ownerUser.email ? ownerUser : null,
      create: async ({ data }) => ({
        ...data,
        id: uuid(),
        createdAt: new Date(),
      }),
    },
  };
};
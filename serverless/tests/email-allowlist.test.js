/**
 * Tests for ALLOWED_USER_EMAILS email allowlist enforcement
 * Verifies that only allowed emails can login after authentication
 */

import bcrypt from 'bcryptjs';

// Mock getPrisma before importing login handler
const mockPrisma = {
  user: {
    findFirst: null // Will be set in each test
  },
  refreshToken: {
    create: async () => ({ id: 'mock-refresh-token-id' })
  }
};

// Mock the db/client module
const originalGetPrisma = await (async () => {
  try {
    const module = await import('../src/db/client.js');
    return module.getPrisma;
  } catch {
    return null;
  }
})();

// Create mock getPrisma factory
function createMockPrisma(config = {}) {
  return {
    user: config.user || mockPrisma.user,
    refreshToken: config.refreshToken || mockPrisma.refreshToken
  };
}

// Helper to create a mock user with hashed password
async function createMockUser(email, password, additionalProps = {}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return {
    id: `user-${email}`,
    email,
    normalizedEmail: email.toLowerCase(),
    password: hashedPassword,
    username: email.split('@')[0],
    displayName: `User ${email}`,
    avatar: null,
    role: 'USER',
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    ...additionalProps
  };
}

describe('Email Allowlist Tests', () => {
  let login;
  const originalAllowedEmails = process.env.ALLOWED_USER_EMAILS;

  beforeAll(async () => {
    // Dynamically import and mock
    const authModule = await import('../src/handlers/auth.js');
    login = authModule.login;
  });

  afterEach(() => {
    // Restore original environment
    if (originalAllowedEmails !== undefined) {
      process.env.ALLOWED_USER_EMAILS = originalAllowedEmails;
    } else {
      delete process.env.ALLOWED_USER_EMAILS;
    }
    
    // Reset mock
    mockPrisma.user.findFirst = null;
  });

  test('should return 403 when email not in allowlist (valid password)', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com,friend@example.com';
    
    const mockUser = await createMockUser('hacker@evil.com', 'correctpassword');
    
    // Mock Prisma to return the user
    mockPrisma.user.findFirst = async () => mockUser;
    
    // Temporarily replace getPrisma
    const dbClient = await import('../src/db/client.js');
    const originalFn = dbClient.getPrisma;
    dbClient.getPrisma = () => mockPrisma;

    const event = {
      body: JSON.stringify({
        email: 'hacker@evil.com',
        password: 'correctpassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await login(event);
    
    // Restore original
    dbClient.getPrisma = originalFn;

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('not authorized');
  });

  test('should return 200 when email is in allowlist (valid password)', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com,friend@example.com';
    
    const mockUser = await createMockUser('owner@example.com', 'correctpassword');
    
    mockPrisma.user.findFirst = async () => mockUser;
    
    const dbClient = await import('../src/db/client.js');
    const originalFn = dbClient.getPrisma;
    dbClient.getPrisma = () => mockPrisma;

    const event = {
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'correctpassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await login(event);
    
    dbClient.getPrisma = originalFn;

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('owner@example.com');
    expect(body.user.password).toBeUndefined(); // Password should not be in response
  });

  test('should return 401 when password is invalid (regardless of allowlist)', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';
    
    const mockUser = await createMockUser('owner@example.com', 'correctpassword');
    
    mockPrisma.user.findFirst = async () => mockUser;
    
    const dbClient = await import('../src/db/client.js');
    const originalFn = dbClient.getPrisma;
    dbClient.getPrisma = () => mockPrisma;

    const event = {
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'wrongpassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await login(event);
    
    dbClient.getPrisma = originalFn;

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid email or password');
  });

  test('should allow any user when allowlist is empty', async () => {
    process.env.ALLOWED_USER_EMAILS = '';
    
    const mockUser = await createMockUser('anyone@example.com', 'password123');
    
    mockPrisma.user.findFirst = async () => mockUser;
    
    const dbClient = await import('../src/db/client.js');
    const originalFn = dbClient.getPrisma;
    dbClient.getPrisma = () => mockPrisma;

    const event = {
      body: JSON.stringify({
        email: 'anyone@example.com',
        password: 'password123'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await login(event);
    
    dbClient.getPrisma = originalFn;

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.email).toBe('anyone@example.com');
  });

  test('should handle allowlist with extra whitespace', async () => {
    process.env.ALLOWED_USER_EMAILS = ' owner@example.com , friend@example.com ';
    
    const mockUser = await createMockUser('friend@example.com', 'password123');
    
    mockPrisma.user.findFirst = async () => mockUser;
    
    const dbClient = await import('../src/db/client.js');
    const originalFn = dbClient.getPrisma;
    dbClient.getPrisma = () => mockPrisma;

    const event = {
      body: JSON.stringify({
        email: 'friend@example.com',
        password: 'password123'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await login(event);
    
    dbClient.getPrisma = originalFn;

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.email).toBe('friend@example.com');
  });

  test('should return 401 when user does not exist', async () => {
    process.env.ALLOWED_USER_EMAILS = 'owner@example.com';
    
    mockPrisma.user.findFirst = async () => null; // User not found
    
    const dbClient = await import('../src/db/client.js');
    const originalFn = dbClient.getPrisma;
    dbClient.getPrisma = () => mockPrisma;

    const event = {
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'anypassword'
      }),
      headers: {
        origin: 'http://localhost:5173'
      }
    };

    const response = await login(event);
    
    dbClient.getPrisma = originalFn;

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid email or password');
  });
});

/**
 * Integration test guidance:
 * 
 * To properly test email allowlist enforcement, you need:
 * 
 * 1. Test database with sample users:
 *    - owner@example.com (in allowlist)
 *    - friend@example.com (in allowlist)
 *    - hacker@evil.com (NOT in allowlist)
 * 
 * 2. Set ALLOWED_USER_EMAILS=owner@example.com,friend@example.com
 * 
 * 3. Test scenarios:
 *    - Login with owner@example.com + correct password → 200 (success)
 *    - Login with friend@example.com + correct password → 200 (success)
 *    - Login with hacker@evil.com + correct password → 403 (blocked by allowlist)
 *    - Login with hacker@evil.com + wrong password → 401 (invalid credentials)
 * 
 * 4. Verify logging:
 *    - Check console logs for "Login blocked: Email X not in allowlist"
 *    - Verify allowed emails are logged (but NOT passwords)
 */

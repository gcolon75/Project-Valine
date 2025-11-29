/**
 * Tests for settings and preferences endpoints
 * Ensures profileComplete flag is correctly handled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPreferences, updatePreferences } from '../src/handlers/settings.js';

// Mock user data
const mockUserId = 'test-user-settings-123';
const mockUsers = new Map();
const mockUserSettings = new Map();

// Reset mocks before each test
beforeEach(() => {
  mockUsers.clear();
  mockUserSettings.clear();
  
  // Setup default test user
  mockUsers.set(mockUserId, {
    id: mockUserId,
    email: 'test@example.com',
    theme: 'light',
    onboardingComplete: false,
    profileComplete: false,
    createdAt: new Date()
  });
});

// Mock Prisma
vi.mock('../src/db/client.js', () => ({
  getPrisma: () => ({
    user: {
      findUnique: async ({ where }) => {
        if (where.id) {
          return mockUsers.get(where.id) || null;
        }
        return null;
      },
      update: async ({ where, data }) => {
        const user = mockUsers.get(where.id);
        if (!user) throw new Error('User not found');
        const updated = { ...user, ...data };
        mockUsers.set(where.id, updated);
        return updated;
      }
    },
    userSettings: {
      findUnique: async ({ where }) => {
        if (where.userId) {
          return mockUserSettings.get(where.userId) || null;
        }
        return null;
      },
      upsert: async ({ where, update, create }) => {
        let settings = mockUserSettings.get(where.userId);
        if (settings) {
          settings = { ...settings, ...update };
        } else {
          settings = { id: 'settings-' + where.userId, ...create };
        }
        mockUserSettings.set(where.userId, settings);
        return settings;
      }
    }
  }),
  validateDatabaseUrl: () => ({ valid: true }),
  isPrismaDegraded: () => false,
  getDegradedUser: () => null,
  createDegradedUser: async () => null,
  verifyDegradedUserPassword: async () => false,
  getDegradedUserCount: () => 0
}));

// Mock auth extraction
vi.mock('../src/handlers/auth.js', () => ({
  getUserFromEvent: (event) => {
    const authHeader = event.headers?.authorization || '';
    if (authHeader.includes('test-token')) {
      return mockUserId;
    }
    return null;
  }
}));

describe('Settings Preferences - profileComplete flag', () => {
  describe('getPreferences', () => {
    it('should return profileComplete flag', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' }
      };

      const response = await getPreferences(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.onboardingComplete).toBe(false);
      expect(body.profileComplete).toBe(false);
    });

    it('should return profileComplete as true when set', async () => {
      // Set the user's profileComplete flag
      mockUsers.get(mockUserId).profileComplete = true;
      mockUsers.get(mockUserId).onboardingComplete = true;

      const event = {
        headers: { authorization: 'Bearer test-token' }
      };

      const response = await getPreferences(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.onboardingComplete).toBe(true);
      expect(body.profileComplete).toBe(true);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const event = {
        headers: {}
      };

      const response = await getPreferences(event);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('updatePreferences', () => {
    it('should update profileComplete flag', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          profileComplete: true,
          onboardingComplete: true
        })
      };

      const response = await updatePreferences(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.onboardingComplete).toBe(true);
      expect(body.profileComplete).toBe(true);

      // Verify the user was actually updated
      const updatedUser = mockUsers.get(mockUserId);
      expect(updatedUser.onboardingComplete).toBe(true);
      expect(updatedUser.profileComplete).toBe(true);
    });

    it('should only update profileComplete without affecting other flags', async () => {
      // Set onboardingComplete first
      mockUsers.get(mockUserId).onboardingComplete = true;

      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          profileComplete: true
        })
      };

      const response = await updatePreferences(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.onboardingComplete).toBe(true); // Should remain true
      expect(body.profileComplete).toBe(true);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const event = {
        headers: {},
        body: JSON.stringify({
          profileComplete: true
        })
      };

      const response = await updatePreferences(event);
      expect(response.statusCode).toBe(401);
    });

    it('should handle profileComplete as boolean coercion', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          profileComplete: 'true' // string should be coerced to boolean
        })
      };

      const response = await updatePreferences(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.profileComplete).toBe(true);
    });
  });
});

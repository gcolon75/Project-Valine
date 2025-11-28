/**
 * Tests for profile onboarding persistence
 * Ensures profile data and onboarding flags are correctly saved
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateMyProfile, getMyProfile } from '../src/handlers/profiles.js';

// Mock user data
const mockUserId = 'test-user-onboarding-123';
const mockUsers = new Map();
const mockProfiles = new Map();

// Reset mocks before each test
beforeEach(() => {
  mockUsers.clear();
  mockProfiles.clear();
  
  // Setup default test user
  mockUsers.set(mockUserId, {
    id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
    bio: null,
    onboardingComplete: false,
    profileComplete: false,
    createdAt: new Date()
  });
});

// Mock Prisma with all required exports
vi.mock('../src/db/client.js', () => ({
  getPrisma: () => ({
    user: {
      findUnique: async ({ where }) => {
        if (where.email) {
          return Array.from(mockUsers.values()).find(u => u.email === where.email) || null;
        }
        if (where.id) {
          return mockUsers.get(where.id) || null;
        }
        return null;
      },
      findFirst: async ({ where }) => {
        // For username uniqueness check
        if (where.username) {
          const user = Array.from(mockUsers.values()).find(
            u => u.username === where.username && u.id !== where.id?.not
          );
          return user || null;
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
    profile: {
      findUnique: async ({ where }) => {
        if (where.userId) {
          return mockProfiles.get(where.userId) || null;
        }
        return null;
      },
      create: async ({ data }) => {
        const profile = {
          id: 'profile-' + data.userId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockProfiles.set(data.userId, profile);
        return profile;
      },
      update: async ({ where, data }) => {
        const profile = mockProfiles.get(where.userId);
        if (!profile) throw new Error('Profile not found');
        const updated = { ...profile, ...data, updatedAt: new Date() };
        mockProfiles.set(where.userId, updated);
        return updated;
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
    // Check header for test user ID
    const authHeader = event.headers?.authorization || '';
    if (authHeader.includes('test-token')) {
      return mockUserId;
    }
    return null;
  }
}));

describe('Profile Onboarding Persistence', () => {
  describe('updateMyProfile - Profile Creation', () => {
    it('should create a profile if one does not exist', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          headline: 'Voice Actor',
          bio: 'Professional voice actor',
          roles: ['Voice Actor'],
          tags: ['Animation', 'Commercial'],
          onboardingComplete: true,
          profileComplete: true
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.headline).toBe('Voice Actor');
      expect(body.bio).toBe('Professional voice actor');
      expect(body.roles).toEqual(['Voice Actor']);
      expect(body.tags).toEqual(['Animation', 'Commercial']);

      // Check that profile was created
      const createdProfile = mockProfiles.get(mockUserId);
      expect(createdProfile).toBeDefined();
      expect(createdProfile.headline).toBe('Voice Actor');
    });

    it('should use userId as vanityUrl fallback when username is null', async () => {
      // Set username to null to test fallback
      mockUsers.get(mockUserId).username = null;

      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          headline: 'Test Headline',
          roles: ['Voice Actor'],
          tags: ['Animation']
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(200);

      // Check that profile was created with userId as vanityUrl
      const createdProfile = mockProfiles.get(mockUserId);
      expect(createdProfile).toBeDefined();
      expect(createdProfile.vanityUrl).toBe(mockUserId);
    });

    it('should set onboardingComplete and profileComplete flags on User table', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          displayName: 'New Display Name',
          headline: 'Director',
          roles: ['Director'],
          tags: ['Drama'],
          onboardingComplete: true,
          profileComplete: true
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(200);

      // Verify user flags were updated
      const updatedUser = mockUsers.get(mockUserId);
      expect(updatedUser.onboardingComplete).toBe(true);
      expect(updatedUser.profileComplete).toBe(true);

      // Verify response contains the flags
      const body = JSON.parse(response.body);
      expect(body.onboardingComplete).toBe(true);
      expect(body.profileComplete).toBe(true);
    });

    it('should not reset onboardingComplete when updating profile without flags', async () => {
      // First, set onboardingComplete to true
      mockUsers.get(mockUserId).onboardingComplete = true;
      mockUsers.get(mockUserId).profileComplete = true;

      // Now update profile without sending the flags
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          headline: 'Updated Headline'
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(200);

      // Flags should remain true
      const updatedUser = mockUsers.get(mockUserId);
      expect(updatedUser.onboardingComplete).toBe(true);
      expect(updatedUser.profileComplete).toBe(true);
    });

    it('should update existing profile if one exists', async () => {
      // Create an existing profile
      mockProfiles.set(mockUserId, {
        id: 'profile-' + mockUserId,
        userId: mockUserId,
        vanityUrl: 'testuser',
        headline: 'Old Headline',
        bio: 'Old Bio',
        roles: ['Writer'],
        tags: ['Fantasy'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          headline: 'New Headline',
          roles: ['Director', 'Producer'],
          tags: ['SciFi', 'Action']
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.headline).toBe('New Headline');
      expect(body.roles).toEqual(['Director', 'Producer']);
      expect(body.tags).toEqual(['SciFi', 'Action']);
    });
  });

  describe('updateMyProfile - Validation', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const event = {
        headers: {},
        body: JSON.stringify({
          headline: 'Test'
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(401);
    });

    it('should validate headline length', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          headline: 'x'.repeat(101) // More than 100 characters
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('should validate bio length', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          bio: 'x'.repeat(501) // More than 500 characters
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('should validate roles against allowed list', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          roles: ['Invalid Role', 'Another Invalid']
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('should validate tags against allowed list', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          tags: ['InvalidTag']
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('should validate maximum number of tags', async () => {
      const event = {
        headers: { authorization: 'Bearer test-token' },
        body: JSON.stringify({
          tags: ['Drama', 'Comedy', 'Monologue', 'Character', 'Stage', 'Animation'] // 6 tags, max is 5
        })
      };

      const response = await updateMyProfile(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });
  });

  describe('getMyProfile - Data Retrieval', () => {
    it('should return user and profile data combined', async () => {
      // Setup profile
      mockProfiles.set(mockUserId, {
        id: 'profile-' + mockUserId,
        userId: mockUserId,
        vanityUrl: 'testuser',
        headline: 'Voice Actor',
        bio: 'Professional voice actor',
        roles: ['Voice Actor'],
        tags: ['Animation'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const event = {
        headers: { authorization: 'Bearer test-token' }
      };

      const response = await getMyProfile(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.userId).toBe(mockUserId);
      expect(body.email).toBe('test@example.com');
      expect(body.username).toBe('testuser');
      expect(body.headline).toBe('Voice Actor');
      expect(body.roles).toEqual(['Voice Actor']);
      expect(body.links).toEqual([]); // No links relation in current schema
    });

    it('should return onboardingComplete flag correctly', async () => {
      mockUsers.get(mockUserId).onboardingComplete = true;
      mockUsers.get(mockUserId).profileComplete = true;

      const event = {
        headers: { authorization: 'Bearer test-token' }
      };

      const response = await getMyProfile(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.onboardingComplete).toBe(true);
      expect(body.profileComplete).toBe(true);
    });

    it('should handle missing profile gracefully', async () => {
      // No profile set for user
      const event = {
        headers: { authorization: 'Bearer test-token' }
      };

      const response = await getMyProfile(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.id).toBeNull(); // No profile ID
      expect(body.headline).toBeNull();
      expect(body.roles).toEqual([]);
      expect(body.tags).toEqual([]);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const event = {
        headers: {}
      };

      const response = await getMyProfile(event);
      expect(response.statusCode).toBe(401);
    });
  });
});

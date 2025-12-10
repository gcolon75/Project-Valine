/**
 * Integration tests for profile CRUD operations
 * Tests profile create-or-update, media uploads, and posts filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMyProfile, getMyProfile } from '../src/handlers/profiles.js';
import { getUploadUrl } from '../src/handlers/media.js';
import { listPosts } from '../src/handlers/posts.js';

// Mock database
const mockUsers = new Map();
const mockProfiles = new Map();
const mockPosts = new Map();
const mockMedia = new Map();

let testUserId = 'test-user-123';
let testProfileId = 'test-profile-456';

// Mock Prisma
vi.mock('../src/db/client.js', () => ({
  getPrisma: () => ({
    user: {
      findUnique: async ({ where }) => {
        return mockUsers.get(where.id) || null;
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
      findUnique: async ({ where, include }) => {
        const profile = where.userId 
          ? Array.from(mockProfiles.values()).find(p => p.userId === where.userId)
          : mockProfiles.get(where.id);
        
        if (!profile) return null;
        
        if (include) {
          return {
            ...profile,
            education: [],
            media: []
          };
        }
        return profile;
      },
      create: async ({ data }) => {
        const newProfile = {
          ...data,
          id: `profile-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockProfiles.set(newProfile.id, newProfile);
        return newProfile;
      },
      update: async ({ where, data }) => {
        const profile = mockProfiles.get(where.userId) || 
                       Array.from(mockProfiles.values()).find(p => p.userId === where.userId);
        if (!profile) throw new Error('Profile not found');
        const updated = { ...profile, ...data, updatedAt: new Date() };
        mockProfiles.set(profile.id, updated);
        return updated;
      }
    },
    post: {
      findMany: async ({ where, include }) => {
        const posts = Array.from(mockPosts.values());
        let filtered = posts;
        
        if (where?.authorId) {
          filtered = filtered.filter(p => p.authorId === where.authorId);
        }
        
        if (include?.author) {
          return filtered.map(p => ({
            ...p,
            author: mockUsers.get(p.authorId) || null
          }));
        }
        
        return filtered;
      }
    },
    media: {
      create: async ({ data }) => {
        const newMedia = {
          ...data,
          id: `media-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockMedia.set(newMedia.id, newMedia);
        return newMedia;
      },
      findMany: async ({ where }) => {
        return [];
      }
    },
    connectionRequest: {
      count: async () => 0
    }
  }),
  validateDatabaseUrl: () => ({ valid: true }),
  isPrismaDegraded: () => false
}));

// Mock auth
vi.mock('../src/handlers/auth.js', () => ({
  getUserFromEvent: (event) => event.mockUserId || null
}));

// Mock S3
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://s3.example.com/signed-url'
}));

describe('Profile CRUD Tests', () => {
  beforeEach(() => {
    // Reset mocks
    mockUsers.clear();
    mockProfiles.clear();
    mockPosts.clear();
    mockMedia.clear();
    
    // Setup test user
    mockUsers.set(testUserId, {
      id: testUserId,
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      avatar: null,
      emailVerified: true,
      onboardingComplete: false,
      profileComplete: false,
      createdAt: new Date()
    });
  });

  describe('PATCH /me/profile - Create or Update', () => {
    it('should create profile if it does not exist', async () => {
      const event = {
        mockUserId: testUserId,
        body: JSON.stringify({
          displayName: 'Updated Name',
          headline: 'Voice Actor',
          bio: 'Professional voice actor'
        })
      };

      const response = await updateMyProfile(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.profile).toBeDefined();
      expect(body.profile.headline).toBe('Voice Actor');
      expect(body.profile.bio).toBe('Professional voice actor');
      expect(mockProfiles.size).toBe(1);
    });

    it('should update existing profile', async () => {
      // Create initial profile
      mockProfiles.set(testProfileId, {
        id: testProfileId,
        userId: testUserId,
        vanityUrl: 'testuser',
        headline: 'Old Headline',
        bio: 'Old Bio',
        roles: [],
        tags: [],
        socialLinks: null
      });

      const event = {
        mockUserId: testUserId,
        body: JSON.stringify({
          headline: 'New Headline',
          bio: 'New Bio'
        })
      };

      const response = await updateMyProfile(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.profile.headline).toBe('New Headline');
      expect(body.profile.bio).toBe('New Bio');
      expect(mockProfiles.size).toBe(1); // No duplicate created
    });

    it('should not return 500 when profile is missing', async () => {
      const event = {
        mockUserId: testUserId,
        body: JSON.stringify({
          headline: 'Test Headline'
        })
      };

      const response = await updateMyProfile(event);

      expect(response.statusCode).not.toBe(500);
      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /profiles/:id/media/upload-url', () => {
    beforeEach(() => {
      // Create test profile
      mockProfiles.set(testProfileId, {
        id: testProfileId,
        userId: testUserId,
        vanityUrl: 'testuser',
        headline: '',
        bio: '',
        roles: [],
        tags: []
      });
    });

    it('should return 200 for valid profile ID', async () => {
      const event = {
        mockUserId: testUserId,
        pathParameters: { id: testProfileId },
        body: JSON.stringify({
          type: 'image',
          title: 'Test Image'
        })
      };

      const response = await getUploadUrl(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.uploadUrl).toBeDefined();
      expect(body.mediaId).toBeDefined();
    });

    it('should return 404 for invalid profile ID', async () => {
      const event = {
        mockUserId: testUserId,
        pathParameters: { id: 'invalid-profile-id' },
        body: JSON.stringify({
          type: 'image',
          title: 'Test Image'
        })
      };

      const response = await getUploadUrl(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('not found');
    });

    it('should auto-create profile when no profileId provided', async () => {
      // Remove existing profile
      mockProfiles.clear();

      const event = {
        mockUserId: testUserId,
        pathParameters: {}, // No ID
        body: JSON.stringify({
          type: 'image',
          title: 'Test Image'
        })
      };

      const response = await getUploadUrl(event);

      expect(response.statusCode).toBe(200);
      expect(mockProfiles.size).toBe(1); // Profile was auto-created
    });
  });

  describe('GET /posts - Author ID Filter', () => {
    beforeEach(() => {
      // Create test posts with user ID as authorId
      mockPosts.set('post-1', {
        id: 'post-1',
        authorId: testUserId, // Uses user.id, not profile.id
        content: 'Test post 1',
        visibility: 'PUBLIC',
        createdAt: new Date()
      });

      mockPosts.set('post-2', {
        id: 'post-2',
        authorId: testUserId,
        content: 'Test post 2',
        visibility: 'PUBLIC',
        createdAt: new Date()
      });

      mockPosts.set('post-3', {
        id: 'post-3',
        authorId: 'other-user-id',
        content: 'Other user post',
        visibility: 'PUBLIC',
        createdAt: new Date()
      });
    });

    it('should filter posts by user.id (not profile.id)', async () => {
      const event = {
        queryStringParameters: {
          authorId: testUserId // Should be user.id
        }
      };

      const response = await listPosts(event);
      const posts = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(posts.length).toBe(2);
      expect(posts.every(p => p.authorId === testUserId)).toBe(true);
    });

    it('should return empty array when filtering by wrong ID', async () => {
      const event = {
        queryStringParameters: {
          authorId: testProfileId // Wrong - using profile.id instead of user.id
        }
      };

      const response = await listPosts(event);
      const posts = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(posts.length).toBe(0); // No posts found because authorId is user.id, not profile.id
    });
  });
});

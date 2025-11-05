// src/services/__tests__/profileService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as profileService from '../profileService';
import apiClient from '../api';

// Mock apiClient
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Profile Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should fetch user profile with links', async () => {
      const mockProfile = {
        id: 'profile_123',
        userId: 'user_123',
        title: 'Senior Voice Actor',
        headline: 'Award-winning voice actor',
        links: [
          { id: 'link_1', label: 'Website', url: 'https://example.com', type: 'website' }
        ]
      };

      apiClient.get.mockResolvedValue({ data: { profile: mockProfile } });

      const result = await profileService.getProfile('user_123');

      expect(apiClient.get).toHaveBeenCalledWith('/profiles/user_123');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update profile with title and headline', async () => {
      const updates = {
        title: 'Senior Voice Actor',
        headline: 'Award-winning voice actor'
      };

      const mockResponse = {
        profile: {
          id: 'profile_123',
          userId: 'user_123',
          ...updates
        }
      };

      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfile('user_123', updates);

      expect(apiClient.patch).toHaveBeenCalledWith('/profiles/user_123', updates);
      expect(result).toEqual(mockResponse.profile);
    });

    it('should update profile with links', async () => {
      const updates = {
        links: [
          { label: 'Website', url: 'https://example.com', type: 'website' },
          { label: 'IMDb', url: 'https://imdb.com/name/nm123', type: 'imdb' }
        ]
      };

      const mockResponse = {
        profile: {
          id: 'profile_123',
          userId: 'user_123',
          links: updates.links
        }
      };

      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfile('user_123', updates);

      expect(apiClient.patch).toHaveBeenCalledWith('/profiles/user_123', updates);
      expect(result.links).toHaveLength(2);
    });
  });

  describe('getProfileLinks', () => {
    it('should fetch all profile links', async () => {
      const mockLinks = [
        { id: 'link_1', label: 'Website', url: 'https://example.com', type: 'website' },
        { id: 'link_2', label: 'IMDb', url: 'https://imdb.com', type: 'imdb' }
      ];

      apiClient.get.mockResolvedValue({ data: { links: mockLinks } });

      const result = await profileService.getProfileLinks('user_123');

      expect(apiClient.get).toHaveBeenCalledWith('/profiles/user_123/links');
      expect(result).toEqual(mockLinks);
    });
  });

  describe('createProfileLink', () => {
    it('should create a new profile link', async () => {
      const newLink = {
        label: 'My Website',
        url: 'https://example.com',
        type: 'website'
      };

      const mockResponse = {
        link: {
          id: 'link_123',
          userId: 'user_123',
          profileId: 'profile_123',
          ...newLink,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      };

      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await profileService.createProfileLink('user_123', newLink);

      expect(apiClient.post).toHaveBeenCalledWith('/profiles/user_123/links', newLink);
      expect(result).toEqual(mockResponse.link);
      expect(result.id).toBe('link_123');
    });
  });

  describe('updateProfileLink', () => {
    it('should update an existing profile link', async () => {
      const updates = {
        label: 'Updated Website',
        url: 'https://newsite.com'
      };

      const mockResponse = {
        link: {
          id: 'link_123',
          userId: 'user_123',
          profileId: 'profile_123',
          label: 'Updated Website',
          url: 'https://newsite.com',
          type: 'website',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z'
        }
      };

      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfileLink('user_123', 'link_123', updates);

      expect(apiClient.patch).toHaveBeenCalledWith('/profiles/user_123/links/link_123', updates);
      expect(result).toEqual(mockResponse.link);
    });
  });

  describe('deleteProfileLink', () => {
    it('should delete a profile link', async () => {
      const mockResponse = {
        success: true,
        message: 'Link deleted successfully'
      };

      apiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await profileService.deleteProfileLink('user_123', 'link_123');

      expect(apiClient.delete).toHaveBeenCalledWith('/profiles/user_123/links/link_123');
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('batchUpdateProfileLinks', () => {
    it('should batch update all links via profile endpoint', async () => {
      const links = [
        { id: 'link_1', label: 'Website', url: 'https://example.com', type: 'website' },
        { id: 'link_2', label: 'IMDb', url: 'https://imdb.com', type: 'imdb' }
      ];

      const mockResponse = {
        profile: {
          id: 'profile_123',
          userId: 'user_123',
          links: links.map(l => ({ ...l, createdAt: new Date(), updatedAt: new Date() }))
        }
      };

      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await profileService.batchUpdateProfileLinks('user_123', links);

      // Check that the call was made with expected arguments
      expect(apiClient.patch).toHaveBeenCalled();
      const callArgs = apiClient.patch.mock.calls[0];
      expect(callArgs[0]).toBe('/profiles/user_123');
      expect(callArgs[1]).toHaveProperty('links');
      expect(callArgs[1].links).toHaveLength(2);
      expect(callArgs[1].links[0].label).toBe('Website');
      expect(callArgs[1].links[0].url).toBe('https://example.com');
      expect(result).toEqual(mockResponse.profile);
    });

    it('should trim labels and URLs', async () => {
      const links = [
        { label: '  Website  ', url: '  https://example.com  ', type: 'website' }
      ];

      apiClient.patch.mockResolvedValue({ data: { profile: {} } });

      await profileService.batchUpdateProfileLinks('user_123', links);

      const callArgs = apiClient.patch.mock.calls[0];
      expect(callArgs[1].links[0].label).toBe('Website');
      expect(callArgs[1].links[0].url).toBe('https://example.com');
    });

    it('should handle links without IDs (new links)', async () => {
      const links = [
        { label: 'Website', url: 'https://example.com', type: 'website' }
      ];

      apiClient.patch.mockResolvedValue({ data: { profile: {} } });

      await profileService.batchUpdateProfileLinks('user_123', links);

      const callArgs = apiClient.patch.mock.calls[0];
      expect(callArgs[1].links[0].id).toBeUndefined();
      expect(callArgs[1].links[0].label).toBe('Website');
      expect(callArgs[1].links[0].url).toBe('https://example.com');
      expect(callArgs[1].links[0].type).toBe('website');
    });
  });

  describe('mapLinkTypeFromApi', () => {
    it('should map API types to frontend types', () => {
      expect(profileService.mapLinkTypeFromApi('website')).toBe('Website');
      expect(profileService.mapLinkTypeFromApi('imdb')).toBe('IMDb');
      expect(profileService.mapLinkTypeFromApi('showreel')).toBe('YouTube');
      expect(profileService.mapLinkTypeFromApi('other')).toBe('Other');
    });

    it('should default to Website for unknown types', () => {
      expect(profileService.mapLinkTypeFromApi('unknown')).toBe('Website');
    });
  });
});

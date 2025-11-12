/**
 * Profile Summary Utilities Unit Tests
 */

import { describe, it, expect } from 'vitest'
import {
  buildProfileSummary,
  getProfileCacheKey,
  normalizeSearchQuery,
  getSearchCacheKey
} from '../profileSummary.js'

describe('Profile Summary Utilities', () => {
  describe('buildProfileSummary', () => {
    it('should build profile summary with essential fields', () => {
      const profileRecord = {
        id: 'profile-123',
        userId: 'user-456',
        vanityUrl: 'john-doe',
        headline: 'Senior Voice Actor',
        title: 'Voice Actor',
        bio: 'Professional voice actor with 10 years experience',
        roles: ['Actor', 'Voice Actor'],
        tags: ['animation', 'commercial'],
        location: { city: 'Los Angeles', state: 'CA' },
        links: [
          { id: 'link1', label: 'Website', url: 'https://example.com', type: 'website' }
        ],
        user: {
          avatar: 'https://example.com/avatar.jpg'
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      const summary = buildProfileSummary(profileRecord)

      expect(summary).toEqual({
        id: 'profile-123',
        userId: 'user-456',
        vanityUrl: 'john-doe',
        headline: 'Senior Voice Actor',
        title: 'Voice Actor',
        bio: 'Professional voice actor with 10 years experience',
        roles: ['Actor', 'Voice Actor'],
        tags: ['animation', 'commercial'],
        location: { city: 'Los Angeles', state: 'CA' },
        linksCount: 1,
        hasAvatar: true,
        links: [
          { id: 'link1', label: 'Website', url: 'https://example.com', type: 'website' }
        ],
        createdAt: profileRecord.createdAt,
        updatedAt: profileRecord.updatedAt
      })
    })

    it('should handle null optional fields', () => {
      const profileRecord = {
        id: 'profile-123',
        userId: 'user-456',
        vanityUrl: 'jane-doe',
        headline: null,
        title: null,
        bio: null,
        roles: [],
        tags: [],
        location: null,
        links: [],
        user: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const summary = buildProfileSummary(profileRecord)

      expect(summary.headline).toBeNull()
      expect(summary.title).toBeNull()
      expect(summary.bio).toBeNull()
      expect(summary.linksCount).toBe(0)
      expect(summary.hasAvatar).toBe(false)
    })

    it('should return null for null input', () => {
      const summary = buildProfileSummary(null)
      expect(summary).toBeNull()
    })

    it('should calculate linksCount correctly', () => {
      const profileRecord = {
        id: 'profile-123',
        userId: 'user-456',
        vanityUrl: 'test',
        links: [
          { id: 'link1' },
          { id: 'link2' },
          { id: 'link3' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const summary = buildProfileSummary(profileRecord)
      expect(summary.linksCount).toBe(3)
    })
  })

  describe('getProfileCacheKey', () => {
    it('should generate correct cache key pattern', () => {
      const userId = 'user-123'
      const key = getProfileCacheKey(userId)
      
      expect(key).toBe('profile:v1:user-123:summary')
    })

    it('should include version in key', () => {
      const key = getProfileCacheKey('test')
      expect(key).toContain(':v1:')
    })
  })

  describe('normalizeSearchQuery', () => {
    it('should convert to lowercase', () => {
      const normalized = normalizeSearchQuery('TEST Query')
      expect(normalized).toBe('test query')
    })

    it('should trim whitespace', () => {
      const normalized = normalizeSearchQuery('  test  ')
      expect(normalized).toBe('test')
    })

    it('should collapse multiple spaces', () => {
      const normalized = normalizeSearchQuery('test   query   here')
      expect(normalized).toBe('test query here')
    })

    it('should handle empty string', () => {
      const normalized = normalizeSearchQuery('')
      expect(normalized).toBe('')
    })

    it('should handle null', () => {
      const normalized = normalizeSearchQuery(null)
      expect(normalized).toBe('')
    })

    it('should normalize complex queries consistently', () => {
      const query1 = normalizeSearchQuery('  Voice   Actor  ')
      const query2 = normalizeSearchQuery('voice actor')
      const query3 = normalizeSearchQuery('VOICE ACTOR')
      
      expect(query1).toBe(query2)
      expect(query2).toBe(query3)
    })
  })

  describe('getSearchCacheKey', () => {
    it('should generate correct cache key pattern', () => {
      const key = getSearchCacheKey('test query', 1)
      expect(key).toBe('search:v1:test query:page:1')
    })

    it('should normalize query in key', () => {
      const key = getSearchCacheKey('  TEST   Query  ', 2)
      expect(key).toBe('search:v1:test query:page:2')
    })

    it('should default to page 1', () => {
      const key = getSearchCacheKey('test')
      expect(key).toBe('search:v1:test:page:1')
    })

    it('should include version in key', () => {
      const key = getSearchCacheKey('test')
      expect(key).toContain(':v1:')
    })

    it('should generate same key for equivalent queries', () => {
      const key1 = getSearchCacheKey('Voice Actor', 1)
      const key2 = getSearchCacheKey('voice  actor', 1)
      
      expect(key1).toBe(key2)
    })
  })
})

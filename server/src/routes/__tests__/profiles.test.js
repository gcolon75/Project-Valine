/**
 * Contract tests for User Profiles API
 * Tests the profiles endpoints for title, headline, and social links management
 */

import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.API_URL || 'http://localhost:5000'

describe('User Profiles API', () => {
  describe('GET /profiles/:userId', () => {
    it('should return user profile', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('profile')
      expect(data.profile).toHaveProperty('userId')
    })

    it('should include profile fields', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`)
      const data = await response.json()
      
      const { profile } = data
      expect(profile).toHaveProperty('headline')
      expect(profile).toHaveProperty('title')
      expect(profile).toHaveProperty('socialLinks')
    })
  })

  describe('PATCH /profiles/:userId', () => {
    describe('Title field', () => {
      it('should accept valid title', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Senior Voice Actor' })
        })
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.profile.title).toBe('Senior Voice Actor')
      })

      it('should trim whitespace from title', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '  Voice Actor  ' })
        })
        
        const data = await response.json()
        expect(data.profile.title).toBe('Voice Actor')
      })

      it('should reject title exceeding 100 characters', async () => {
        const longTitle = 'A'.repeat(101)
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: longTitle })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_TITLE')
      })
    })

    describe('Headline field', () => {
      it('should accept valid headline', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headline: 'Voice Actor - Classical & Contemporary' })
        })
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.profile.headline).toBe('Voice Actor - Classical & Contemporary')
      })

      it('should reject headline exceeding 200 characters', async () => {
        const longHeadline = 'A'.repeat(201)
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headline: longHeadline })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_HEADLINE')
      })
    })

    describe('Social Links', () => {
      it('should accept valid social links', async () => {
        const socialLinks = {
          website: 'https://example.com',
          instagram: 'https://instagram.com/user',
          imdb: 'https://imdb.com/name/nm1234567'
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ socialLinks })
        })
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.profile.socialLinks).toEqual(socialLinks)
      })

      it('should accept all supported social link types', async () => {
        const socialLinks = {
          website: 'https://example.com',
          instagram: 'https://instagram.com/user',
          imdb: 'https://imdb.com/name/nm1234567',
          linkedin: 'https://linkedin.com/in/user',
          showreel: 'https://vimeo.com/123456'
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ socialLinks })
        })
        
        expect(response.status).toBe(200)
      })

      it('should reject invalid URL protocol', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: { website: 'ftp://example.com' }
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_URL')
        expect(data.error.message).toContain('http or https')
      })

      it('should reject invalid URL format', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: { website: 'not-a-url' }
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_URL')
      })

      it('should reject unsupported social link keys', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: { twitter: 'https://twitter.com/user' }
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_SOCIAL_LINK_KEY')
        expect(data.error.details.validKeys).toContain('website')
        expect(data.error.details.validKeys).toContain('instagram')
      })

      it('should accept null values to remove links', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: { website: null }
          })
        })
        
        expect(response.status).toBe(200)
      })

      it('should reject non-object socialLinks', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: 'not-an-object'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_SOCIAL_LINKS')
      })

      it('should reject array as socialLinks', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: ['https://example.com']
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_SOCIAL_LINKS')
      })
    })

    describe('Combined Updates', () => {
      it('should update multiple fields at once', async () => {
        const updates = {
          title: 'Voice Director',
          headline: 'Award-winning voice actor',
          socialLinks: {
            website: 'https://mysite.com',
            imdb: 'https://imdb.com/name/nm7654321'
          }
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.profile.title).toBe(updates.title)
        expect(data.profile.headline).toBe(updates.headline)
        expect(data.profile.socialLinks).toEqual(updates.socialLinks)
      })
    })

    describe('Profile Links Array', () => {
      it('should accept links array', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            links: [
              {
                label: 'My Website',
                url: 'https://example.com',
                type: 'website'
              },
              {
                label: 'IMDB Profile',
                url: 'https://imdb.com/name/nm123',
                type: 'imdb'
              }
            ]
          })
        })
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.profile.links).toBeDefined()
        expect(Array.isArray(data.profile.links)).toBe(true)
      })

      it('should reject non-array links', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            links: 'not-an-array'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINKS')
      })

      it('should reject links with invalid data', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            links: [
              {
                label: 'Test',
                url: 'invalid-url',
                type: 'website'
              }
            ]
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
      })

      it('should reject too many links', async () => {
        const links = Array.from({ length: 21 }, (_, i) => ({
          label: `Link ${i + 1}`,
          url: `https://example${i}.com`,
          type: 'website'
        }))
        
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('TOO_MANY_LINKS')
        expect(data.error.details.max).toBe(20)
      })

      it('should allow updating existing links with id', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            links: [
              {
                id: 'existing-link-id',
                label: 'Updated Label',
                url: 'https://updated.com',
                type: 'website'
              }
            ]
          })
        })
        
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Error Response Format', () => {
    it('should return standardized error format', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialLinks: { website: 'invalid-url' }
        })
      })
      
      const data = await response.json()
      
      // Verify error structure
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
      expect(data.error.message).toBeDefined()
      expect(data.error.details).toBeDefined()
      
      // Verify error types
      expect(typeof data.error.code).toBe('string')
      expect(typeof data.error.message).toBe('string')
      expect(typeof data.error.details).toBe('object')
    })
  })

  describe('Response Structure', () => {
    it('GET should return profile object', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`)
      const data = await response.json()
      
      expect(data).toHaveProperty('profile')
      expect(typeof data.profile).toBe('object')
    })

    it('PATCH should return success and updated profile', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Voice Actor' })
      })
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.profile).toBeDefined()
      expect(typeof data.profile).toBe('object')
    })
  })
})

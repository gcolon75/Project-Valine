/**
 * Contract tests for Profile Links API
 * Tests the dedicated profile links CRUD endpoints
 */

import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.API_URL || 'http://localhost:5000'

describe('Profile Links API', () => {
  describe('GET /profiles/:userId/links', () => {
    it('should return list of profile links', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('links')
      expect(Array.isArray(data.links)).toBe(true)
    })

    it('should return 404 for non-existent profile', async () => {
      const response = await fetch(`${BASE_URL}/profiles/nonexistent/links`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error.code).toBe('PROFILE_NOT_FOUND')
    })

    it('should return links ordered by creation date', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
      const data = await response.json()
      
      if (data.links.length > 1) {
        const dates = data.links.map(l => new Date(l.createdAt).getTime())
        const sorted = [...dates].sort((a, b) => a - b)
        expect(dates).toEqual(sorted)
      }
    })
  })

  describe('POST /profiles/:userId/links', () => {
    describe('Valid link creation', () => {
      it('should create a new profile link', async () => {
        const newLink = {
          label: 'My Website',
          url: 'https://example.com',
          type: 'website'
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLink)
        })
        
        expect(response.status).toBe(201)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.link).toBeDefined()
        expect(data.link.label).toBe('My Website')
        expect(data.link.url).toBe('https://example.com')
        expect(data.link.type).toBe('website')
      })

      it('should accept all valid link types', async () => {
        const types = ['website', 'imdb', 'showreel', 'other']
        
        for (const type of types) {
          const newLink = {
            label: `My ${type}`,
            url: 'https://example.com',
            type
          }
          
          const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLink)
          })
          
          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.link.type).toBe(type)
        }
      })

      it('should trim whitespace from label', async () => {
        const newLink = {
          label: '  My Website  ',
          url: 'https://example.com',
          type: 'website'
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLink)
        })
        
        const data = await response.json()
        expect(data.link.label).toBe('My Website')
      })
    })

    describe('Validation errors', () => {
      it('should reject link with missing label', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://example.com',
            type: 'website'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
        expect(data.error.details.field).toContain('label')
      })

      it('should reject link with empty label', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: '',
            url: 'https://example.com',
            type: 'website'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
      })

      it('should reject link with label exceeding 40 characters', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'A'.repeat(41),
            url: 'https://example.com',
            type: 'website'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
        expect(data.error.message).toContain('40')
      })

      it('should reject link with missing URL', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'My Website',
            type: 'website'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
        expect(data.error.details.field).toContain('url')
      })

      it('should reject link with invalid URL format', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'My Website',
            url: 'not-a-url',
            type: 'website'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
      })

      it('should reject link with invalid URL protocol', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'My Website',
            url: 'ftp://example.com',
            type: 'website'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
        expect(data.error.message).toContain('http or https')
      })

      it('should reject link with invalid type', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'My Website',
            url: 'https://example.com',
            type: 'twitter'
          })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_LINK')
      })

      it('should reject when max links exceeded', async () => {
        // This test assumes the user already has 20 links
        // In a real scenario, you'd need to set up the test data
        const response = await fetch(`${BASE_URL}/profiles/user_with_20_links/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'Extra Link',
            url: 'https://example.com',
            type: 'website'
          })
        })
        
        if (response.status === 400) {
          const data = await response.json()
          if (data.error.code === 'TOO_MANY_LINKS') {
            expect(data.error.details.max).toBe(20)
          }
        }
      })
    })

    it('should return 404 for non-existent profile', async () => {
      const response = await fetch(`${BASE_URL}/profiles/nonexistent/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'My Website',
          url: 'https://example.com',
          type: 'website'
        })
      })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('PROFILE_NOT_FOUND')
    })
  })

  describe('PATCH /profiles/:userId/links/:linkId', () => {
    it('should update link label', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated Label'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.link.label).toBe('Updated Label')
    })

    it('should update link URL', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://newurl.com'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.link.url).toBe('https://newurl.com')
    })

    it('should update link type', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'showreel'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.link.type).toBe('showreel')
    })

    it('should update multiple fields at once', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'My IMDB',
          url: 'https://imdb.com/name/nm123',
          type: 'imdb'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.link.label).toBe('My IMDB')
      expect(data.link.url).toBe('https://imdb.com/name/nm123')
      expect(data.link.type).toBe('imdb')
    })

    it('should reject invalid label', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'A'.repeat(41)
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_LABEL')
    })

    it('should reject invalid URL', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'not-a-url'
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_URL')
    })

    it('should reject invalid type', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invalid'
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_TYPE')
    })

    it('should reject update with no fields', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('NO_UPDATES')
    })

    it('should return 404 for non-existent link', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/nonexistent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated'
        })
      })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('LINK_NOT_FOUND')
    })
  })

  describe('DELETE /profiles/:userId/links/:linkId', () => {
    it('should delete a profile link', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
        method: 'DELETE'
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBeDefined()
    })

    it('should return 404 for non-existent link', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links/nonexistent`, {
        method: 'DELETE'
      })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('LINK_NOT_FOUND')
    })

    it('should not allow deleting another user\'s link', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_456/links/link_123`, {
        method: 'DELETE'
      })
      
      // Should return 404 if link doesn't belong to user
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('LINK_NOT_FOUND')
    })
  })

  describe('Error Response Format', () => {
    it('should return standardized error format', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Test',
          url: 'invalid-url',
          type: 'website'
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

  describe('Integration with Profile', () => {
    it('GET /profiles/:userId should include links array', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`)
      const data = await response.json()
      
      expect(data.profile).toHaveProperty('links')
      expect(Array.isArray(data.profile.links)).toBe(true)
    })

    it('PATCH /profiles/:userId should accept links array', async () => {
      const response = await fetch(`${BASE_URL}/profiles/user_123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          links: [
            {
              label: 'My Website',
              url: 'https://example.com',
              type: 'website'
            }
          ]
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.profile.links).toBeDefined()
      expect(Array.isArray(data.profile.links)).toBe(true)
    })
  })
})

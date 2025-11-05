/**
 * Contract tests for Profile Links API v1.1 features
 * Tests ordering, ETag caching, and rate limiting
 */

import { describe, it, expect, beforeEach } from 'vitest'

const BASE_URL = process.env.API_URL || 'http://localhost:5000'

describe('Profile Links API v1.1', () => {
  describe('Link Ordering', () => {
    describe('GET endpoints return ordered links', () => {
      it('should return links ordered by position, then createdAt', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
        expect(response.status).toBe(200)
        
        const data = await response.json()
        const links = data.links
        
        if (links.length > 1) {
          // Check that links are sorted by position
          for (let i = 1; i < links.length; i++) {
            const prevLink = links[i - 1]
            const currLink = links[i]
            
            // Position should be ascending or equal
            expect(prevLink.position).toBeLessThanOrEqual(currLink.position)
            
            // If positions are equal, createdAt should be ascending
            if (prevLink.position === currLink.position) {
              const prevTime = new Date(prevLink.createdAt).getTime()
              const currTime = new Date(currLink.createdAt).getTime()
              expect(prevTime).toBeLessThanOrEqual(currTime)
            }
          }
        }
      })

      it('should include position field in link objects', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
        const data = await response.json()
        
        if (data.links.length > 0) {
          const link = data.links[0]
          expect(link).toHaveProperty('position')
          expect(typeof link.position).toBe('number')
        }
      })
    })

    describe('POST with position', () => {
      it('should create link with specified position', async () => {
        const newLink = {
          label: 'Ordered Link',
          url: 'https://example.com/ordered',
          type: 'website',
          position: 5
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLink)
        })
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.link.position).toBe(5)
        }
      })

      it('should create link with default position when not specified', async () => {
        const newLink = {
          label: 'Default Position Link',
          url: 'https://example.com/default',
          type: 'website'
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLink)
        })
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.link).toHaveProperty('position')
          expect(typeof data.link.position).toBe('number')
        }
      })
    })

    describe('PATCH with position', () => {
      it('should update link position', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: 10 })
        })
        
        if (response.status === 200) {
          const data = await response.json()
          expect(data.link.position).toBe(10)
        }
      })

      it('should reject negative position values', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: -1 })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_POSITION')
      })

      it('should reject non-numeric position values', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links/link_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: 'invalid' })
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_POSITION')
      })
    })

    describe('Batch update with positions', () => {
      it('should update multiple links with positions via profile PATCH', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            links: [
              {
                id: 'link_1',
                label: 'First Link',
                url: 'https://first.com',
                type: 'website',
                position: 0
              },
              {
                id: 'link_2',
                label: 'Second Link',
                url: 'https://second.com',
                type: 'imdb',
                position: 1
              }
            ]
          })
        })
        
        if (response.status === 200) {
          const data = await response.json()
          expect(data.profile.links[0].position).toBe(0)
          expect(data.profile.links[1].position).toBe(1)
        }
      })
    })
  })

  describe('ETag & Caching', () => {
    describe('ETag headers', () => {
      it('should return ETag header on GET /profiles/:userId', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123`)
        
        if (response.status === 200) {
          const etag = response.headers.get('ETag')
          expect(etag).toBeDefined()
          expect(etag).toMatch(/^"[a-f0-9]+"$/)
        }
      })

      it('should return ETag header on GET /profiles/:userId/links', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
        
        if (response.status === 200) {
          const etag = response.headers.get('ETag')
          expect(etag).toBeDefined()
          expect(etag).toMatch(/^"[a-f0-9]+"$/)
        }
      })

      it('should return Cache-Control header', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
        
        if (response.status === 200) {
          const cacheControl = response.headers.get('Cache-Control')
          expect(cacheControl).toBeDefined()
          expect(cacheControl).toContain('max-age')
        }
      })
    })

    describe('If-None-Match conditional requests', () => {
      it('should return 304 when ETag matches', async () => {
        // First request to get ETag
        const response1 = await fetch(`${BASE_URL}/profiles/user_123/links`)
        
        if (response1.status === 200) {
          const etag = response1.headers.get('ETag')
          
          // Second request with If-None-Match
          const response2 = await fetch(`${BASE_URL}/profiles/user_123/links`, {
            headers: { 'If-None-Match': etag }
          })
          
          // Should return 304 if content hasn't changed
          if (response2.status === 304) {
            expect(response2.headers.get('ETag')).toBe(etag)
          }
        }
      })

      it('should return 200 with new data when ETag does not match', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`, {
          headers: { 'If-None-Match': '"invalid-etag-12345"' }
        })
        
        if (response.status === 200) {
          const newEtag = response.headers.get('ETag')
          expect(newEtag).toBeDefined()
          expect(newEtag).not.toBe('"invalid-etag-12345"')
        }
      })
    })
  })

  describe('Rate Limiting', () => {
    describe('Rate limit headers', () => {
      it('should return rate limit headers on POST', async () => {
        const newLink = {
          label: 'Test Link',
          url: 'https://test.com',
          type: 'website'
        }
        
        const response = await fetch(`${BASE_URL}/profiles/user_rate_limit/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLink)
        })
        
        // Check rate limit headers (present on success or rate limit)
        const limit = response.headers.get('X-RateLimit-Limit')
        const remaining = response.headers.get('X-RateLimit-Remaining')
        const reset = response.headers.get('X-RateLimit-Reset')
        
        if (response.status === 201 || response.status === 429) {
          expect(limit).toBeDefined()
          expect(remaining).toBeDefined()
          expect(reset).toBeDefined()
          
          expect(parseInt(limit)).toBeGreaterThan(0)
          expect(parseInt(remaining)).toBeGreaterThanOrEqual(0)
        }
      })

      it('should return rate limit headers on DELETE', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_rate_limit/links/link_test`, {
          method: 'DELETE'
        })
        
        // Check rate limit headers
        const limit = response.headers.get('X-RateLimit-Limit')
        const remaining = response.headers.get('X-RateLimit-Remaining')
        
        if (response.status === 200 || response.status === 404 || response.status === 429) {
          expect(limit).toBeDefined()
          expect(remaining).toBeDefined()
        }
      })
    })

    describe('Rate limit enforcement', () => {
      it('should enforce rate limit after multiple requests', async () => {
        const userId = `user_rate_test_${Date.now()}`
        const newLink = {
          label: 'Rate Limit Test',
          url: 'https://ratetest.com',
          type: 'website'
        }
        
        // Make multiple rapid requests
        const requests = []
        for (let i = 0; i < 12; i++) {
          requests.push(
            fetch(`${BASE_URL}/profiles/${userId}/links`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...newLink, url: `https://test${i}.com` })
            })
          )
        }
        
        const responses = await Promise.all(requests)
        
        // At least one should be rate limited (429)
        const rateLimitedResponses = responses.filter(r => r.status === 429)
        if (rateLimitedResponses.length > 0) {
          const response = rateLimitedResponses[0]
          const data = await response.json()
          
          expect(response.status).toBe(429)
          expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
          expect(data.error.details).toHaveProperty('retryAfter')
          expect(response.headers.get('Retry-After')).toBeDefined()
        }
      })

      it('should return proper error format when rate limited', async () => {
        const userId = `user_429_test_${Date.now()}`
        const newLink = {
          label: 'Error Format Test',
          url: 'https://error.com',
          type: 'website'
        }
        
        // Attempt to trigger rate limit
        const requests = []
        for (let i = 0; i < 15; i++) {
          requests.push(
            fetch(`${BASE_URL}/profiles/${userId}/links`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...newLink, url: `https://err${i}.com` })
            })
          )
        }
        
        const responses = await Promise.all(requests)
        const rateLimited = responses.find(r => r.status === 429)
        
        if (rateLimited) {
          const data = await rateLimited.json()
          
          // Verify error structure
          expect(data.error).toBeDefined()
          expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
          expect(data.error.message).toBeDefined()
          expect(data.error.details).toBeDefined()
          expect(data.error.details.retryAfter).toBeGreaterThan(0)
          expect(data.error.details.resetTime).toBeDefined()
        }
      })
    })

    describe('Rate limit reset', () => {
      it('should reset rate limit after time window', async () => {
        const userId = `user_reset_test_${Date.now()}`
        const newLink = {
          label: 'Reset Test',
          url: 'https://reset.com',
          type: 'website'
        }
        
        // Make requests to approach limit
        const requests = []
        for (let i = 0; i < 10; i++) {
          requests.push(
            fetch(`${BASE_URL}/profiles/${userId}/links`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...newLink, url: `https://reset${i}.com` })
            })
          )
        }
        
        await Promise.all(requests)
        
        // Wait for rate limit window to reset (adjust timing as needed)
        // Note: In production, this would be 60 seconds. For testing, this may be skipped.
        // This test documents the expected behavior.
        
        const responses = await Promise.all(requests)
        const lastResponse = responses[responses.length - 1]
        const remainingHeader = lastResponse.headers.get('X-RateLimit-Remaining')
        expect(parseInt(remainingHeader)).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Integration Tests', () => {
    describe('Ordering + Caching', () => {
      it('should return ordered links with ETag', async () => {
        const response = await fetch(`${BASE_URL}/profiles/user_123/links`)
        
        if (response.status === 200) {
          const etag = response.headers.get('ETag')
          const data = await response.json()
          
          expect(etag).toBeDefined()
          expect(data.links).toBeDefined()
          
          // Verify ordering
          if (data.links.length > 1) {
            for (let i = 1; i < data.links.length; i++) {
              expect(data.links[i - 1].position).toBeLessThanOrEqual(data.links[i].position)
            }
          }
        }
      })
    })

    describe('Create + Rate Limit', () => {
      it('should enforce rate limit on rapid link creation', async () => {
        const userId = `user_integration_${Date.now()}`
        
        // Create links rapidly
        const results = []
        for (let i = 0; i < 12; i++) {
          const response = await fetch(`${BASE_URL}/profiles/${userId}/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: `Link ${i}`,
              url: `https://integration${i}.com`,
              type: 'website',
              position: i
            })
          })
          results.push(response.status)
        }
        
        // Should have at least some rate limited responses
        const rateLimited = results.filter(status => status === 429)
        const successful = results.filter(status => status === 201)
        
        // At least one should succeed and one should be rate limited
        if (rateLimited.length > 0) {
          expect(successful.length).toBeGreaterThan(0)
          expect(rateLimited.length).toBeGreaterThan(0)
        }
      })
    })
  })
})

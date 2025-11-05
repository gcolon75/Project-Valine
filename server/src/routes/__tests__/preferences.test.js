/**
 * Contract tests for User Preferences API
 * Tests the preferences endpoints for theme management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Note: These are contract tests that verify the API contract
// They use the actual Express app but mock the database layer

const BASE_URL = process.env.API_URL || 'http://localhost:5000'
const AUTH_TOKEN = 'dev-token' // Match the token from auth.js stub

describe('User Preferences API', () => {
  describe('GET /api/me/preferences', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`)
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return user preferences when authenticated', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      })
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('theme')
    })

    it('should return theme as light, dark, or null', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      })
      const data = await response.json()
      
      const theme = data.theme
      expect(theme === 'light' || theme === 'dark' || theme === null).toBe(true)
    })
  })

  describe('PATCH /api/me/preferences', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: 'light' })
      })
      
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should accept valid theme value (light)', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: 'light' })
      })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.theme).toBe('light')
    })

    it('should accept valid theme value (dark)', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: 'dark' })
      })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.theme).toBe('dark')
    })

    it('should accept null theme value', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: null })
      })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.theme).toBe(null)
    })

    it('should reject invalid theme value', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: 'invalid' })
      })
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error.code).toBe('INVALID_THEME')
      expect(data.error).toHaveProperty('message')
      expect(data.error).toHaveProperty('details')
      expect(data.error.details.allowedValues).toEqual(['light', 'dark'])
    })

    it('should reject non-string theme value', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: 123 })
      })
      
      expect(response.status).toBe(400)
      expect((await response.json()).error.code).toBe('INVALID_THEME')
    })
  })

  describe('Error Response Format', () => {
    it('should return standardized error format', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: 'invalid' })
      })
      
      const data = await response.json()
      
      // Verify error structure
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
      expect(data.error.message).toBeDefined()
      expect(data.error.details).toBeDefined()
      
      // Verify error content
      expect(typeof data.error.code).toBe('string')
      expect(typeof data.error.message).toBe('string')
      expect(typeof data.error.details).toBe('object')
    })

    it('should return proper error for unauthorized requests', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`)
      const data = await response.json()
      
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(typeof data.error.message).toBe('string')
    })
  })

  describe('Response Structure', () => {
    it('GET should return theme value', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      })
      const data = await response.json()
      
      expect(data).toHaveProperty('theme')
      expect(data.theme === 'light' || data.theme === 'dark' || data.theme === null).toBe(true)
    })

    it('PATCH should return updated theme', async () => {
      const response = await fetch(`${BASE_URL}/api/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ theme: 'light' })
      })
      const data = await response.json()
      
      expect(data).toHaveProperty('theme')
      expect(data.theme).toBe('light')
    })
  })
})

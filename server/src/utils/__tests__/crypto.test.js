import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  generateVerificationToken,
  generateRecoveryCodes,
  hashValue,
  compareValue
} from '../crypto.js'

describe('Crypto Utils', () => {
  describe('generateToken', () => {
    it('should generate a token of default length', () => {
      const token = generateToken()
      expect(token).toBeDefined()
      expect(token.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should generate a token of custom length', () => {
      const token = generateToken(16)
      expect(token.length).toBe(32) // 16 bytes = 32 hex chars
    })

    it('should generate different tokens each time', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashPassword and comparePassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should verify correct password', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      const isValid = await comparePassword(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword456!'
      const hash = await hashPassword(password)
      const isValid = await comparePassword(wrongPassword, hash)
      
      expect(isValid).toBe(false)
    })

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
      expect(await comparePassword(password, hash1)).toBe(true)
      expect(await comparePassword(password, hash2)).toBe(true)
    })
  })

  describe('generateJWT and verifyJWT', () => {
    it('should generate a JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateJWT(payload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should verify valid JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateJWT(payload)
      const decoded = verifyJWT(token)
      
      expect(decoded).toBeDefined()
      expect(decoded.userId).toBe('user-123')
      expect(decoded.email).toBe('test@example.com')
    })

    it('should return null for invalid token', () => {
      const decoded = verifyJWT('invalid-token')
      expect(decoded).toBeNull()
    })

    it('should include expiration in token', () => {
      const payload = { userId: 'user-123' }
      const token = generateJWT(payload)
      const decoded = verifyJWT(token)
      
      expect(decoded.exp).toBeDefined()
      expect(decoded.iat).toBeDefined()
    })
  })

  describe('generateVerificationToken', () => {
    it('should generate token with default expiration', () => {
      const { token, expiresAt } = generateVerificationToken()
      
      expect(token).toBeDefined()
      expect(token.length).toBe(64)
      expect(expiresAt).toBeInstanceOf(Date)
      
      const now = new Date()
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })

    it('should generate token with custom expiration', () => {
      const { token, expiresAt } = generateVerificationToken(1) // 1 hour
      
      expect(token).toBeDefined()
      expect(expiresAt).toBeInstanceOf(Date)
      
      const now = new Date()
      const expectedExpiry = new Date(now.getTime() + 1 * 60 * 60 * 1000)
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(1000)
    })
  })

  describe('generateRecoveryCodes', () => {
    it('should generate default number of codes', async () => {
      const codes = await generateRecoveryCodes()
      
      expect(codes).toHaveLength(8)
      codes.forEach(({ code, hash }) => {
        expect(code).toBeDefined()
        expect(hash).toBeDefined()
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/)
      })
    })

    it('should generate custom number of codes', async () => {
      const codes = await generateRecoveryCodes(5)
      expect(codes).toHaveLength(5)
    })

    it('should generate unique codes', async () => {
      const codes = await generateRecoveryCodes(10)
      const codeStrings = codes.map(c => c.code)
      const uniqueCodes = new Set(codeStrings)
      
      expect(uniqueCodes.size).toBe(10)
    })

    it('should generate verifiable hashes', async () => {
      const codes = await generateRecoveryCodes(3)
      
      for (const { code, hash } of codes) {
        const isValid = await compareValue(code, hash)
        expect(isValid).toBe(true)
      }
    })
  })

  describe('hashValue and compareValue', () => {
    it('should hash and verify a value', async () => {
      const value = 'test-value-123'
      const hash = await hashValue(value)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(value)
      
      const isValid = await compareValue(value, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect value', async () => {
      const value = 'test-value-123'
      const wrongValue = 'wrong-value-456'
      const hash = await hashValue(value)
      
      const isValid = await compareValue(wrongValue, hash)
      expect(isValid).toBe(false)
    })
  })
})

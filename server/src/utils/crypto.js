/**
 * Cryptographic utilities for security features
 */

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const TOKEN_BYTES = 32

/**
 * Generate a secure random token
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
export function generateToken(bytes = TOKEN_BYTES) {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for a user
 * @param {object} payload - User data to encode
 * @param {string} expiresIn - Token expiration (default: 7d)
 * @returns {string} JWT token
 */
export function generateJWT(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
export function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * Generate a cryptographically secure verification token with expiration
 * @param {number} expirationHours - Hours until token expires (default: 24)
 * @returns {object} Token and expiration date
 */
export function generateVerificationToken(expirationHours = 24) {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expirationHours)
  
  return { token, expiresAt }
}

/**
 * Generate recovery codes for 2FA
 * @param {number} count - Number of codes to generate (default: 8)
 * @returns {Promise<Array>} Array of { code, hash } objects
 */
export async function generateRecoveryCodes(count = 8) {
  const codes = []
  
  for (let i = 0; i < count; i++) {
    // Generate a readable code format: XXXX-XXXX-XXXX
    const segments = []
    for (let j = 0; j < 3; j++) {
      const segment = crypto.randomBytes(2).toString('hex').toUpperCase()
      segments.push(segment)
    }
    const code = segments.join('-')
    const hash = await bcrypt.hash(code, 10)
    
    codes.push({ code, hash })
  }
  
  return codes
}

/**
 * Hash a string (for recovery codes, etc.)
 * @param {string} value - Value to hash
 * @returns {Promise<string>} Hashed value
 */
export async function hashValue(value) {
  return bcrypt.hash(value, 10)
}

/**
 * Compare a value with a hash
 * @param {string} value - Plain value
 * @param {string} hash - Hashed value
 * @returns {Promise<boolean>} True if value matches
 */
export async function compareValue(value, hash) {
  return bcrypt.compare(value, hash)
}

export default {
  generateToken,
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  generateVerificationToken,
  generateRecoveryCodes,
  hashValue,
  compareValue
}

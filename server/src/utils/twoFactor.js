/**
 * Two-Factor Authentication (2FA) utilities using TOTP
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || 'dev-encryption-key-change-in-production'
const APP_NAME = process.env.APP_NAME || 'Project Valine'

// Configure TOTP settings
authenticator.options = {
  window: 1, // Allow 1 step before/after current time (30s tolerance)
  step: 30   // 30 second time step
}

/**
 * Encrypt a secret before storing in database
 * @param {string} secret - Plain text secret
 * @returns {string} Encrypted secret
 */
export function encryptSecret(secret) {
  return CryptoJS.AES.encrypt(secret, ENCRYPTION_KEY).toString()
}

/**
 * Decrypt a secret from database
 * @param {string} encryptedSecret - Encrypted secret
 * @returns {string} Plain text secret
 */
export function decryptSecret(encryptedSecret) {
  const bytes = CryptoJS.AES.decrypt(encryptedSecret, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * Generate a new TOTP secret for a user
 * @returns {string} Base32 encoded secret
 */
export function generateSecret() {
  return authenticator.generateSecret()
}

/**
 * Generate a QR code URL for setting up 2FA in authenticator apps
 * @param {string} email - User's email
 * @param {string} secret - TOTP secret
 * @returns {Promise<string>} Data URL for QR code image
 */
export async function generateQRCode(email, secret) {
  const otpauth = authenticator.keyuri(email, APP_NAME, secret)
  return QRCode.toDataURL(otpauth)
}

/**
 * Verify a TOTP token
 * @param {string} token - 6-digit token from authenticator app
 * @param {string} secret - User's TOTP secret (plain or encrypted)
 * @param {boolean} isEncrypted - Whether the secret is encrypted
 * @returns {boolean} True if token is valid
 */
export function verifyToken(token, secret, isEncrypted = true) {
  try {
    const plainSecret = isEncrypted ? decryptSecret(secret) : secret
    return authenticator.verify({ token, secret: plainSecret })
  } catch (error) {
    console.error('2FA verification error:', error)
    return false
  }
}

/**
 * Generate a TOTP token (mainly for testing)
 * @param {string} secret - TOTP secret
 * @param {boolean} isEncrypted - Whether the secret is encrypted
 * @returns {string} 6-digit token
 */
export function generateToken(secret, isEncrypted = false) {
  const plainSecret = isEncrypted ? decryptSecret(secret) : secret
  return authenticator.generate(plainSecret)
}

/**
 * Check if 2FA feature is enabled via feature flag
 * @returns {boolean} True if 2FA is enabled
 */
export function is2FAEnabled() {
  return process.env.FEATURE_2FA_ENABLED === 'true'
}

export default {
  encryptSecret,
  decryptSecret,
  generateSecret,
  generateQRCode,
  verifyToken,
  generateToken,
  is2FAEnabled
}

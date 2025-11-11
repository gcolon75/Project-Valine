// src/services/twoFactorService.js
import apiClient from './api';

/**
 * Check if 2FA feature is enabled
 * @returns {boolean}
 */
export const is2FAEnabled = () => {
  return import.meta.env.VITE_TWO_FACTOR_ENABLED === 'true';
};

/**
 * Enroll in 2FA - get QR code and secret
 * @returns {Promise<{success: boolean, qrCode: string, secret: string, manualEntryKey: string}>}
 */
export const enroll2FA = async () => {
  const { data } = await apiClient.post('/2fa/enroll');
  return data;
};

/**
 * Verify 2FA enrollment with a code
 * @param {string} code - TOTP code from authenticator app
 * @returns {Promise<{success: boolean, recoveryCodes: string[], message: string}>}
 */
export const verifyEnrollment = async (code) => {
  const { data } = await apiClient.post('/2fa/verify-enrollment', { code });
  return data;
};

/**
 * Disable 2FA
 * @param {string} password - User's password for confirmation
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const disable2FA = async (password) => {
  const { data } = await apiClient.post('/2fa/disable', { password });
  return data;
};

/**
 * Get 2FA status for current user
 * @returns {Promise<{enabled: boolean}>}
 */
export const get2FAStatus = async () => {
  const { data } = await apiClient.get('/2fa/status');
  return data;
};

/**
 * Regenerate recovery codes
 * @param {string} password - User's password for confirmation
 * @returns {Promise<{success: boolean, recoveryCodes: string[]}>}
 */
export const regenerateRecoveryCodes = async (password) => {
  const { data } = await apiClient.post('/2fa/regenerate-recovery-codes', { password });
  return data;
};

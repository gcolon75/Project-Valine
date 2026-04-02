import { apiClient } from './api.js';

/**
 * Send a verification code to the given phone number.
 * @param {string} phone - E.164 format, e.g. "+15551234567"
 */
export async function sendVerificationCode(phone) {
  const { data } = await apiClient.post('/api/phone/send-code', { phone });
  return data;
}

/**
 * Verify the code sent to the given phone number.
 * @param {string} phone - E.164 format
 * @param {string} code  - 6-digit code
 */
export async function verifyPhoneCode(phone, code) {
  const { data } = await apiClient.post('/api/phone/verify-code', { phone, code });
  return data;
}

/**
 * Admin: send an arbitrary SMS to a user with a verified phone.
 * @param {string} userId  - Target user ID
 * @param {string} message - SMS body (max 1600 chars)
 */
export async function adminSendSMS(userId, message) {
  const { data } = await apiClient.post('/api/phone/admin/send', { userId, message });
  return data;
}

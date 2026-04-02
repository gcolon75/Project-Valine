/**
 * Phone verification handlers
 * - sendCode: send a 6-digit OTP to the user's phone via Twilio
 * - verifyCode: confirm the OTP and mark phone as verified
 * - adminSend: admin-only, send arbitrary SMS to a verified user
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../db/client.js';
import { getAuthenticatedUserId } from '../utils/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { json, error } from '../utils/headers.js';
import { sendSMS } from '../utils/twilio.js';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const SENDS_PER_HOUR = 3;

/** Basic E.164 phone number validation */
function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/**
 * POST /api/phone/send-code
 * Body: { phone: "+15551234567" }
 * Generates a 6-digit OTP, stores a hashed copy, and sends via SMS.
 * Rate limited to SENDS_PER_HOUR requests per hour per user.
 */
export async function sendCode(event) {
  const userId = getAuthenticatedUserId(event);
  if (!userId) return error(401, 'Unauthorized');

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { phone } = body;
  if (!phone) return error(400, 'phone is required');
  if (!isValidPhone(phone)) {
    return error(400, 'Invalid phone number. Use E.164 format, e.g. +15551234567');
  }

  const prisma = getPrisma();
  if (!prisma) return error(503, 'Database unavailable');

  // Rate limit: max SENDS_PER_HOUR sends in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSends = await prisma.phoneVerificationCode.count({
    where: { userId, createdAt: { gte: oneHourAgo } },
  });
  if (recentSends >= SENDS_PER_HOUR) {
    return error(429, `Too many verification requests. Please wait before requesting another code.`);
  }

  // Delete any existing pending codes for this user
  await prisma.phoneVerificationCode.deleteMany({ where: { userId } });

  // Generate and hash a 6-digit code
  const plainCode = String(crypto.randomInt(100000, 999999));
  const hashedCode = await bcrypt.hash(plainCode, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.phoneVerificationCode.create({
    data: { userId, code: hashedCode, phone, expiresAt },
  });

  try {
    await sendSMS(phone, `Your verification code is ${plainCode}. It expires in ${CODE_TTL_MINUTES} minutes.`);
  } catch (smsErr) {
    console.error('[phone/send-code] SMS send failed:', smsErr);
    // Clean up the record so user can retry
    await prisma.phoneVerificationCode.deleteMany({ where: { userId } });
    return error(502, 'Failed to send SMS. Please try again.');
  }

  return json({ success: true, message: 'Verification code sent' });
}

/**
 * POST /api/phone/verify-code
 * Body: { phone: "+15551234567", code: "123456" }
 * Validates the OTP and marks the user's phone as verified.
 */
export async function verifyCode(event) {
  const userId = getAuthenticatedUserId(event);
  if (!userId) return error(401, 'Unauthorized');

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { phone, code } = body;
  if (!phone || !code) return error(400, 'phone and code are required');

  const prisma = getPrisma();
  if (!prisma) return error(503, 'Database unavailable');

  const record = await prisma.phoneVerificationCode.findFirst({
    where: { userId },
  });

  if (!record) {
    return error(400, 'No pending verification found. Please request a new code.');
  }

  // Check expiry
  if (new Date() > record.expiresAt) {
    await prisma.phoneVerificationCode.delete({ where: { id: record.id } });
    return error(410, 'Verification code has expired. Please request a new one.');
  }

  // Check phone matches
  if (record.phone !== phone) {
    return error(400, 'Phone number does not match. Please request a new code.');
  }

  // Increment attempt counter
  const attempts = record.attempts + 1;
  if (attempts > MAX_ATTEMPTS) {
    await prisma.phoneVerificationCode.delete({ where: { id: record.id } });
    return error(429, 'Too many incorrect attempts. Please request a new code.');
  }

  const codeMatches = await bcrypt.compare(code, record.code);
  if (!codeMatches) {
    await prisma.phoneVerificationCode.update({
      where: { id: record.id },
      data: { attempts },
    });
    const remaining = MAX_ATTEMPTS - attempts;
    return error(400, remaining > 0
      ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      : 'Too many incorrect attempts. Please request a new code.'
    );
  }

  // Code is correct — save phone and mark verified
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: true },
    }),
    prisma.phoneVerificationCode.delete({ where: { id: record.id } }),
  ]);

  return json({ success: true, verified: true });
}

/**
 * POST /api/phone/admin/send
 * Body: { userId: "...", message: "..." }
 * Admin-only: send an arbitrary SMS to a user with a verified phone number.
 */
export async function adminSend(event) {
  const authError = await requireAdmin(event);
  if (authError) return authError;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { userId: targetUserId, message } = body;
  if (!targetUserId) return error(400, 'userId is required');
  if (!message || !message.trim()) return error(400, 'message is required');
  if (message.length > 1600) return error(400, 'message must be 1600 characters or less');

  const prisma = getPrisma();
  if (!prisma) return error(503, 'Database unavailable');

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, phone: true, phoneVerified: true, displayName: true },
  });

  if (!target) return error(404, 'User not found');
  if (!target.phone || !target.phoneVerified) {
    return error(422, 'User does not have a verified phone number');
  }

  try {
    const result = await sendSMS(target.phone, message);
    return json({ success: true, sid: result.sid });
  } catch (smsErr) {
    console.error('[phone/admin/send] SMS send failed:', smsErr);
    return error(502, 'Failed to send SMS');
  }
}

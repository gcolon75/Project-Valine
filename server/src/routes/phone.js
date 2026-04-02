/**
 * Phone verification routes (local Express dev server)
 * POST /api/phone/send-code    — send 6-digit OTP via Twilio
 * POST /api/phone/verify-code  — confirm OTP, mark phone verified
 * POST /api/phone/admin/send   — admin-only, send arbitrary SMS to a user
 */

import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../utils/prismaClient.js';
import { authenticate } from '../middleware/auth.js';
import { sendSMS } from '../utils/twilio.js';

const router = Router();

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const SENDS_PER_HOUR = 3;

/** Basic E.164 phone number validation */
function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/** Check if the authenticated user is an admin */
async function isAdmin(prisma, userId) {
  const adminIds = (process.env.ADMIN_ROLE_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (adminIds.length > 0) return adminIds.includes(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user && (user.role === 'admin' || user.role === 'moderator');
}

/**
 * POST /api/phone/send-code
 * Body: { phone: "+15551234567" }
 */
router.post('/send-code', authenticate, async (req, res) => {
  const { phone } = req.body || {};

  if (!phone) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'phone is required' });
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid phone number. Use E.164 format, e.g. +15551234567' });
  }

  const prisma = getPrismaClient();

  // Rate limit: max SENDS_PER_HOUR in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSends = await prisma.phoneVerificationCode.count({
    where: { userId: req.userId, createdAt: { gte: oneHourAgo } },
  });
  if (recentSends >= SENDS_PER_HOUR) {
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many verification requests. Please wait before requesting another code.' });
  }

  // Clear existing codes
  await prisma.phoneVerificationCode.deleteMany({ where: { userId: req.userId } });

  const plainCode = String(crypto.randomInt(100000, 999999));
  const hashedCode = await bcrypt.hash(plainCode, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.phoneVerificationCode.create({
    data: { userId: req.userId, code: hashedCode, phone, expiresAt },
  });

  try {
    await sendSMS(phone, `Your verification code is ${plainCode}. It expires in ${CODE_TTL_MINUTES} minutes.`);
  } catch (err) {
    console.error('[phone/send-code] SMS send failed:', err);
    await prisma.phoneVerificationCode.deleteMany({ where: { userId: req.userId } });
    return res.status(502).json({ error: 'SMS_FAILED', message: 'Failed to send SMS. Please try again.' });
  }

  return res.json({ success: true, message: 'Verification code sent' });
});

/**
 * POST /api/phone/verify-code
 * Body: { phone: "+15551234567", code: "123456" }
 */
router.post('/verify-code', authenticate, async (req, res) => {
  const { phone, code } = req.body || {};

  if (!phone || !code) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'phone and code are required' });
  }

  const prisma = getPrismaClient();

  const record = await prisma.phoneVerificationCode.findFirst({ where: { userId: req.userId } });
  if (!record) {
    return res.status(400).json({ error: 'NO_PENDING_CODE', message: 'No pending verification found. Please request a new code.' });
  }

  if (new Date() > record.expiresAt) {
    await prisma.phoneVerificationCode.delete({ where: { id: record.id } });
    return res.status(410).json({ error: 'CODE_EXPIRED', message: 'Verification code has expired. Please request a new one.' });
  }

  if (record.phone !== phone) {
    return res.status(400).json({ error: 'PHONE_MISMATCH', message: 'Phone number does not match. Please request a new code.' });
  }

  const attempts = record.attempts + 1;
  if (attempts > MAX_ATTEMPTS) {
    await prisma.phoneVerificationCode.delete({ where: { id: record.id } });
    return res.status(429).json({ error: 'MAX_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new code.' });
  }

  const codeMatches = await bcrypt.compare(code, record.code);
  if (!codeMatches) {
    await prisma.phoneVerificationCode.update({ where: { id: record.id }, data: { attempts } });
    const remaining = MAX_ATTEMPTS - attempts;
    return res.status(400).json({
      error: 'INVALID_CODE',
      message: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.',
    });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.userId }, data: { phone, phoneVerified: true } }),
    prisma.phoneVerificationCode.delete({ where: { id: record.id } }),
  ]);

  return res.json({ success: true, verified: true });
});

/**
 * POST /api/phone/admin/send
 * Body: { userId: "...", message: "..." }
 * Admin only.
 */
router.post('/admin/send', authenticate, async (req, res) => {
  const prisma = getPrismaClient();

  const adminCheck = await isAdmin(prisma, req.userId);
  if (!adminCheck) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
  }

  const { userId: targetUserId, message } = req.body || {};
  if (!targetUserId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'userId is required' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'message is required' });
  if (message.length > 1600) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'message must be 1600 characters or less' });

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, phone: true, phoneVerified: true },
  });

  if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
  if (!target.phone || !target.phoneVerified) {
    return res.status(422).json({ error: 'NO_VERIFIED_PHONE', message: 'User does not have a verified phone number' });
  }

  try {
    const result = await sendSMS(target.phone, message);
    return res.json({ success: true, sid: result.sid });
  } catch (err) {
    console.error('[phone/admin/send] SMS send failed:', err);
    return res.status(502).json({ error: 'SMS_FAILED', message: 'Failed to send SMS' });
  }
});

export default router;

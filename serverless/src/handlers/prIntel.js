/**
 * PR Intelligence Backend Hook (Phase 4)
 * Provides endpoints for GitHub Actions to submit PR metadata and analysis
 */

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import crypto from 'crypto';

const PR_INTEL_ENABLED = process.env.PR_INTEL_ENABLED === 'true';
const PR_INTEL_WEBHOOK_SECRET = process.env.PR_INTEL_WEBHOOK_SECRET || '';

/**
 * Verify HMAC signature for webhook security
 * @param {string} payload - Request body as string
 * @param {string} signature - HMAC signature from header
 * @returns {boolean} True if signature is valid
 */
const verifyHmacSignature = (payload, signature) => {
  if (!PR_INTEL_WEBHOOK_SECRET) {
    console.warn('[PR Intel] No webhook secret configured');
    return false;
  }

  if (!signature) {
    return false;
  }

  // Expected format: "sha256=<hash>"
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const providedHash = parts[1];
  const computedHash = crypto
    .createHmac('sha256', PR_INTEL_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(providedHash),
    Buffer.from(computedHash)
  );
};

/**
 * POST /internal/pr-intel/ingest
 * Ingest PR metadata from GitHub Actions
 * Body: { prNumber, changedFilesCount, sensitivePathsCount, riskScore, metadata? }
 * Header: X-Hub-Signature-256: sha256=<hmac>
 */
export const ingestPRIntel = async (event) => {
  try {
    if (!PR_INTEL_ENABLED) {
      return error('PR Intelligence feature is not enabled', 404);
    }

    // Verify HMAC signature
    const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'];
    const payload = event.body || '';

    if (!verifyHmacSignature(payload, signature)) {
      return error('Invalid HMAC signature', 403);
    }

    const body = JSON.parse(payload);
    const { prNumber, changedFilesCount, sensitivePathsCount, riskScore, metadata } = body;

    // Validate required fields
    if (
      typeof prNumber !== 'number' ||
      typeof changedFilesCount !== 'number' ||
      typeof sensitivePathsCount !== 'number' ||
      typeof riskScore !== 'number'
    ) {
      return error('Missing or invalid required fields', 400);
    }

    const prisma = getPrisma();

    // Create PR intelligence record
    const prIntel = await prisma.pRIntelligence.create({
      data: {
        prNumber,
        changedFilesCount,
        sensitivePathsCount,
        riskScore,
        metadata: metadata || null,
      },
    });

    return json({
      message: 'PR intelligence ingested successfully',
      id: prIntel.id,
      prNumber: prIntel.prNumber,
    }, 201);
  } catch (e) {
    console.error('PR intel ingest error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /internal/pr-intel/:prNumber
 * Get PR intelligence data for a specific PR
 */
export const getPRIntel = async (event) => {
  try {
    if (!PR_INTEL_ENABLED) {
      return error('PR Intelligence feature is not enabled', 404);
    }

    const { prNumber } = event.pathParameters || {};

    if (!prNumber) {
      return error('prNumber is required', 400);
    }

    const prisma = getPrisma();

    // Get all records for this PR (there may be multiple analysis runs)
    const records = await prisma.pRIntelligence.findMany({
      where: {
        prNumber: parseInt(prNumber, 10),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (records.length === 0) {
      return error('No PR intelligence found for this PR', 404);
    }

    return json({
      prNumber: parseInt(prNumber, 10),
      records,
      latestRiskScore: records[0].riskScore,
      totalAnalyses: records.length,
    });
  } catch (e) {
    console.error('Get PR intel error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

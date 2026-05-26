// Script Feedback Service — paid marketplace (PDF Part 2)
// Writer pays $0.50/page → Reader earns $0.25/page → Joint keeps $0.25/page.
// Admin gates each request before it goes to readers; 24h reader deadline.

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import { createNotification } from './notifications.js';
import Stripe from 'stripe';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });

// Notify the writer at key lifecycle points.
async function notifyWriter(prisma, { type, message, writerId, triggererId, requestId, title }) {
  try {
    await createNotification(prisma, {
      type,
      message,
      recipientId: writerId,
      triggererId: triggererId || null,
      metadata: {
        scriptFeedbackRequestId: requestId,
        title,
      },
    });
  } catch (e) {
    console.error('[scriptFeedback] notifyWriter failed (non-fatal)', e);
  }
}

async function notifyReader(prisma, { type, message, readerId, triggererId, requestId, title }) {
  try {
    await createNotification(prisma, {
      type,
      message,
      recipientId: readerId,
      triggererId: triggererId || null,
      metadata: { scriptFeedbackRequestId: requestId, title },
    });
  } catch (e) {
    console.error('[scriptFeedback] notifyReader failed (non-fatal)', e);
  }
}

async function notifyAdmins(prisma, { type, message, triggererId, requestId, title }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    await Promise.all(admins.map((admin) =>
      createNotification(prisma, {
        type,
        message,
        recipientId: admin.id,
        triggererId: triggererId || null,
        metadata: { scriptFeedbackRequestId: requestId, title },
      })
    ));
  } catch (e) {
    console.error('[scriptFeedback] notifyAdmins failed (non-fatal)', e);
  }
}

const PRICE_PER_PAGE_CENTS = 50;          // writer pays 50¢/page
const READER_EARNINGS_PER_PAGE_CENTS = 25; // reader gets 25¢/page
const PLATFORM_FEE_PER_PAGE_CENTS = 25;    // Joint keeps 25¢/page
const MIN_PAGE_COUNT = 1;
const MAX_PAGE_COUNT = 500; // sanity cap
const READER_DEADLINE_HOURS = 24;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function normalizeFrontendUrl(raw) {
  const fallback = 'http://localhost:5173';
  let url = (raw || '').trim();
  if (!url) return fallback;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

async function getAuthUser(event, prisma) {
  const id = getUserIdFromEvent(event);
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      role: true,
      isReader: true,
      pendingPayoutCents: true,
      plan: true,
      subscriptionStatus: true,
      monthlyFreeEvalUsedAt: true,
    },
  });
}

/**
 * True if the user has an active Emerald subscription AND hasn't used
 * their free eval in the last 3 months (evals do not stack).
 */
export function isEligibleForFreeEval(user, now = new Date()) {
  if (!user) return false;
  if (user.plan !== 'emerald') return false;
  if (!['active', 'trialing'].includes(user.subscriptionStatus || '')) return false;
  if (!user.monthlyFreeEvalUsedAt) return true;
  const used = new Date(user.monthlyFreeEvalUsedAt);
  const nextEligible = new Date(used);
  nextEligible.setUTCMonth(used.getUTCMonth() + 3);
  return now >= nextEligible;
}

function authorSelect() {
  return {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      plan: true,
    },
  };
}

/**
 * POST /script-feedback
 * Writer submits a script for paid feedback.
 * Body: { title, scriptUrl, pageCount, useFreeEval?: boolean }
 *
 * Behavior:
 *   - useFreeEval=true AND eligible -> skip Stripe; create directly as
 *     pending_approval; mark monthlyFreeEvalUsedAt. Joint absorbs reader cost.
 *   - Otherwise -> create as pending_payment and return a Stripe checkout URL.
 */
export const submitRequest = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return error(400, 'Invalid JSON body');
    }

    const { title, scriptUrl, pageCount, useFreeEval, mediaId, requireWatermark, anonymousSubmission, scriptType } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return error(400, 'Title is required');
    }
    const VALID_SCRIPT_TYPES = ['Screenplay', 'Playwright', 'Book'];
    const safeScriptType = VALID_SCRIPT_TYPES.includes(scriptType) ? scriptType : 'Screenplay';
    if (!scriptUrl || typeof scriptUrl !== 'string') {
      return error(400, 'scriptUrl is required');
    }
    const pages = parseInt(pageCount, 10);
    if (!Number.isFinite(pages) || pages < MIN_PAGE_COUNT || pages > MAX_PAGE_COUNT) {
      return error(400, `pageCount must be between ${MIN_PAGE_COUNT} and ${MAX_PAGE_COUNT}`);
    }

    const readerEarningsCents = pages * READER_EARNINGS_PER_PAGE_CENTS;
    const platformFeeCents = pages * PLATFORM_FEE_PER_PAGE_CENTS;
    const wantsWatermark = !!requireWatermark;
    const wantsAnonymous = !!anonymousSubmission;
    const mediaIdSafe = typeof mediaId === 'string' ? mediaId : null;

    // ── Free Emerald eval path ────────────────────────────────────────────
    if (useFreeEval) {
      if (!isEligibleForFreeEval(auth)) {
        return error(403, 'Not eligible for a free evaluation — your next free eval is not yet available');
      }

      // Use a transaction to atomically claim the monthly free slot AND create
      // the request, so a double-submit can't burn through it twice.
      const result = await prisma.$transaction(async (tx) => {
        // Re-check inside the transaction with a fresh read
        const fresh = await tx.user.findUnique({
          where: { id: auth.id },
          select: {
            plan: true,
            subscriptionStatus: true,
            monthlyFreeEvalUsedAt: true,
          },
        });
        if (!isEligibleForFreeEval(fresh)) {
          return { error: 'Free evaluation already used — next one available in 3 months', status: 409 };
        }

        const now = new Date();
        await tx.user.update({
          where: { id: auth.id },
          data: { monthlyFreeEvalUsedAt: now },
        });

        const created = await tx.scriptFeedbackRequest.create({
          data: {
            writerId: auth.id,
            title: title.trim().slice(0, 200),
            scriptType: safeScriptType,
            scriptUrl,
            mediaId: mediaIdSafe,
            pageCount: pages,
            requireWatermark: wantsWatermark,
            anonymousSubmission: wantsAnonymous,
            totalPaidCents: 0,           // writer pays nothing
            readerEarningsCents,         // reader still earns
            platformFeeCents: 0,         // Joint absorbs the reader cost
            status: 'pending_approval',  // skip payment, straight to admin queue
          },
        });

        return { request: created };
      });

      if (result.error) return error(result.status, result.error);
      return json({ request: result.request, useFreeEval: true });
    }

    // ── Paid path ─────────────────────────────────────────────────────────
    const stripe = getStripe();
    if (!stripe) return error(503, 'Payment service not configured');

    const totalPaidCents = pages * PRICE_PER_PAGE_CENTS;

    const created = await prisma.scriptFeedbackRequest.create({
      data: {
        writerId: auth.id,
        title: title.trim().slice(0, 200),
        scriptType: safeScriptType,
        scriptUrl,
        mediaId: mediaIdSafe,
        pageCount: pages,
        requireWatermark: wantsWatermark,
        totalPaidCents,
        readerEarningsCents,
        platformFeeCents,
        status: 'pending_payment',
      },
    });

    const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Script Feedback — ${created.title}`,
              description: `Professional script review · ${pages} pages · $${(totalPaidCents / 100).toFixed(2)}`,
            },
            unit_amount: totalPaidCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: 'script_feedback',
        requestId: created.id,
        writerId: auth.id,
      },
      success_url: `${frontendUrl}/feedback-request/${created.id}?payment=success`,
      cancel_url: `${frontendUrl}/feedback-request/new?payment=cancelled`,
    });

    await prisma.scriptFeedbackRequest.update({
      where: { id: created.id },
      data: { stripeSessionId: session.id },
    });

    return json({ checkoutUrl: session.url, requestId: created.id });
  } catch (e) {
    console.error('[scriptFeedback] submitRequest error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /script-feedback?role=mine|available|admin
 * Lists requests filtered by role.
 *   mine      — requests this user submitted (writer view)
 *   available — approved + unclaimed (reader pool; requires isReader)
 *   admin     — pending_approval queue (requires role=admin)
 */
export const listRequests = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const role = (event.queryStringParameters?.role || 'mine').toLowerCase();

    let where;
    let orderBy = { createdAt: 'desc' };

    if (role === 'available') {
      if (!auth.isReader) {
        return error(403, 'Reader access required');
      }
      where = { status: 'approved', readerId: null };
      orderBy = { createdAt: 'asc' }; // FIFO for fairness
    } else if (role === 'mine-as-reader') {
      if (!auth.isReader) return error(403, 'Reader access required');
      where = { readerId: auth.id };
    } else if (role === 'admin') {
      if (auth.role !== 'admin') return error(403, 'Admin access required');
      where = { status: 'pending_approval' };
    } else if (role === 'admin-assigned') {
      if (auth.role !== 'admin') return error(403, 'Admin access required');
      where = { readerId: { not: null }, status: { in: ['accepted', 'reader_submitted', 'completed'] } };
    } else if (role === 'admin-submitted') {
      if (auth.role !== 'admin') return error(403, 'Admin access required');
      where = { status: 'reader_submitted' };
    } else {
      // default: mine (as writer)
      where = { writerId: auth.id };
    }

    const requests = await prisma.scriptFeedbackRequest.findMany({
      where,
      orderBy,
      include: {
        writer: authorSelect(),
        reader: authorSelect(),
      },
    });

    return json({ requests });
  } catch (e) {
    console.error('[scriptFeedback] listRequests error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /script-feedback/:id
 * Returns one request with annotations + summary notes.
 * Access:
 *   - writer (always)
 *   - assigned reader (always)
 *   - admin (always)
 *   - any reader can see "approved" + unclaimed (so they can decide to accept)
 */
export const getRequest = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const request = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      include: {
        writer: authorSelect(),
        reader: authorSelect(),
        annotations: {
          include: { author: authorSelect() },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) return error(404, 'Request not found');

    const isWriter = request.writerId === auth.id;
    const isReader = request.readerId === auth.id;
    const isAdmin = auth.role === 'admin';
    const isOpenForReaders =
      request.status === 'approved' && !request.readerId && auth.isReader;

    if (!isWriter && !isReader && !isAdmin && !isOpenForReaders) {
      return error(403, 'Forbidden');
    }

    // Generate a fresh pre-signed S3 URL for the script PDF so the frontend
    // never needs to call a separate endpoint just to get a viewable URL.
    let scriptPresignedUrl = null;
    if (request.mediaId) {
      try {
        const media = await prisma.media.findUnique({
          where: { id: request.mediaId },
          select: { s3Key: true },
        });
        if (media?.s3Key) {
          const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: media.s3Key });
          scriptPresignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
        }
      } catch (presignErr) {
        console.error('[scriptFeedback] presign failed (non-fatal)', presignErr);
      }
    }

    // Hide annotations from the writer until feedback is complete
    let responseRequest = { ...request, scriptPresignedUrl };
    if (isWriter && !isAdmin && request.status !== 'completed') {
      responseRequest = { ...responseRequest, annotations: [] };
    }

    // Mask the writer's identity for readers when anonymousSubmission is set
    if (request.anonymousSubmission && !isWriter && !isAdmin) {
      responseRequest = {
        ...responseRequest,
        writer: {
          id: request.writer?.id,
          username: null,
          displayName: 'Anonymous',
          avatar: null,
          plan: null,
        },
      };
    }

    return json({ request: responseRequest });
  } catch (e) {
    console.error('[scriptFeedback] getRequest error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /script-feedback/:id/script-url
 * Returns a fresh pre-signed S3 URL for the script PDF.
 * Access: writer, assigned reader, admin.
 */
export const getScriptUrl = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const request = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      select: { writerId: true, readerId: true, mediaId: true, requireWatermark: true, scriptUrl: true },
    });
    if (!request) return error(404, 'Request not found');

    const isWriter = request.writerId === auth.id;
    const isReader = request.readerId === auth.id;
    const isAdmin = auth.role === 'admin';
    if (!isWriter && !isReader && !isAdmin) return error(403, 'Forbidden');

    let url = null;

    // Try to generate a fresh pre-signed URL from the stored media record
    if (request.mediaId) {
      try {
        const media = await prisma.media.findUnique({
          where: { id: request.mediaId },
          select: { s3Key: true },
        });
        if (media?.s3Key) {
          const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: media.s3Key });
          url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
        }
      } catch (e) {
        console.error('[scriptFeedback] getScriptUrl presign failed', e);
      }
    }

    // Fall back to the raw scriptUrl stored at submission time
    if (!url && request.scriptUrl) {
      url = request.scriptUrl;
    }

    if (!url) return error(404, 'Script URL not available');

    return json({ url, requireWatermark: request.requireWatermark && isReader });
  } catch (e) {
    console.error('[scriptFeedback] getScriptUrl error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/approve   (admin only)
 * Moves a paid request from pending_approval → approved (visible to readers).
 */
export const approveRequest = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const existing = await prisma.scriptFeedbackRequest.findUnique({ where: { id } });
    if (!existing) return error(404, 'Request not found');
    if (existing.status !== 'pending_approval') {
      return error(400, `Cannot approve a request in status: ${existing.status}`);
    }

    const updated = await prisma.scriptFeedbackRequest.update({
      where: { id },
      data: {
        status: 'approved',
        adminApprovedBy: auth.id,
        adminApprovedAt: new Date(),
      },
    });

    await notifyWriter(prisma, {
      type: 'SCRIPT_FEEDBACK_APPROVED',
      message: `Your script "${updated.title}" has been approved and is now in the reader pool.`,
      writerId: updated.writerId,
      triggererId: auth.id,
      requestId: updated.id,
      title: updated.title,
    });

    return json({ request: updated });
  } catch (e) {
    console.error('[scriptFeedback] approveRequest error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/deny   (admin only)
 * Denies a paid request and refunds the writer.
 * Body: { reason?: string }
 */
export const denyRequest = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {}
    const reason = (body.reason || '').slice(0, 500) || null;

    const existing = await prisma.scriptFeedbackRequest.findUnique({ where: { id } });
    if (!existing) return error(404, 'Request not found');
    if (!['pending_approval', 'approved'].includes(existing.status)) {
      return error(400, `Cannot deny a request in status: ${existing.status}`);
    }

    // Refund via Stripe only if there was a real payment (paid path).
    // Free Emerald evaluations have totalPaidCents=0 and no payment intent,
    // so we just mark them denied without a refund call.
    const stripe = getStripe();
    let refundedAt = null;
    const isPaidRequest = existing.totalPaidCents > 0 && existing.stripePaymentIntentId;

    if (isPaidRequest && stripe) {
      try {
        await stripe.refunds.create({
          payment_intent: existing.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });
        refundedAt = new Date();
      } catch (refundErr) {
        console.error('[scriptFeedback] refund failed', refundErr);
        // continue — admin can still deny and process refund manually
      }
    }

    const updated = await prisma.scriptFeedbackRequest.update({
      where: { id },
      data: {
        status: refundedAt ? 'refunded' : 'denied',
        denyReason: reason,
        refundedAt,
      },
    });

    return json({ request: updated });
  } catch (e) {
    console.error('[scriptFeedback] denyRequest error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/accept   (reader only)
 * Reader claims an approved + unclaimed request. Starts the 24h deadline.
 */
export const acceptRequest = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (!auth.isReader) return error(403, 'Reader access required');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    // Use a transaction to prevent two readers claiming the same job.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.scriptFeedbackRequest.findUnique({ where: { id } });
      if (!existing) return { error: 'Request not found', status: 404 };
      if (existing.status !== 'approved') {
        return { error: `Cannot accept a request in status: ${existing.status}`, status: 400 };
      }
      if (existing.readerId) {
        return { error: 'Already claimed by another reader', status: 409 };
      }
      if (existing.writerId === auth.id) {
        return { error: 'You cannot review your own script', status: 400 };
      }

      const now = new Date();
      const deadlineAt = new Date(now.getTime() + READER_DEADLINE_HOURS * 60 * 60 * 1000);

      const updated = await tx.scriptFeedbackRequest.update({
        where: { id },
        data: {
          readerId: auth.id,
          status: 'accepted',
          acceptedAt: now,
          deadlineAt,
        },
      });
      return { request: updated };
    });

    if (result.error) return error(result.status, result.error);

    await notifyWriter(prisma, {
      type: 'SCRIPT_FEEDBACK_ACCEPTED',
      message: `${auth.displayName || auth.username || 'A reader'} accepted your script "${result.request.title}" and is writing feedback now.`,
      writerId: result.request.writerId,
      triggererId: auth.id,
      requestId: result.request.id,
      title: result.request.title,
    });

    return json({ request: result.request });
  } catch (e) {
    console.error('[scriptFeedback] acceptRequest error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/submit-notes   (assigned reader only)
 * Submits the summary notes and finalizes the review.
 * Body: { summaryNotes: string }
 * Side effects:
 *   - status -> completed
 *   - reader's pendingPayoutCents += readerEarningsCents
 */
export const submitNotes = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return error(400, 'Invalid JSON body');
    }

    const summaryNotes = (body.summaryNotes || '').trim();
    if (summaryNotes.length > 50000) return error(400, 'summaryNotes too long (max 50000 chars)');

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.scriptFeedbackRequest.findUnique({ where: { id } });
      if (!existing) return { error: 'Request not found', status: 404 };
      if (existing.readerId !== auth.id) return { error: 'Not your assigned request', status: 403 };
      if (existing.status !== 'accepted') {
        return { error: `Cannot submit notes for status: ${existing.status}`, status: 400 };
      }

      const updated = await tx.scriptFeedbackRequest.update({
        where: { id },
        data: {
          status: 'reader_submitted',
          summaryNotes,
          revisionNote: null, // clear any previous revision note on re-submission
        },
      });

      return { request: updated };
    });

    if (result.error) return error(result.status, result.error);

    await notifyAdmins(prisma, {
      type: 'SCRIPT_FEEDBACK_SUBMITTED',
      message: `A reader has submitted feedback for "${result.request.title}" — ready for admin review.`,
      triggererId: auth.id,
      requestId: result.request.id,
      title: result.request.title,
    });

    return json({ request: result.request });
  } catch (e) {
    console.error('[scriptFeedback] submitNotes error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/reassign   (admin only)
 * Body: { readerId: string | null }
 * - readerId provided: validates isReader=true, reassigns the request (status='accepted')
 * - readerId null: unassigns (status back to 'approved', clears acceptedAt/deadlineAt)
 */
export const reassignReader = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const { readerId } = body;

    const existing = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      select: { id: true, status: true, readerId: true },
    });
    if (!existing) return error(404, 'Request not found');
    if (!['approved', 'accepted', 'reader_submitted'].includes(existing.status)) {
      return error(400, 'Can only reassign requests with status approved, accepted, or reader_submitted');
    }

    let updateData;
    if (readerId) {
      // Validate the new reader
      const newReader = await prisma.user.findUnique({
        where: { id: readerId },
        select: { id: true, isReader: true },
      });
      if (!newReader) return error(404, 'User not found');
      if (!newReader.isReader) return error(400, 'User is not an approved reader');

      const now = new Date();
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      updateData = {
        readerId,
        status: 'accepted',
        acceptedAt: now,
        deadlineAt: deadline,
      };
    } else {
      // Unassign — return to reader pool
      updateData = {
        readerId: null,
        status: 'approved',
        acceptedAt: null,
        deadlineAt: null,
      };
    }

    const updated = await prisma.scriptFeedbackRequest.update({
      where: { id },
      data: updateData,
      include: {
        writer: { select: { id: true, displayName: true, username: true, avatar: true, plan: true } },
        reader: { select: { id: true, displayName: true, username: true, avatar: true } },
      },
    });

    return json({ request: updated });
  } catch (e) {
    console.error('[scriptFeedback] reassignReader error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/approve-submission   (admin only)
 * Approves the reader's submitted feedback — marks it completed and notifies the writer.
 */
export const approveSubmission = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.scriptFeedbackRequest.findUnique({ where: { id } });
      if (!existing) return { error: 'Request not found', status: 404 };
      if (existing.status !== 'reader_submitted') {
        return { error: `Cannot approve submission in status: ${existing.status}`, status: 400 };
      }

      const updated = await tx.scriptFeedbackRequest.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() },
        include: {
          writer: { select: { id: true, displayName: true, username: true, avatar: true, plan: true } },
          reader: { select: { id: true, displayName: true, username: true, avatar: true } },
        },
      });

      // Credit reader's pending payout
      await tx.user.update({
        where: { id: existing.readerId },
        data: { pendingPayoutCents: { increment: existing.readerEarningsCents } },
      });

      return { request: updated, writerId: existing.writerId, readerId: existing.readerId };
    });

    if (result.error) return error(result.status, result.error);

    await notifyWriter(prisma, {
      type: 'SCRIPT_FEEDBACK_COMPLETED',
      message: `Feedback for "${result.request.title}" is ready to view.`,
      writerId: result.writerId,
      triggererId: auth.id,
      requestId: result.request.id,
      title: result.request.title,
    });

    return json({ request: result.request });
  } catch (e) {
    console.error('[scriptFeedback] approveSubmission error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/:id/request-revision   (admin only)
 * Body: { note: string }
 * Sends feedback back to the reader for revision — resets deadline, saves note, notifies reader.
 */
export const requestRevision = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const note = (body.note || '').trim();
    if (!note) return error(400, 'A revision note is required');

    const existing = await prisma.scriptFeedbackRequest.findUnique({ where: { id } });
    if (!existing) return error(404, 'Request not found');
    if (existing.status !== 'reader_submitted') {
      return error(400, `Cannot request revision in status: ${existing.status}`);
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const updated = await prisma.scriptFeedbackRequest.update({
      where: { id },
      data: {
        status: 'accepted',
        revisionNote: note,
        acceptedAt: now,
        deadlineAt: deadline,
      },
      include: {
        writer: { select: { id: true, displayName: true, username: true, avatar: true, plan: true } },
        reader: { select: { id: true, displayName: true, username: true, avatar: true } },
      },
    });

    await notifyReader(prisma, {
      type: 'SCRIPT_FEEDBACK_REVISION_REQUESTED',
      message: `Admin has requested revisions to your feedback for "${updated.title}". You have 24 hours to resubmit.`,
      readerId: existing.readerId,
      triggererId: auth.id,
      requestId: id,
      title: updated.title,
    });

    return json({ request: updated });
  } catch (e) {
    console.error('[scriptFeedback] requestRevision error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /script-feedback/:id/annotations
 * POST /script-feedback/:id/annotations
 * PUT /script-feedback/annotations/:annotationId
 * DELETE /script-feedback/annotations/:annotationId
 *
 * Inline annotations on the script PDF (HIGHLIGHT / PAGE_COMMENT / GENERAL_COMMENT).
 * Reuses the existing FeedbackAnnotation model — distinguished by scriptFeedbackRequestId.
 */
export const listAnnotations = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const request = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      select: { writerId: true, readerId: true, status: true },
    });
    if (!request) return error(404, 'Request not found');

    const allowed =
      request.writerId === auth.id ||
      request.readerId === auth.id ||
      auth.role === 'admin' ||
      (auth.isReader && request.status === 'approved' && !request.readerId);
    if (!allowed) return error(403, 'Forbidden');

    // Writer can only see annotations once feedback is complete
    if (request.writerId === auth.id && auth.role !== 'admin' && request.status !== 'completed') {
      return json({ annotations: [] });
    }

    const annotations = await prisma.feedbackAnnotation.findMany({
      where: { scriptFeedbackRequestId: id },
      include: { author: authorSelect() },
      orderBy: { createdAt: 'asc' },
    });

    return json({ annotations });
  } catch (e) {
    console.error('[scriptFeedback] listAnnotations error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const createAnnotation = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return error(400, 'Invalid JSON body');
    }

    const { type, pageNumber, selectionData, highlightedText, content, positionX, positionY, sentiment } = body;
    if (!type || !['HIGHLIGHT', 'PAGE_COMMENT', 'PAGE_FEEDBACK', 'GENERAL_COMMENT'].includes(type)) {
      return error(400, 'type must be HIGHLIGHT, PAGE_COMMENT, PAGE_FEEDBACK, or GENERAL_COMMENT');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return error(400, 'content is required');
    }
    if (sentiment && !['good', 'questioning', 'not_sure', 'general'].includes(sentiment)) {
      return error(400, 'sentiment must be good, questioning, not_sure, or general');
    }

    const request = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      select: { readerId: true, status: true },
    });
    if (!request) return error(404, 'Request not found');

    // Only the assigned reader may write annotations, and only while in progress.
    if (request.readerId !== auth.id) return error(403, 'Only the assigned reader can annotate');
    if (request.status !== 'accepted') {
      return error(400, `Cannot annotate in status: ${request.status}`);
    }

    const annotation = await prisma.feedbackAnnotation.create({
      data: {
        scriptFeedbackRequestId: id,
        authorId: auth.id,
        type,
        pageNumber: pageNumber ?? null,
        selectionData: selectionData ?? null,
        highlightedText: highlightedText ?? null,
        content: content.trim(),
        positionX: positionX ?? null,
        positionY: positionY ?? null,
        sentiment: sentiment ?? null,
      },
      include: { author: authorSelect() },
    });

    return json({ annotation });
  } catch (e) {
    console.error('[scriptFeedback] createAnnotation error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const updateAnnotation = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const annotationId = event.pathParameters?.annotationId;
    if (!annotationId) return error(400, 'Annotation ID required');

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return error(400, 'Invalid JSON body');
    }

    const existing = await prisma.feedbackAnnotation.findUnique({
      where: { id: annotationId },
      include: {
        scriptFeedbackRequest: { select: { status: true } },
      },
    });
    if (!existing) return error(404, 'Annotation not found');
    if (existing.authorId !== auth.id) return error(403, 'Not your annotation');
    if (existing.scriptFeedbackRequest && existing.scriptFeedbackRequest.status !== 'accepted') {
      return error(400, 'Cannot edit after submission');
    }

    const updated = await prisma.feedbackAnnotation.update({
      where: { id: annotationId },
      data: {
        content: typeof body.content === 'string' ? body.content.trim() : existing.content,
      },
      include: { author: authorSelect() },
    });

    return json({ annotation: updated });
  } catch (e) {
    console.error('[scriptFeedback] updateAnnotation error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const deleteAnnotation = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const annotationId = event.pathParameters?.annotationId;
    if (!annotationId) return error(400, 'Annotation ID required');

    const existing = await prisma.feedbackAnnotation.findUnique({
      where: { id: annotationId },
      include: {
        scriptFeedbackRequest: { select: { status: true } },
      },
    });
    if (!existing) return error(404, 'Annotation not found');
    if (existing.authorId !== auth.id) return error(403, 'Not your annotation');
    if (existing.scriptFeedbackRequest && existing.scriptFeedbackRequest.status !== 'accepted') {
      return error(400, 'Cannot delete after submission');
    }

    await prisma.feedbackAnnotation.delete({ where: { id: annotationId } });
    return json({ ok: true });
  } catch (e) {
    console.error('[scriptFeedback] deleteAnnotation error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /script-feedback/admin/readers   (admin only)
 * Lists all users currently flagged as readers.
 */
export const listReaders = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const readers = await prisma.user.findMany({
      where: { isReader: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatar: true,
        pendingPayoutCents: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
    });

    return json({ readers });
  } catch (e) {
    console.error('[scriptFeedback] listReaders error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /script-feedback/admin/users?q=...   (admin only)
 * Search users by email or username (case-insensitive contains).
 * Used by the readers admin page to find users to flag as readers.
 */
export const searchUsersForAdmin = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const q = (event.queryStringParameters?.q || '').trim();
    if (!q || q.length < 2) {
      return json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatar: true,
        isReader: true,
      },
      take: 25,
      orderBy: { username: 'asc' },
    });

    return json({ users });
  } catch (e) {
    console.error('[scriptFeedback] searchUsersForAdmin error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /script-feedback/admin/readers/:userId   (admin only)
 * Body: { isReader: boolean }
 * Toggles the isReader flag on a target user.
 */
export const setReaderFlag = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');
    if (auth.role !== 'admin') return error(403, 'Admin access required');

    const userId = event.pathParameters?.userId;
    if (!userId) return error(400, 'userId is required');

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return error(400, 'Invalid JSON body');
    }
    const isReader = !!body.isReader;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isReader: true },
    });
    if (!target) return error(404, 'User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isReader },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatar: true,
        isReader: true,
        pendingPayoutCents: true,
      },
    });

    console.log('[scriptFeedback] reader flag updated', {
      adminId: auth.id,
      targetId: userId,
      isReader,
    });

    return json({ user: updated });
  } catch (e) {
    console.error('[scriptFeedback] setReaderFlag error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * Internal: called from the Stripe webhook in billingRouter when a
 * checkout.session.completed arrives with metadata.kind === 'script_feedback'.
 * Moves a request from pending_payment -> pending_approval and stores the
 * payment intent ID for future refunds.
 */
export async function handleScriptFeedbackPaymentCompleted(prisma, session) {
  const requestId = session.metadata?.requestId;
  if (!requestId) {
    console.error('[scriptFeedback] webhook missing requestId metadata', session.id);
    return;
  }

  const existing = await prisma.scriptFeedbackRequest.findUnique({ where: { id: requestId } });
  if (!existing) {
    console.error('[scriptFeedback] webhook for unknown request', requestId);
    return;
  }
  if (existing.status !== 'pending_payment') {
    console.log('[scriptFeedback] webhook ignored — already processed', { requestId, status: existing.status });
    return;
  }

  await prisma.scriptFeedbackRequest.update({
    where: { id: requestId },
    data: {
      status: 'pending_approval',
      stripePaymentIntentId: session.payment_intent || null,
    },
  });

  console.log('[scriptFeedback] payment completed', { requestId, paymentIntentId: session.payment_intent });
}

// ─── Chat between writer and reader ────────────────────────────────────────

const CHAT_SENDER_SELECT = {
  id: true,
  displayName: true,
  username: true,
  avatar: true,
};

/** GET /script-feedback/:id/chat */
export const getChatMessages = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const request = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      select: { writerId: true, readerId: true, anonymousSubmission: true, status: true },
    });
    if (!request) return error(404, 'Request not found');

    const isWriter = request.writerId === auth.id;
    const isReader  = request.readerId === auth.id;
    const isAdmin   = auth.role === 'admin';
    if (!isWriter && !isReader && !isAdmin) return error(403, 'Forbidden');

    const messages = await prisma.scriptFeedbackMessage.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: CHAT_SENDER_SELECT } },
    });

    // Anonymize writer identity for the reader when anonymousSubmission is on
    const shaped = messages.map((m) => {
      const senderIsWriter = m.senderId === request.writerId;
      const hideIdentity = request.anonymousSubmission && senderIsWriter && isReader;
      return {
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderId: m.senderId,
        isOwn: m.senderId === auth.id,
        sender: hideIdentity
          ? { displayName: 'Anonymous', username: null, avatar: null }
          : m.sender,
      };
    });

    return json({ messages: shaped });
  } catch (e) {
    console.error('[scriptFeedback] getChatMessages error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/** POST /script-feedback/:id/chat */
export const sendChatMessage = async (event) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return error(503, 'Database unavailable');

    const auth = await getAuthUser(event, prisma);
    if (!auth) return error(401, 'Unauthorized');

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'Request ID required');

    const request = await prisma.scriptFeedbackRequest.findUnique({
      where: { id },
      select: { writerId: true, readerId: true, anonymousSubmission: true, status: true },
    });
    if (!request) return error(404, 'Request not found');

    const isWriter = request.writerId === auth.id;
    const isReader  = request.readerId === auth.id;
    if (!isWriter && !isReader) return error(403, 'Only the writer and reader may chat');

    // Only allow chat once feedback is delivered
    if (request.status !== 'completed') return error(400, 'Chat is only available after feedback is delivered');

    const body = JSON.parse(event.body || '{}');
    const text = (body.body || '').trim();
    if (!text) return error(400, 'Message body required');
    if (text.length > 2000) return error(400, 'Message too long (2000 chars max)');

    const message = await prisma.scriptFeedbackMessage.create({
      data: { requestId: id, senderId: auth.id, body: text },
      include: { sender: { select: CHAT_SENDER_SELECT } },
    });

    const senderIsWriter = message.senderId === request.writerId;
    const readerGetsHidden = request.anonymousSubmission && senderIsWriter;

    return json({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderId: message.senderId,
      isOwn: true,
      sender: readerGetsHidden
        ? { displayName: 'Anonymous', username: null, avatar: null }
        : message.sender,
    }, 201);
  } catch (e) {
    console.error('[scriptFeedback] sendChatMessage error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

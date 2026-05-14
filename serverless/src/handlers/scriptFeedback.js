// Script Feedback Service — paid marketplace (PDF Part 2)
// Writer pays $0.50/page → Reader earns $0.25/page → Joint keeps $0.25/page.
// Admin gates each request before it goes to readers; 24h reader deadline.

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import Stripe from 'stripe';

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
 * their free eval yet in the current calendar month.
 */
export function isEligibleForFreeEval(user, now = new Date()) {
  if (!user) return false;
  if (user.plan !== 'emerald') return false;
  if (!['active', 'trialing'].includes(user.subscriptionStatus || '')) return false;
  if (!user.monthlyFreeEvalUsedAt) return true;
  const used = new Date(user.monthlyFreeEvalUsedAt);
  return (
    used.getUTCFullYear() !== now.getUTCFullYear() ||
    used.getUTCMonth() !== now.getUTCMonth()
  );
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

    const { title, scriptUrl, pageCount, useFreeEval } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return error(400, 'Title is required');
    }
    if (!scriptUrl || typeof scriptUrl !== 'string') {
      return error(400, 'scriptUrl is required');
    }
    const pages = parseInt(pageCount, 10);
    if (!Number.isFinite(pages) || pages < MIN_PAGE_COUNT || pages > MAX_PAGE_COUNT) {
      return error(400, `pageCount must be between ${MIN_PAGE_COUNT} and ${MAX_PAGE_COUNT}`);
    }

    const readerEarningsCents = pages * READER_EARNINGS_PER_PAGE_CENTS;
    const platformFeeCents = pages * PLATFORM_FEE_PER_PAGE_CENTS;

    // ── Free Emerald eval path ────────────────────────────────────────────
    if (useFreeEval) {
      if (!isEligibleForFreeEval(auth)) {
        return error(403, 'Not eligible for a free evaluation this month');
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
          return { error: 'Free evaluation already used this month', status: 409 };
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
            scriptUrl,
            pageCount: pages,
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
        scriptUrl,
        pageCount: pages,
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

    return json({ request });
  } catch (e) {
    console.error('[scriptFeedback] getRequest error', e);
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
    if (!summaryNotes) return error(400, 'summaryNotes is required');
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
          status: 'completed',
          completedAt: new Date(),
          summaryNotes,
        },
      });

      // Credit reader's pending payout balance
      await tx.user.update({
        where: { id: auth.id },
        data: {
          pendingPayoutCents: {
            increment: existing.readerEarningsCents,
          },
        },
      });

      return { request: updated };
    });

    if (result.error) return error(result.status, result.error);
    return json({ request: result.request });
  } catch (e) {
    console.error('[scriptFeedback] submitNotes error', e);
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

    const { type, pageNumber, selectionData, highlightedText, content, positionX, positionY } = body;
    if (!type || !['HIGHLIGHT', 'PAGE_COMMENT', 'GENERAL_COMMENT'].includes(type)) {
      return error(400, 'type must be HIGHLIGHT, PAGE_COMMENT, or GENERAL_COMMENT');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return error(400, 'content is required');
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

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import { createNotification } from './notifications.js';
import Stripe from 'stripe';

const PLATFORM_FEE_PERCENT = 0.15;
const MIN_PRICE = 0.50;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/**
 * POST /posts/{id}/create-checkout
 * Creates a Stripe Checkout Session for purchasing access to a post
 */
export const createCheckoutSession = async (event) => {
  const route = 'POST /posts/{id}/create-checkout';

  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      return error(401, 'Unauthorized');
    }

    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }

    const stripe = getStripe();
    if (!stripe) {
      return error(503, 'Payment service not configured');
    }

    const prisma = getPrisma();
    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        title: true,
        price: true,
        isFree: true,
      },
    });

    if (!post) {
      return error(404, 'Post not found');
    }

    if (post.authorId === authUserId) {
      return error(400, 'You cannot purchase your own post');
    }

    if (post.isFree) {
      return error(400, 'This post is free and does not require payment');
    }

    if (!post.price || post.price < MIN_PRICE) {
      return error(400, `This post does not have a valid price (minimum $${MIN_PRICE})`);
    }

    // Check if buyer already has access
    const existingGrant = await prisma.accessGrant.findUnique({
      where: { postId_userId: { postId, userId: authUserId } },
    });

    if (existingGrant) {
      return error(400, 'You already have access to this post');
    }

    // Check for existing completed purchase
    const existingPurchase = await prisma.purchase.findUnique({
      where: { postId_buyerId: { postId, buyerId: authUserId } },
    });

    if (existingPurchase?.status === 'completed') {
      return error(400, 'You have already purchased this post');
    }

    const amount = post.price;
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT * 100) / 100;
    const sellerEarnings = Math.round((amount - platformFee) * 100) / 100;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: post.title || 'Script Access',
              description: `Access to "${post.title || 'Untitled'}"`,
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        postId,
        buyerId: authUserId,
        sellerId: post.authorId,
      },
      success_url: `${frontendUrl}/posts/${postId}?payment=success`,
      cancel_url: `${frontendUrl}/posts/${postId}?payment=cancelled`,
    });

    // Upsert a pending purchase record
    await prisma.purchase.upsert({
      where: { postId_buyerId: { postId, buyerId: authUserId } },
      create: {
        postId,
        buyerId: authUserId,
        sellerId: post.authorId,
        amount,
        platformFee,
        sellerEarnings,
        stripeSessionId: session.id,
        status: 'pending',
      },
      update: {
        stripeSessionId: session.id,
        amount,
        platformFee,
        sellerEarnings,
        status: 'pending',
      },
    });

    console.log(`[payments] Checkout session created`, {
      route,
      sessionId: session.id,
      postId,
      buyerId: authUserId,
      amount,
    });

    return json({ checkoutUrl: session.url });
  } catch (e) {
    console.error('[payments] createCheckoutSession error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /stripe/webhook
 * Handles Stripe webhook events
 */
export const stripeWebhook = async (event) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return error(503, 'Payment service not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[payments] STRIPE_WEBHOOK_SECRET not configured');
      return error(503, 'Webhook not configured');
    }

    // Get raw body for signature verification
    let rawBody = event.body;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, 'base64').toString('utf8');
    }

    const signature = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('[payments] Webhook signature verification failed:', err.message);
      return error(400, 'Webhook signature verification failed');
    }

    const prisma = getPrisma();
    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const { postId, buyerId, sellerId } = session.metadata;

      if (!postId || !buyerId || !sellerId) {
        console.error('[payments] Missing metadata in checkout session', session.id);
        return json({ received: true });
      }

      // Check if already processed (idempotency)
      const existing = await prisma.purchase.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (existing?.status === 'completed') {
        console.log('[payments] Already processed session', session.id);
        return json({ received: true });
      }

      // Update purchase record and create access grant in a transaction
      await prisma.$transaction(async (tx) => {
        // Update purchase status
        await tx.purchase.update({
          where: { stripeSessionId: session.id },
          data: {
            status: 'completed',
            stripePaymentId: session.payment_intent,
            completedAt: new Date(),
          },
        });

        // Grant access to the post
        await tx.accessGrant.upsert({
          where: { postId_userId: { postId, userId: buyerId } },
          create: { postId, userId: buyerId },
          update: {},
        });
      });

      // Get buyer info for notification
      const buyer = await prisma.user.findUnique({
        where: { id: buyerId },
        select: { username: true, displayName: true },
      });

      const purchase = await prisma.purchase.findUnique({
        where: { stripeSessionId: session.id },
        select: { amount: true },
      });

      // Notify the seller
      await createNotification(prisma, {
        type: 'purchase',
        message: `${buyer?.displayName || buyer?.username || 'Someone'} purchased your script`,
        recipientId: sellerId,
        triggererId: buyerId,
        metadata: {
          postId,
          amount: purchase?.amount,
        },
      });

      console.log('[payments] Payment completed', {
        sessionId: session.id,
        postId,
        buyerId,
        sellerId,
      });
    } else if (stripeEvent.type === 'checkout.session.expired') {
      const session = stripeEvent.data.object;

      await prisma.purchase.updateMany({
        where: { stripeSessionId: session.id, status: 'pending' },
        data: { status: 'failed' },
      });

      console.log('[payments] Checkout session expired', session.id);
    }

    return json({ received: true });
  } catch (e) {
    console.error('[payments] stripeWebhook error', e);
    return error(500, 'Webhook handler error');
  }
};

/**
 * GET /posts/{id}/purchase-status
 * Check if the authenticated user has purchased a post
 */
export const getPurchaseStatus = async (event) => {
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      return error(401, 'Unauthorized');
    }

    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }

    const prisma = getPrisma();
    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    const purchase = await prisma.purchase.findUnique({
      where: { postId_buyerId: { postId, buyerId: authUserId } },
      select: { status: true, completedAt: true },
    });

    return json({
      purchased: purchase?.status === 'completed',
      status: purchase?.status || null,
    });
  } catch (e) {
    console.error('[payments] getPurchaseStatus error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

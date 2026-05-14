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

function normalizeFrontendUrl(raw) {
  const fallback = 'http://localhost:5173';
  let url = (raw || '').trim();
  if (!url) return fallback;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
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

    const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL);

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
 * POST /billing/subscribe
 * Creates a Stripe Checkout Session for the Emerald $9/month subscription
 */
export const createSubscriptionCheckout = async (event) => {
  const route = 'POST /billing/subscribe';

  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      return error(401, 'Unauthorized');
    }

    const priceId = process.env.STRIPE_EMERALD_PRICE_ID;
    if (!priceId) {
      console.error('[payments] STRIPE_EMERALD_PRICE_ID not configured');
      return error(503, 'Subscription pricing not configured');
    }

    const stripe = getStripe();
    if (!stripe) {
      return error(503, 'Payment service not configured');
    }

    const prisma = getPrisma();
    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    const user = await prisma.user.findUnique({
      where: { id: authUserId },
      select: {
        id: true,
        email: true,
        plan: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return error(404, 'User not found');
    }

    if (user.plan === 'emerald' && user.subscriptionStatus === 'active') {
      return error(400, 'You already have an active Emerald subscription');
    }

    // Reuse an existing Stripe customer if we have one
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: user.id,
        plan: 'emerald',
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: 'emerald',
        },
      },
      success_url: `${frontendUrl}/pricing?subscription=success`,
      cancel_url: `${frontendUrl}/pricing?subscription=cancelled`,
    });

    console.log('[payments] Subscription checkout session created', {
      route,
      sessionId: session.id,
      userId: user.id,
    });

    return json({ checkoutUrl: session.url });
  } catch (e) {
    console.error('[payments] createSubscriptionCheckout error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /billing/portal
 * Returns a Stripe Billing Portal URL so the user can manage / cancel their subscription
 */
export const createBillingPortalSession = async (event) => {
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      return error(401, 'Unauthorized');
    }

    const stripe = getStripe();
    if (!stripe) {
      return error(503, 'Payment service not configured');
    }

    const prisma = getPrisma();
    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    const user = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return error(400, 'No billing account found for this user');
    }

    const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL);

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/pricing`,
    });

    return json({ portalUrl: session.url });
  } catch (e) {
    console.error('[payments] createBillingPortalSession error', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /billing/status
 * Returns the authenticated user's current plan + subscription status
 */
export const getBillingStatus = async (event) => {
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();
    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    const user = await prisma.user.findUnique({
      where: { id: authUserId },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        stripeCustomerId: true,
      },
    });

    return json({
      plan: user?.plan || 'free',
      status: user?.subscriptionStatus || null,
      currentPeriodEnd: user?.subscriptionCurrentPeriodEnd || null,
      hasBillingAccount: Boolean(user?.stripeCustomerId),
    });
  } catch (e) {
    console.error('[payments] getBillingStatus error', e);
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

      // ===== Subscription checkout =====
      if (session.mode === 'subscription') {
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'emerald';

        if (!userId) {
          console.error('[payments] Missing userId metadata on subscription session', session.id);
          return json({ received: true });
        }

        const subscriptionId = session.subscription;
        let subscription = null;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            stripeCustomerId: session.customer || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            subscriptionStatus: subscription?.status || 'active',
            subscriptionCurrentPeriodEnd: subscription?.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        });

        console.log('[payments] Subscription activated', {
          sessionId: session.id,
          userId,
          plan,
          subscriptionId,
        });

        return json({ received: true });
      }

      // ===== One-time post purchase checkout =====
      const { postId, buyerId, sellerId } = session.metadata || {};

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
    } else if (
      stripeEvent.type === 'customer.subscription.updated' ||
      stripeEvent.type === 'customer.subscription.deleted'
    ) {
      const subscription = stripeEvent.data.object;
      const userId = subscription.metadata?.userId;

      // Find the user either by metadata or by stored subscription ID
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id } });

      if (!user) {
        console.warn('[payments] Subscription event for unknown user', subscription.id);
        return json({ received: true });
      }

      const isDeleted = stripeEvent.type === 'customer.subscription.deleted';
      const isActive = !isDeleted && ['active', 'trialing'].includes(subscription.status);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: isActive ? (subscription.metadata?.plan || user.plan || 'emerald') : 'free',
          subscriptionStatus: isDeleted ? 'canceled' : subscription.status,
          subscriptionCurrentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          stripeSubscriptionId: isDeleted ? null : subscription.id,
        },
      });

      console.log('[payments] Subscription state updated', {
        userId: user.id,
        type: stripeEvent.type,
        status: subscription.status,
      });
    } else if (stripeEvent.type === 'invoice.payment_failed') {
      const invoice = stripeEvent.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { subscriptionStatus: 'past_due' },
        });
      }
      console.log('[payments] Invoice payment failed', { subscriptionId });
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

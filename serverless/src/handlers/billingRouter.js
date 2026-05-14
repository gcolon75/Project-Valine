// serverless/src/handlers/billingRouter.js
// Central router for billing + Stripe webhook endpoints.
// Consolidates routes into one Lambda to stay under CloudFormation's
// 500-resource-per-stack limit.

import * as payments from './payments.js';

function normalizePath(rawPath) {
  let path = rawPath || '';
  const stage = process.env.STAGE;
  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1);
  }
  return path;
}

export const handler = async (event, context) => {
  const httpMethod =
    event.requestContext?.http?.method || event.httpMethod || 'GET';

  const rawPath =
    event.requestContext?.http?.path || event.rawPath || event.path || '';

  const method = httpMethod.toUpperCase();
  const path = normalizePath(rawPath);

  try {
    if (method === 'POST' && path === '/billing/subscribe') {
      return payments.createSubscriptionCheckout(event, context);
    }
    if (method === 'POST' && path === '/billing/portal') {
      return payments.createBillingPortalSession(event, context);
    }
    if (method === 'GET' && path === '/billing/status') {
      return payments.getBillingStatus(event, context);
    }
    if (method === 'POST' && path === '/stripe/webhook') {
      return payments.stripeWebhook(event, context);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found', method, path }),
    };
  } catch (e) {
    console.error('[billingRouter] error', e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error: ' + e.message }),
    };
  }
};

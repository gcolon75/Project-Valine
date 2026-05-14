import { apiClient } from './api.js';

/**
 * Start a Stripe Checkout session for the Emerald $9/month subscription.
 * Returns { checkoutUrl }. The caller should redirect to that URL.
 */
export const subscribeToEmerald = async () => {
  const { data } = await apiClient.post('/billing/subscribe');
  return data;
};

/**
 * Open a Stripe Billing Portal session so the user can manage / cancel.
 * Returns { portalUrl }.
 */
export const openBillingPortal = async () => {
  const { data } = await apiClient.post('/billing/portal');
  return data;
};

/**
 * Get the authenticated user's current plan + subscription status.
 * Returns { plan, status, currentPeriodEnd, hasBillingAccount }.
 */
export const getBillingStatus = async () => {
  const { data } = await apiClient.get('/billing/status');
  return data;
};

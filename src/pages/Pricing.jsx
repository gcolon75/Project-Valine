import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToEmerald,
  openBillingPortal,
  getBillingStatus,
} from '../services/billingService';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [billing, setBilling] = useState(null);

  const isActiveEmerald =
    billing?.plan === 'emerald' &&
    ['active', 'trialing'].includes(billing?.status || '');

  useEffect(() => {
    const paymentResult = searchParams.get('subscription');
    if (paymentResult === 'success') {
      setStatusMsg('Subscription activated. Welcome to Emerald!');
    } else if (paymentResult === 'cancelled') {
      setStatusMsg('Checkout cancelled.');
    }
    if (paymentResult) {
      // Clear the query param after reading it
      searchParams.delete('subscription');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getBillingStatus()
      .then((b) => {
        if (!cancelled) setBilling(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubscribe = async () => {
    setErrorMsg('');
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }
    setLoading(true);
    try {
      const { checkoutUrl } = await subscribeToEmerald();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setErrorMsg('Could not start checkout. Please try again.');
        setLoading(false);
      }
    } catch (e) {
      setErrorMsg(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          'Could not start checkout. Please try again.'
      );
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { portalUrl } = await openBillingPortal();
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        setErrorMsg('Could not open billing portal.');
        setLoading(false);
      }
    } catch (e) {
      setErrorMsg(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          'Could not open billing portal.'
      );
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Create unlimited posts',
        'Basic profile',
        'Community access',
        'Limited stats (connections only)',
      ],
      limitations: ['No detailed analytics', 'No priority support'],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      name: 'Emerald',
      price: '$9',
      period: 'month',
      featured: true,
      features: [
        'Everything in Free',
        'Full analytics dashboard',
        'Track likes, views, engagement',
        'Export data reports',
        'Early access to new features',
        'Priority support',
      ],
      cta: isActiveEmerald ? 'Manage Subscription' : 'Upgrade to Emerald',
      disabled: false,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
            Choose Your Plan
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400">
            Unlock powerful analytics and insights
          </p>
          {statusMsg && (
            <p className="mt-4 text-emerald-600 dark:text-emerald-400 font-medium">
              {statusMsg}
            </p>
          )}
          {errorMsg && (
            <p className="mt-4 text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 ${
                plan.featured
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl transform scale-105'
                  : 'bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <h2
                className={`text-2xl font-bold mb-2 ${
                  plan.featured
                    ? 'text-white'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {plan.name}
              </h2>
              <div className="mb-6">
                <span
                  className={`text-5xl font-bold ${
                    plan.featured
                      ? 'text-white'
                      : 'text-neutral-900 dark:text-neutral-100'
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-lg ${
                    plan.featured
                      ? 'text-emerald-50'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  /{plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check
                      className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${
                        plan.featured ? 'text-emerald-100' : 'text-emerald-600'
                      }`}
                    />
                    <span
                      className={
                        plan.featured
                          ? 'text-white'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.name === 'Emerald' ? (
                <Button
                  variant={plan.featured ? 'primary' : 'secondary'}
                  disabled={loading}
                  className="w-full"
                  onClick={isActiveEmerald ? handleManageBilling : handleSubscribe}
                >
                  {loading ? 'Loading…' : plan.cta}
                </Button>
              ) : (
                <Button
                  variant={plan.featured ? 'primary' : 'secondary'}
                  disabled={plan.disabled}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/dashboard"
            className="text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

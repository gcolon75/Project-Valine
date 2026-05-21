import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Gem, Star, User } from 'lucide-react';
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
      name: 'Basic',
      price: '$0',
      period: 'waitlist',
      subPrice: 'or $15/year',
      tagline: 'Perfect for getting started',
      features: [
        'Post & share your work',
        'Direct messaging',
        'Like, comment, follow',
        'Request paid script feedback (pay per page count)',
        'Earn as a freelance reader',
        'Enter contests & limited events',
      ],
      cta: isActiveEmerald ? 'Basic Plan' : 'Current Plan',
      disabled: true,
    },
    {
      name: 'Emerald',
      price: '$14.99',
      period: 'month',
      subPrice: 'or $150/year',
      featured: true,
      tagline: 'Everything in Basic, plus:',
      features: [
        '1 FREE script evaluation every 3 months',
        '6 Featured Posts/year (72-hour homepage spotlight)',
        '1 Weekly Profile Spotlight/year',
        'Access to Crowdfunding Tools',
        'Analytics Dashboard (track engagement & growth)',
        'Exclusive access to annual events (Directors’ Room, etc.)',
        'Discounts on showcases & networking events',
      ],
      alaCarte: [
        { label: 'Featured Post (72 hrs)', price: '$6.99' },
        { label: 'Profile Spotlight (1 week)', price: '$19.99' },
      ],
      cta: isActiveEmerald ? 'Current Plan' : 'Upgrade to Emerald',
      disabled: false,
    },
    {
      name: 'Executive',
      gold: true,
      price: 'Request a Quote',
      period: '',
      subPrice: '$100–$500/week depending on scope',
      tagline: 'Built for serious projects & maximum growth',
      features: [
        'Personal networking specialist (daily contact)',
        'Weekly meetings with progress reports & data analytics',
        'Project development, content strategy & performance tracking',
        'Talent acquisition & project matchmaking',
        'All Emerald features included',
      ],
      footer: 'Custom solutions, real results.',
      cta: 'Contact Sales',
      contact: true,
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

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isLight = !plan.featured && !plan.gold; // light/white card
            const Icon = plan.name === 'Emerald' ? Gem : plan.name === 'Executive' ? Star : plan.name === 'Basic' ? User : null;

            return (
              <div
                key={plan.name}
                className={`rounded-xl p-8 flex flex-col ${
                  plan.featured
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl md:transform md:scale-105'
                    : plan.gold
                    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-2xl border border-indigo-800/40'
                    : 'bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {Icon && (
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center ${
                        plan.featured
                          ? 'bg-white/20'
                          : plan.gold
                          ? 'bg-indigo-400/20'
                          : 'bg-emerald-100 dark:bg-emerald-900/40'
                      }`}
                    >
                      <Icon
                        className={`w-7 h-7 ${
                          plan.featured
                            ? 'text-white'
                            : plan.gold
                            ? 'text-indigo-300'
                            : 'text-emerald-600'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <h2
                  className={`text-2xl font-bold mb-1 ${
                    plan.featured
                      ? 'text-white'
                      : plan.gold
                      ? 'text-white'
                      : 'text-neutral-900 dark:text-neutral-100'
                  }`}
                >
                  {plan.name}
                </h2>

                <div className="mb-6">
                  <div>
                    <span
                      className={`text-5xl font-bold ${
                        plan.featured
                          ? 'text-white'
                          : plan.gold
                          ? 'text-white'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className={`text-lg ${
                          plan.featured
                            ? 'text-emerald-50'
                            : plan.gold
                            ? 'text-indigo-300'
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  {plan.subPrice && (
                    <p
                      className={`text-sm mt-1 ${
                        plan.featured
                          ? 'text-emerald-50'
                          : plan.gold
                          ? 'text-indigo-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {plan.subPrice}
                    </p>
                  )}
                </div>

                {plan.tagline && (
                  <p
                    className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
                      plan.featured
                        ? 'text-emerald-50'
                        : plan.gold
                        ? 'text-indigo-300'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {plan.tagline}
                  </p>
                )}

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check
                        className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${
                          plan.featured
                            ? 'text-emerald-100'
                            : plan.gold
                            ? 'text-indigo-300'
                            : 'text-emerald-600'
                        }`}
                      />
                      <span
                        className={
                          plan.featured
                            ? 'text-white'
                            : plan.gold
                            ? 'text-white'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.alaCarte && (
                  <div
                    className={`rounded-lg p-4 mb-6 ${
                      plan.featured
                        ? 'bg-white/10 border border-white/20'
                        : 'bg-neutral-100 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                        plan.featured ? 'text-emerald-50' : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      À la carte options
                    </p>
                    <ul className="space-y-1">
                      {plan.alaCarte.map((item) => (
                        <li
                          key={item.label}
                          className={`flex items-center justify-between text-sm ${
                            plan.featured ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="font-semibold">{item.price}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.footer && (
                  <p
                    className={`text-sm font-semibold uppercase tracking-wide text-center mb-4 ${
                      plan.featured
                        ? 'text-emerald-50'
                        : plan.gold
                        ? 'text-indigo-300'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {plan.footer}
                  </p>
                )}

                <div className="mt-auto">
                  {plan.name === 'Emerald' ? (
                    <Button
                      variant="primary"
                      disabled={loading || isActiveEmerald}
                      className="w-full"
                      onClick={isActiveEmerald ? undefined : handleSubscribe}
                    >
                      {loading ? 'Loading…' : plan.cta}
                    </Button>
                  ) : plan.contact ? (
                    <Link to="/contact" className="block w-full">
                      <Button
                        variant="secondary"
                        className="w-full bg-white/10 hover:bg-white/20 text-white border-2 border-indigo-400/50 hover:border-indigo-300 shadow-sm"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={plan.disabled}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isActiveEmerald && (
          <div className="text-center mt-12">
            <Button
              variant="secondary"
              onClick={handleManageBilling}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Manage Subscription'}
            </Button>
          </div>
        )}

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

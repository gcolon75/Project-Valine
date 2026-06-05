import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Gem, Star, User, ArrowLeft } from 'lucide-react';
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
      searchParams.delete('subscription');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getBillingStatus()
      .then((b) => { if (!cancelled) setBilling(b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const handleSubscribe = async () => {
    setErrorMsg('');
    if (!user) { navigate('/login?redirect=/pricing'); return; }
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
      setErrorMsg(e?.response?.data?.error || e?.response?.data?.message || 'Could not start checkout. Please try again.');
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
      setErrorMsg(e?.response?.data?.error || e?.response?.data?.message || 'Could not open billing portal.');
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Basic',
      icon: User,
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
      style: 'basic',
    },
    {
      name: 'Emerald',
      icon: Gem,
      price: '$14.99',
      period: '/month',
      subPrice: 'or $150/year',
      featured: true,
      tagline: 'Everything in Basic, plus:',
      features: [
        '1 FREE script evaluation every 3 months',
        '6 Featured Posts/year (72-hour homepage spotlight)',
        '1 Weekly Profile Spotlight/year',
        'Access to Crowdfunding Tools',
        'Analytics Dashboard (track engagement & growth)',
        'Exclusive access to annual events (Directors\' Room, etc.)',
        'Discounts on showcases & networking events',
      ],
      alaCarte: [
        { label: 'Featured Post (72 hrs)', price: '$6.99' },
        { label: 'Profile Spotlight (1 week)', price: '$19.99' },
      ],
      cta: isActiveEmerald ? 'Current Plan' : 'Upgrade to Emerald',
      disabled: false,
      style: 'emerald',
    },
    {
      name: 'Executive',
      icon: Star,
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
      style: 'executive',
    },
  ];

  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-14">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3 text-center">
            Choose Your Plan
          </h1>
          <p className="text-lg text-neutral-500 max-w-xl">
            Unlock powerful analytics and insights
          </p>

          {statusMsg && (
            <p className="mt-4 text-emerald-600 font-medium">{statusMsg}</p>
          )}
          {errorMsg && (
            <p className="mt-4 text-red-600 font-medium">{errorMsg}</p>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch py-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isEmeraldCard = plan.style === 'emerald';
            const isExecCard = plan.style === 'executive';

            return (
              <div
                key={plan.name}
                className={`rounded-lg flex flex-col overflow-hidden ${
                  isEmeraldCard
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white md:-my-8 md:shadow-2xl z-10'
                    : isExecCard
                    ? 'bg-[#0d0d0d] text-white'
                    : 'bg-white border border-neutral-200 text-neutral-900'
                }`}
              >
                {/* Card header */}
                <div className={`px-10 pt-10 pb-8 ${
                  isEmeraldCard ? 'border-b border-white/20' : isExecCard ? 'border-b border-white/10' : 'border-b border-neutral-100'
                }`}>
                  {/* Icon — centered, above title */}
                  <div className="flex justify-center mb-5">
                    <div className={`w-16 h-16 flex items-center justify-center ${
                      isEmeraldCard ? 'bg-white/20' : isExecCard ? 'bg-white/10' : 'bg-neutral-100'
                    }`}>
                      <Icon className={`w-9 h-9 ${
                        isEmeraldCard ? 'text-white' : isExecCard ? 'text-neutral-300' : 'text-neutral-500'
                      }`} />
                    </div>
                  </div>

                  {/* Plan name */}
                  <h2 className={`text-3xl font-bold text-center mb-6 ${
                    isEmeraldCard ? 'text-white' : isExecCard ? 'text-white' : 'text-neutral-900'
                  }`}>
                    {plan.name}
                  </h2>

                  <div className="mb-2">
                    <span className={`text-5xl font-bold tracking-tight ${
                      isEmeraldCard || isExecCard ? 'text-white' : 'text-neutral-900'
                    }`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-lg ml-1 ${
                        isEmeraldCard ? 'text-emerald-100' : isExecCard ? 'text-neutral-400' : 'text-neutral-400'
                      }`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {plan.subPrice && (
                    <p className={`text-base ${
                      isEmeraldCard ? 'text-emerald-100' : isExecCard ? 'text-neutral-500' : 'text-neutral-400'
                    }`}>
                      {plan.subPrice}
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="px-10 py-8 flex-1 flex flex-col">
                  {plan.tagline && (
                    <p className={`text-sm font-semibold tracking-widest uppercase mb-5 ${
                      isEmeraldCard ? 'text-emerald-100' : isExecCard ? 'text-neutral-400' : 'text-neutral-400'
                    }`}>
                      {plan.tagline}
                    </p>
                  )}

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isEmeraldCard ? 'text-emerald-100' : isExecCard ? 'text-neutral-400' : 'text-[#0CCE6B]'
                        }`} />
                        <span className={`text-base leading-snug ${
                          isEmeraldCard || isExecCard ? 'text-white/90' : 'text-neutral-600'
                        }`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.alaCarte && (
                    <div className={`p-4 mb-6 ${
                      isEmeraldCard ? 'bg-white/10 border border-white/20' : 'bg-neutral-50 border border-neutral-200'
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
                        isEmeraldCard ? 'text-emerald-100' : 'text-neutral-400'
                      }`}>
                        À la carte
                      </p>
                      <ul className="space-y-2">
                        {plan.alaCarte.map((item) => (
                          <li key={item.label} className={`flex items-center justify-between text-sm ${
                            isEmeraldCard ? 'text-white/90' : 'text-neutral-600'
                          }`}>
                            <span>{item.label}</span>
                            <span className="font-semibold">{item.price}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.footer && (
                    <p className={`text-xs font-semibold uppercase tracking-widest text-center mb-4 ${
                      isExecCard ? 'text-neutral-400' : 'text-neutral-400'
                    }`}>
                      {plan.footer}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="mt-auto">
                    {plan.style === 'emerald' ? (
                      <button
                        onClick={isActiveEmerald ? undefined : handleSubscribe}
                        disabled={loading || isActiveEmerald}
                        className="w-full bg-white text-emerald-700 font-semibold py-3 text-sm hover:bg-emerald-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Loading…' : plan.cta}
                      </button>
                    ) : plan.contact ? (
                      <Link
                        to="/contact"
                        className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 text-sm text-center transition-colors border border-white/20"
                      >
                        {plan.cta}
                      </Link>
                    ) : (
                      <button
                        disabled={plan.disabled}
                        className="w-full bg-neutral-100 text-neutral-400 font-semibold py-3 text-sm cursor-not-allowed"
                      >
                        {plan.cta}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manage billing */}
        {isActiveEmerald && (
          <div className="mt-10 text-center">
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors underline underline-offset-2"
            >
              {loading ? 'Loading…' : 'Manage Subscription'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

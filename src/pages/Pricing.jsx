import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/ui';

export default function Pricing() {
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
      limitations: [
        'No detailed analytics',
        'No priority support',
      ],
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
      cta: 'Upgrade to Emerald',
      disabled: false,
      comingSoon: true,
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
              <h2 className={`text-2xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}`}>
                {plan.name}
              </h2>
              <div className="mb-6">
                <span className={`text-5xl font-bold ${plan.featured ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}`}>
                  {plan.price}
                </span>
                <span className={`text-lg ${plan.featured ? 'text-emerald-50' : 'text-neutral-600 dark:text-neutral-400'}`}>
                  /{plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${plan.featured ? 'text-emerald-100' : 'text-emerald-600'}`} />
                    <span className={plan.featured ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.comingSoon ? (
                <div className={`text-center py-3 rounded-lg ${
                  plan.featured ? 'bg-white bg-opacity-20 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}>
                  Payment integration coming soon
                </div>
              ) : (
                <Button
                  variant={plan.featured ? "primary" : "secondary"}
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

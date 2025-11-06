// src/pages/Onboarding/steps/Welcome.jsx
import { Sparkles, Users, Film, Award } from 'lucide-react';

/**
 * Welcome Step - Introduction to the platform
 */
export default function Welcome({ userData, onUpdate }) {
  const benefits = [
    {
      icon: Users,
      title: 'Connect with Industry Professionals',
      description: 'Build your network with casting directors, producers, and fellow artists'
    },
    {
      icon: Film,
      title: 'Showcase Your Work',
      description: 'Display your portfolio, reels, and professional experience'
    },
    {
      icon: Award,
      title: 'Discover Opportunities',
      description: 'Get notified about auditions and projects that match your profile'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg text-neutral-700 dark:text-neutral-300 max-w-2xl mx-auto">
          Welcome to Project Valine! Let's set up your professional profile in just a few steps.
        </p>
      </div>

      <div className="grid gap-4 mt-8">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#0CCE6B]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#0CCE6B]" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  {benefit.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {benefit.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>Privacy Note:</strong> You control what information is visible on your profile.
          You can update your privacy settings anytime after completing onboarding.
        </p>
      </div>
    </div>
  );
}

// src/pages/Onboarding/steps/Welcome.jsx
import { Sparkles, Users, Film, Award, Lock } from 'lucide-react';

/**
 * Welcome Step - Introduction to the platform with improved design
 */
export default function Welcome({ userData, onUpdate }) {
  const benefits = [
    {
      icon: Users,
      title: 'Connect with Industry Professionals',
      description: 'Connect with producers, directors, agents, and people who get what you do'
    },
    {
      icon: Film,
      title: 'Showcase Your Work',
      description: 'Show off your work—demos, samples, scripts, whatever you\'ve made'
    },
    {
      icon: Award,
      title: 'Discover Opportunities',
      description: 'Find auditions, gigs, and collabs that actually fit what you do'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full mb-6 shadow-lg">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
          Welcome to Joint! 🎭
        </h2>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
          Your network for entertainment. Let's set up your profile real quick—takes about 2 minutes.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid gap-4">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800/50 dark:to-neutral-800/30 border border-neutral-200 dark:border-neutral-700 hover:border-[#0CCE6B]/50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#474747]/10 to-[#0CCE6B]/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#0CCE6B]" />
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

      {/* Privacy Preview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
              You're in Control
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Choose between a <strong>public profile</strong> where anyone can follow you, 
              or a <strong>private profile</strong> where only people you invite can connect.
              You can change this anytime in settings.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          <div className="text-2xl font-bold text-[#0CCE6B]">2 min</div>
          <div className="text-xs text-neutral-500">to complete</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          <div className="text-2xl font-bold text-[#0CCE6B]">4</div>
          <div className="text-xs text-neutral-500">quick steps</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          <div className="text-2xl font-bold text-[#0CCE6B]">Free</div>
          <div className="text-xs text-neutral-500">to join</div>
        </div>
      </div>
    </div>
  );
}

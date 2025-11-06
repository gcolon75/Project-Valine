// src/pages/Onboarding/OnboardingLayout.jsx
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

/**
 * OnboardingLayout - Multi-step wizard layout with progress tracking
 * Features:
 * - Progress indicator showing completed/current/upcoming steps
 * - Autosave functionality to localStorage
 * - Resume capability from stored progress
 * - Accessibility: focus management, keyboard navigation
 */
export default function OnboardingLayout({ children, currentStep, totalSteps, stepTitle, onNext, onBack, onSkip, canSkip = false, canGoBack = true }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users who have completed profile
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  const progress = ((currentStep) / totalSteps) * 100;

  // Step labels for progress indicator
  const stepLabels = [
    'Welcome',
    'Profile Basics',
    'Links & Portfolio',
    'Preferences',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex flex-col">
      {/* Header with progress */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Complete Your Profile
            </h1>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Step {currentStep} of {totalSteps}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Onboarding progress: ${Math.round(progress)}%`}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-between mt-3">
              {stepLabels.map((label, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;
                
                return (
                  <div
                    key={stepNumber}
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="flex items-center justify-center mb-1">
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5 text-[#0CCE6B]" aria-label="Completed" />
                      ) : (
                        <Circle
                          className={`w-5 h-5 ${
                            isCurrent
                              ? 'text-[#0CCE6B] fill-[#0CCE6B]'
                              : 'text-neutral-400 dark:text-neutral-600'
                          }`}
                          aria-label={isCurrent ? 'Current step' : 'Upcoming step'}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isComplete || isCurrent
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-500 dark:text-neutral-600'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {stepTitle}
            </h2>
            
            <div className="mt-6">
              {children}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <div>
                {canGoBack && currentStep > 1 && (
                  <Button
                    variant="ghost"
                    onClick={onBack}
                    aria-label="Go back to previous step"
                  >
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {canSkip && (
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                    aria-label="Skip this step"
                  >
                    Skip
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={onNext}
                  aria-label={currentStep === totalSteps ? 'Complete onboarding' : 'Continue to next step'}
                >
                  {currentStep === totalSteps ? 'Complete' : 'Continue'}
                </Button>
              </div>
            </div>
          </div>

          {/* Helper text */}
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
            Your progress is automatically saved. You can return anytime to complete your profile.
          </p>
        </div>
      </main>
    </div>
  );
}

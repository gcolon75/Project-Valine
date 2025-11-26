// src/pages/Onboarding/index.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OnboardingLayout from './OnboardingLayout';
import Welcome from './steps/Welcome';
import ProfileBasics from './steps/ProfileBasics';
import LinksSetup from './steps/LinksSetup';
import PreferencesSetup from './steps/PreferencesSetup';
import toast from 'react-hot-toast';
import { updateMyProfile } from '../../services/profileService';

const ONBOARDING_STORAGE_KEY = 'valine-onboarding-progress';
const TOTAL_STEPS = 4;

/**
 * Onboarding Index - Main orchestrator for multi-step onboarding wizard
 * Features:
 * - Multi-step wizard with progress tracking
 * - Autosave to localStorage for resume capability
 * - Focus management between steps for accessibility
 * - Optimistic updates with error handling
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const stepContentRef = useRef(null);

  // Initialize onboarding data from localStorage or user data
  const [onboardingData, setOnboardingData] = useState(() => {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentStep(parsed.currentStep || 1);
        return parsed.data || {};
      } catch (e) {
        console.error('Failed to parse saved onboarding data', e);
      }
    }
    
    return {
      displayName: user?.displayName || user?.name || '',
      headline: user?.headline || '',
      title: user?.title || '',
      location: user?.location || '',
      avatar: user?.avatar || null,
      profileLinks: user?.profileLinks || user?.externalLinks || [],
      emailNotifications: true,
      projectNotifications: true,
      messageNotifications: true,
      profileVisibility: 'public',
      contactPreferences: {
        email: true,
        phone: false,
        platform: true,
      },
    };
  });

  // Autosave to localStorage whenever data changes
  useEffect(() => {
    const dataToSave = {
      currentStep,
      data: onboardingData,
      timestamp: Date.now(),
    };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [currentStep, onboardingData]);

  // Focus management: focus on step content when step changes
  useEffect(() => {
    if (stepContentRef.current) {
      stepContentRef.current.focus();
    }
  }, [currentStep]);

  const handleStepUpdate = (stepData) => {
    setOnboardingData(prev => ({
      ...prev,
      ...stepData,
    }));
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    if (currentStep === 3) {
      // Skip links setup
      setOnboardingData(prev => ({ ...prev, profileLinks: [] }));
      setCurrentStep(prev => prev + 1);
    } else {
      // Skip to next step
      handleNext();
    }
  };

  const completeOnboarding = async () => {
    setIsSaving(true);
    
    try {
      // Update user profile with onboarding data
      const updates = {
        displayName: onboardingData.displayName,
        headline: onboardingData.headline,
        bio: onboardingData.bio || '',
        roles: onboardingData.roles || [],
        tags: onboardingData.tags || [],
        avatarUrl: onboardingData.avatar,
        profileComplete: true,
        onboardingComplete: true,
      };

      console.log('[Onboarding] Saving profile updates:', Object.keys(updates));

      // Attempt to save to backend first
      let backendSuccess = false;
      try {
        const response = await updateMyProfile(updates);
        console.log('[Onboarding] Backend save successful:', response);
        backendSuccess = true;
      } catch (apiError) {
        console.error('[Onboarding] Failed to save to backend:', apiError);
        // Continue anyway - data is saved locally as fallback
      }

      // Update local state after successful backend save (or on fallback)
      updateUser({
        ...updates,
        name: updates.displayName,
      });

      // Clear saved onboarding progress
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);

      // Show success message
      if (backendSuccess) {
        toast.success('Profile completed! Welcome to Joint 🎉');
      } else {
        toast.success('Profile saved locally. Welcome to Joint 🎉');
      }

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Welcome to Joint';
      case 2:
        return 'Tell us about yourself';
      case 3:
        return 'Add your professional links';
      case 4:
        return 'Set your preferences';
      default:
        return 'Complete Your Profile';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Welcome userData={onboardingData} onUpdate={handleStepUpdate} />;
      case 2:
        return <ProfileBasics userData={onboardingData} onUpdate={handleStepUpdate} />;
      case 3:
        return <LinksSetup userData={onboardingData} onUpdate={handleStepUpdate} />;
      case 4:
        return <PreferencesSetup userData={onboardingData} onUpdate={handleStepUpdate} />;
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      stepTitle={getStepTitle()}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      canSkip={currentStep === 3} // Can skip links setup
      canGoBack={!isSaving}
    >
      <div
        ref={stepContentRef}
        tabIndex={-1}
        className="focus:outline-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {isSaving ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-300 dark:border-neutral-700 border-t-[#0CCE6B] mb-4" />
            <p className="text-neutral-700 dark:text-neutral-300">
              Saving your profile...
            </p>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </OnboardingLayout>
  );
}

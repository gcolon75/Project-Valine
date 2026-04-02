// src/pages/Onboarding/index.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OnboardingLayout from './OnboardingLayout';
import Welcome from './steps/Welcome';
import ProfileBasics from './steps/ProfileBasics';
import LinksSetup from './steps/LinksSetup';
import PreferencesSetup from './steps/PreferencesSetup';
import PhoneVerification from './steps/PhoneVerification';
import toast from 'react-hot-toast';
import { updateMyProfile } from '../../services/profileService';
import { uploadMedia } from '../../services/mediaService';

const ONBOARDING_STORAGE_KEY = 'valine-onboarding-progress';
const TOTAL_STEPS = 5;

/**
 * Convert a base64 data URL to a Blob
 * @param {string} dataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @returns {Blob} - Blob object
 */
const dataUrlToBlob = (dataUrl) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Check if a string is a base64 data URL
 * @param {string} str - String to check
 * @returns {boolean} - True if it's a data URL
 */
const isDataUrl = (str) => {
  return str && typeof str === 'string' && str.startsWith('data:');
};

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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const stepContentRef = useRef(null);

  // Initialize onboarding data from localStorage or user data
  const [onboardingData, setOnboardingData] = useState(() => {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore saved progress if it belongs to the current user
        if (parsed.userId && parsed.userId === user?.id) {
          setCurrentStep(parsed.currentStep || 1);
          return parsed.data || {};
        } else {
          // Clear stale data from a different user
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to parse saved onboarding data', e);
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }

    return {
      displayName: user?.displayName || user?.name || '',
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
    if (!user?.id) return; // Don't save without a user ID
    const dataToSave = {
      userId: user.id,
      currentStep,
      data: onboardingData,
      timestamp: Date.now(),
    };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [currentStep, onboardingData, user?.id]);

  // Focus management: focus on step content when step changes
  useEffect(() => {
    if (stepContentRef.current) {
      stepContentRef.current.focus();
    }
  }, [currentStep]);

  const handlePhoneVerified = () => {
    setPhoneVerified(true);
  };

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
      // Defensive check - onboardingData should always be initialized but check anyway
      if (!onboardingData) {
        console.error('[Onboarding] onboardingData is null/undefined');
        toast.error('Something went wrong. Please refresh and try again.');
        return;
      }

      // Upload avatar to S3 if it's a base64 data URL
      let avatarUrl = null;
      if (onboardingData.avatar && isDataUrl(onboardingData.avatar)) {
        try {
          console.log('[Onboarding] Uploading avatar to S3...');
          const avatarBlob = dataUrlToBlob(onboardingData.avatar);
          const profileId = user?.id || 'me';
          const result = await uploadMedia(profileId, avatarBlob, 'image', {
            title: 'Profile Avatar',
            description: 'Profile picture from onboarding',
            privacy: 'public',
          });
          if (result?.s3Url) {
            avatarUrl = result.s3Url;
            console.log('[Onboarding] Avatar uploaded successfully:', avatarUrl);
          }
        } catch (uploadError) {
          console.error('[Onboarding] Failed to upload avatar:', uploadError);
          // Don't block onboarding completion, but warn user
          toast.error('Could not upload profile picture. You can add it later in settings.');
        }
      } else if (onboardingData.avatar && !isDataUrl(onboardingData.avatar)) {
        // Already an S3 URL or external URL
        avatarUrl = onboardingData.avatar;
      }

      // Upload banner to S3 if it's a base64 data URL
      let bannerUrl = null;
      if (onboardingData.banner && isDataUrl(onboardingData.banner)) {
        try {
          console.log('[Onboarding] Uploading banner to S3...');
          const bannerBlob = dataUrlToBlob(onboardingData.banner);
          const profileId = user?.id || 'me';
          const result = await uploadMedia(profileId, bannerBlob, 'image', {
            title: 'Profile Banner',
            description: 'Cover banner from onboarding',
            privacy: 'public',
          });
          if (result?.s3Url) {
            bannerUrl = result.s3Url;
            console.log('[Onboarding] Banner uploaded successfully:', bannerUrl);
          }
        } catch (uploadError) {
          console.error('[Onboarding] Failed to upload banner:', uploadError);
          // Don't block onboarding completion
          toast.error('Could not upload cover banner. You can add it later in settings.');
        }
      } else if (onboardingData.banner && !isDataUrl(onboardingData.banner)) {
        // Already an S3 URL or external URL
        bannerUrl = onboardingData.banner;
      }

      // Update user profile with onboarding data
      const updates = {
        displayName: onboardingData.displayName || '',
        title: onboardingData.title || '',
        location: onboardingData.location || '',
        bio: onboardingData.bio || '',
        roles: onboardingData.roles || [],
        tags: onboardingData.tags || [],
        avatarUrl: avatarUrl,
        bannerUrl: bannerUrl,
        links: onboardingData.profileLinks || [],
        // Notification preferences
        notifyOnFollow: onboardingData.emailNotifications ?? true,
        notifyOnMessage: onboardingData.messageNotifications ?? true,
        // Note: projectNotifications maps to future audition notifications feature
        // Privacy settings - map frontend values to backend enum
        visibility: onboardingData.profileVisibility === 'private' ? 'FOLLOWERS_ONLY' : 'PUBLIC',
        // Note: contactPreferences is stored in frontend state only for now
        profileComplete: true,
        onboardingComplete: true,
      };

      console.log('[Onboarding] Saving profile updates:', Object.keys(updates));

      // Attempt to save to backend
      let backendSuccess = false;
      try {
        const response = await updateMyProfile(updates);
        console.log('[Onboarding] Backend save successful:', response);
        backendSuccess = true;
      } catch (apiError) {
        console.error('[Onboarding] Failed to save to backend:', apiError);
        // Show error but don't prevent navigation - user can try again later
      }

      if (backendSuccess) {
        // Update local state after successful backend save
        // Include both displayName and name for backward compatibility
        updateUser({
          ...updates,
          name: updates.displayName,
        });

        // Clear saved onboarding progress
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);

        // Show success message
        toast.success('Profile completed! Welcome to Joint 🎉');

        // Navigate to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        // Backend save failed - show warning but still update local state
        // so user can proceed, but they may need to complete onboarding again
        updateUser({
          ...updates,
          name: updates.displayName,
          // Note: onboardingComplete may not persist if backend failed
        });

        // INTENTIONALLY preserve localStorage data on backend failure
        // This allows users to resume onboarding without re-entering data
        // if they need to complete onboarding again on their next login

        toast.error('Could not save profile to server. Your changes are saved locally, but you may need to complete onboarding again on your next login.');

        // Navigate anyway after a longer delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2500);
      }
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
      case 5:
        return 'Verify Your Phone';
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
      case 5:
        return <PhoneVerification onVerified={handlePhoneVerified} />;
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
      canNext={currentStep !== 5 || phoneVerified}
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

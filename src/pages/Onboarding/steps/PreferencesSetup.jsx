// src/pages/Onboarding/steps/PreferencesSetup.jsx
import { useState, useEffect } from 'react';
import { Bell, Mail, Shield, Check } from 'lucide-react';

/**
 * PreferencesSetup Step - Final preferences and privacy settings
 */
export default function PreferencesSetup({ userData, onUpdate }) {
  const [preferences, setPreferences] = useState({
    emailNotifications: userData?.emailNotifications ?? true,
    projectNotifications: userData?.projectNotifications ?? true,
    messageNotifications: userData?.messageNotifications ?? true,
    profileVisibility: userData?.profileVisibility || 'public',
    contactPreferences: {
      email: userData?.contactPreferences?.email ?? true,
      phone: userData?.contactPreferences?.phone ?? false,
      platform: userData?.contactPreferences?.platform ?? true,
    },
    ...userData,
  });

  // Update parent component when preferences change
  useEffect(() => {
    onUpdate(preferences);
  }, [preferences]);

  const handleToggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContactToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      contactPreferences: {
        ...prev.contactPreferences,
        [key]: !prev.contactPreferences[key]
      }
    }));
  };

  const handleVisibilityChange = (value) => {
    setPreferences(prev => ({ ...prev, profileVisibility: value }));
  };

  const NotificationOption = ({ icon: Icon, title, description, checked, onChange }) => (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-[#0CCE6B] transition-colors">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </div>
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
          {title}
        </h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="relative w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0CCE6B] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0CCE6B]">
        </div>
        <span className="sr-only">{checked ? 'Disable' : 'Enable'} {title}</span>
      </label>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Notification Preferences */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Notification Preferences
          </h3>
        </div>
        <div className="space-y-3">
          <NotificationOption
            icon={Mail}
            title="Email Notifications"
            description="Receive updates about your account and activity via email"
            checked={preferences.emailNotifications}
            onChange={() => handleToggle('emailNotifications')}
          />
          <NotificationOption
            icon={Bell}
            title="Project Notifications"
            description="Get notified about new opportunities and auditions"
            checked={preferences.projectNotifications}
            onChange={() => handleToggle('projectNotifications')}
          />
          <NotificationOption
            icon={Mail}
            title="Message Notifications"
            description="Receive alerts when you get new messages"
            checked={preferences.messageNotifications}
            onChange={() => handleToggle('messageNotifications')}
          />
        </div>
      </div>

      {/* Profile Visibility */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Profile Visibility
          </h3>
        </div>
        <div className="space-y-3">
          <label
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              preferences.profileVisibility === 'public'
                ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={preferences.profileVisibility === 'public'}
              onChange={() => handleVisibilityChange('public')}
              className="sr-only"
            />
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
              preferences.profileVisibility === 'public'
                ? 'border-[#0CCE6B] bg-[#0CCE6B]'
                : 'border-neutral-400 dark:border-neutral-600'
            }`}>
              {preferences.profileVisibility === 'public' && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                Public Profile
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Your profile is visible to everyone. Recommended for finding opportunities.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              preferences.profileVisibility === 'connections'
                ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="connections"
              checked={preferences.profileVisibility === 'connections'}
              onChange={() => handleVisibilityChange('connections')}
              className="sr-only"
            />
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
              preferences.profileVisibility === 'connections'
                ? 'border-[#0CCE6B] bg-[#0CCE6B]'
                : 'border-neutral-400 dark:border-neutral-600'
            }`}>
              {preferences.profileVisibility === 'connections' && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                Connections Only
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Only your connections can view your full profile.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              preferences.profileVisibility === 'private'
                ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={preferences.profileVisibility === 'private'}
              onChange={() => handleVisibilityChange('private')}
              className="sr-only"
            />
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
              preferences.profileVisibility === 'private'
                ? 'border-[#0CCE6B] bg-[#0CCE6B]'
                : 'border-neutral-400 dark:border-neutral-600'
            }`}>
              {preferences.profileVisibility === 'private' && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                Private Profile
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Your profile is hidden from search and only visible when you share your link.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Contact Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          How can people contact you?
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
            <input
              type="checkbox"
              checked={preferences.contactPreferences.platform}
              onChange={() => handleContactToggle('platform')}
              className="w-4 h-4 text-[#0CCE6B] border-neutral-300 dark:border-neutral-600 rounded focus:ring-2 focus:ring-[#0CCE6B]"
            />
            <span className="text-sm text-neutral-900 dark:text-white">
              Platform messaging
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
            <input
              type="checkbox"
              checked={preferences.contactPreferences.email}
              onChange={() => handleContactToggle('email')}
              className="w-4 h-4 text-[#0CCE6B] border-neutral-300 dark:border-neutral-600 rounded focus:ring-2 focus:ring-[#0CCE6B]"
            />
            <span className="text-sm text-neutral-900 dark:text-white">
              Email
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
            <input
              type="checkbox"
              checked={preferences.contactPreferences.phone}
              onChange={() => handleContactToggle('phone')}
              className="w-4 h-4 text-[#0CCE6B] border-neutral-300 dark:border-neutral-600 rounded focus:ring-2 focus:ring-[#0CCE6B]"
            />
            <span className="text-sm text-neutral-900 dark:text-white">
              Phone (if provided)
            </span>
          </label>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <p className="text-sm text-neutral-700 dark:text-neutral-400">
          <strong>Note:</strong> You can change these settings anytime from your account settings page.
        </p>
      </div>
    </div>
  );
}

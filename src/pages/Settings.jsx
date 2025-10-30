// src/pages/Settings.jsx
import { useState } from 'react';
import { User, Bell, Lock, Palette, Globe, HelpCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Account Settings */}
        <SettingsSection
          icon={User}
          title="Account"
          description="Manage your account settings"
        >
          <SettingItem label="Email" value="dev@valine.com" />
          <SettingItem label="Username" value="@developer" />
          <SettingItem label="Display Name" value="Dev User" />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Configure notification preferences"
        >
          <SettingToggle label="Email Notifications" defaultChecked />
          <SettingToggle label="Push Notifications" defaultChecked />
          <SettingToggle label="Connection Requests" defaultChecked />
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection
          icon={Lock}
          title="Privacy & Security"
          description="Control your privacy settings"
        >
          <SettingToggle label="Private Profile" />
          <SettingToggle label="Show Email" />
          <SettingToggle label="Allow Messages from Anyone" defaultChecked />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Customize how Project Valine looks"
        >
          <div className="flex items-center justify-between py-4">
            <span className="text-neutral-900 dark:text-white">Theme</span>
            <ThemeToggle />
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

// Settings Section Component
function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>
      </div>
      <div className="space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-4">
        {children}
      </div>
    </div>
  );
}

// Setting Item Component
function SettingItem({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="text-neutral-900 dark:text-white font-medium">{value}</span>
    </div>
  );
}

// Setting Toggle Component
function SettingToggle({ label, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-neutral-900 dark:text-white">{label}</span>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-[#0CCE6B]' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

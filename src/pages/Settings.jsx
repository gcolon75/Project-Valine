// src/pages/Settings.jsx
import { useState } from 'react';
import { 
  User, Bell, Lock, Palette, Shield, Image, Download, 
  Trash2, Eye, Mail, Key, Smartphone, ExternalLink,
  CreditCard, FileText, Share2
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [activeModal, setActiveModal] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  
  // Form states
  const [emailForm, setEmailForm] = useState({ email: user?.email || 'user@valine.com' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [reelAccess, setReelAccess] = useState('on-request');
  const [contactPermissions, setContactPermissions] = useState('anyone');
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    messages: true,
    requests: true,
    mentions: true,
    pushEnabled: false
  });

  const handleChangePassword = async (password) => {
    // TODO: Implement password change API call
    console.log('Changing password...', passwordForm);
    setActiveModal(null);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  const handleDeleteAccount = async (password) => {
    // TODO: Implement account deletion API call
    console.log('Deleting account with password:', password);
    setActiveModal(null);
  };

  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Exporting user data...');
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        Settings
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Manage your account settings and preferences
      </p>

      <div className="space-y-6">
        {/* Account Settings */}
        <SettingsSection
          icon={User}
          title="Account"
          description="Manage your account information"
        >
          <SettingItem label="Email" value={emailForm.email}>
            <button 
              onClick={() => setEditingSection('email')}
              className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-medium"
            >
              Change
            </button>
          </SettingItem>
          
          {editingSection === 'email' && (
            <div className="pl-4 pb-4 space-y-3 border-l-2 border-neutral-200 dark:border-neutral-700">
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ email: e.target.value })}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="New email address"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // TODO: Save email
                    setEditingSection(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg text-sm font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <SettingItem label="Username" value={`@${user?.username || 'username'}`} />
          <SettingItem label="Display Name" value={user?.displayName || 'User Name'} />
          <SettingItem label="Member Since" value="January 2024" />
        </SettingsSection>

        {/* Security */}
        <SettingsSection
          icon={Shield}
          title="Security"
          description="Keep your account secure"
        >
          <SettingItem label="Password">
            <button 
              onClick={() => setActiveModal('change-password')}
              className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-medium"
            >
              Change Password
            </button>
          </SettingItem>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}
              </p>
            </div>
            <button
              onClick={() => setActiveModal('setup-2fa')}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
            >
              {twoFactorEnabled ? 'Manage' : 'Setup'}
            </button>
          </div>
          
          <SettingItem label="Connected Accounts">
            <button className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-medium">
              Manage
            </button>
          </SettingItem>
        </SettingsSection>

        {/* Privacy & Visibility */}
        <SettingsSection
          icon={Eye}
          title="Privacy & Visibility"
          description="Control who can see your content"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Profile Visibility
              </label>
              <select
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">Public - Anyone can view</option>
                <option value="network">Network Only - Only connections</option>
                <option value="private">Private - Only you</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Reel Access Default
              </label>
              <select
                value={reelAccess}
                onChange={(e) => setReelAccess(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">Public - Anyone can watch</option>
                <option value="on-request">On Request - Requires approval</option>
                <option value="private">Private - Only you</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Contact Permissions
              </label>
              <select
                value={contactPermissions}
                onChange={(e) => setContactPermissions(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="anyone">Anyone can message me</option>
                <option value="verified">Only verified users</option>
                <option value="connections">Only my connections</option>
              </select>
            </div>
            
            <SettingToggle 
              label="Share Analytics" 
              description="Allow anonymous usage data to improve the platform"
              defaultChecked={false}
            />
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Configure notification preferences"
        >
          <SettingToggle 
            label="Email Digest" 
            description="Weekly summary of activity"
            checked={notifications.emailDigest}
            onChange={(checked) => setNotifications({...notifications, emailDigest: checked})}
          />
          <SettingToggle 
            label="New Messages" 
            description="Get notified when someone messages you"
            checked={notifications.messages}
            onChange={(checked) => setNotifications({...notifications, messages: checked})}
          />
          <SettingToggle 
            label="Connection Requests" 
            description="Notification when someone wants to connect"
            checked={notifications.requests}
            onChange={(checked) => setNotifications({...notifications, requests: checked})}
          />
          <SettingToggle 
            label="Mentions & Tags" 
            description="When someone mentions you in a post"
            checked={notifications.mentions}
            onChange={(checked) => setNotifications({...notifications, mentions: checked})}
          />
          <SettingToggle 
            label="Push Notifications" 
            description="Browser push notifications (requires permission)"
            checked={notifications.pushEnabled}
            onChange={(checked) => setNotifications({...notifications, pushEnabled: checked})}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Customize how Project Valine looks"
        >
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Theme</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </SettingsSection>

        {/* Data & Export */}
        <SettingsSection
          icon={Download}
          title="Data & Export"
          description="Download your data or manage your account"
        >
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Download className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <div className="text-left">
                  <p className="font-medium text-neutral-900 dark:text-white">Download Your Data</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Export your profile, posts, and media
                  </p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            
            <button
              onClick={() => setActiveModal('delete-account')}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="text-left">
                  <p className="font-medium text-red-600 dark:text-red-400">Delete Account</p>
                  <p className="text-sm text-red-600/70 dark:text-red-400/70">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
            </button>
          </div>
        </SettingsSection>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={activeModal === 'change-password'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleChangePassword}
        title="Change Password"
        message="Enter your current password and choose a new one."
        confirmText="Change Password"
        requirePassword={false}
      />
      
      <ConfirmationModal
        isOpen={activeModal === 'delete-account'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This action cannot be undone. All your data, posts, and media will be permanently deleted."
        confirmText="Delete Account"
        destructive={true}
        requirePassword={true}
      />
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
function SettingItem({ label, value, children }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      {children || (
        <span className="text-neutral-900 dark:text-white font-medium">{value}</span>
      )}
    </div>
  );
}

// Setting Toggle Component
function SettingToggle({ label, description, checked, onChange, defaultChecked = false }) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    const newValue = !isChecked;
    if (isControlled && onChange) {
      onChange(newValue);
    } else {
      setInternalChecked(newValue);
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="text-neutral-900 dark:text-white font-medium">{label}</p>
        {description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={handleToggle}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${
          isChecked ? 'bg-[#0CCE6B]' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
        aria-label={`Toggle ${label}`}
        role="switch"
        aria-checked={isChecked}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          isChecked ? 'translate-x-7' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

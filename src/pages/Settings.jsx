// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { 
  User, Bell, Lock, Palette, Shield, Image, Download, 
  Trash2, Eye, Mail, Key, Smartphone, ExternalLink,
  CreditCard, FileText, Share2, Loader2, Monitor, MapPin, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { exportAccountData, deleteAccount } from '../services/settingsService';
import { getSessions, revokeSession, isSessionTrackingEnabled } from '../services/sessionsService';
import { is2FAEnabled, get2FAStatus, enroll2FA, verifyEnrollment, disable2FA } from '../services/twoFactorService';
import { getMyProfile, updateMyProfile } from '../services/profileService';

export default function Settings() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeModal, setActiveModal] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  
  // 2FA state
  const [twoFactorStatus, setTwoFactorStatus] = useState({ enabled: false });
  const [twoFactorQR, setTwoFactorQR] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [isEnrolling2FA, setIsEnrolling2FA] = useState(false);
  
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

  // Privacy & Messaging preferences (Phase 2)
  const [privacySettings, setPrivacySettings] = useState({
    visibility: 'PUBLIC',
    messagePermission: 'EVERYONE',
    isSearchable: true,
    notifyOnFollow: true,
    notifyOnMessage: true,
    notifyOnPostShare: true
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Load sessions on mount if enabled
  useEffect(() => {
    if (isSessionTrackingEnabled()) {
      loadSessions();
    }
  }, []);

  // Load 2FA status if enabled
  useEffect(() => {
    if (is2FAEnabled()) {
      load2FAStatus();
    }
  }, []);

  // Load profile data for privacy & messaging settings
  useEffect(() => {
    loadProfileSettings();
  }, []);

  const loadProfileSettings = async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await getMyProfile();
      setPrivacySettings({
        visibility: profile.visibility || 'PUBLIC',
        messagePermission: profile.messagePermission || 'EVERYONE',
        isSearchable: profile.isSearchable !== undefined ? profile.isSearchable : true,
        notifyOnFollow: profile.notifyOnFollow !== undefined ? profile.notifyOnFollow : true,
        notifyOnMessage: profile.notifyOnMessage !== undefined ? profile.notifyOnMessage : true,
        notifyOnPostShare: profile.notifyOnPostShare !== undefined ? profile.notifyOnPostShare : true
      });
    } catch (error) {
      console.error('Failed to load profile settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeSession(sessionId);
      toast.success('Session terminated successfully');
      // Reload sessions
      await loadSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast.error('Failed to terminate session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const load2FAStatus = async () => {
    try {
      const status = await get2FAStatus();
      setTwoFactorStatus(status);
      setTwoFactorEnabled(status.enabled);
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    }
  };

  const handleEnroll2FA = async () => {
    setIsEnrolling2FA(true);
    try {
      const result = await enroll2FA();
      setTwoFactorQR(result.qrCode);
      setTwoFactorSecret(result.secret);
      setActiveModal('setup-2fa');
    } catch (error) {
      console.error('Failed to start 2FA enrollment:', error);
      toast.error(error.response?.data?.message || 'Failed to start 2FA enrollment');
    } finally {
      setIsEnrolling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      const result = await verifyEnrollment(twoFactorCode);
      setRecoveryCodes(result.recoveryCodes || []);
      setTwoFactorEnabled(true);
      toast.success('2FA enabled successfully!');
      setActiveModal('show-recovery-codes');
      setTwoFactorCode('');
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      toast.error(error.response?.data?.message || 'Invalid verification code');
    }
  };

  const handleDisable2FA = async (password) => {
    if (!password) {
      toast.error('Password is required');
      return;
    }

    try {
      await disable2FA(password);
      setTwoFactorEnabled(false);
      setTwoFactorStatus({ enabled: false });
      toast.success('2FA disabled successfully');
      setActiveModal(null);
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  const handleChangePassword = async (password) => {
    // TODO: Implement password change API call
    console.log('Changing password...', passwordForm);
    setActiveModal(null);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  const handleDeleteAccount = async (password) => {
    if (!password) {
      toast.error('Password is required');
      return;
    }

    setIsDeleting(true);
    
    try {
      await deleteAccount(password);
      
      toast.success('Account deleted successfully. We\'re sorry to see you go.');
      
      // Log out the user
      logout();
      
      // Redirect to home page
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error('Delete account error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to delete account. Please try again.';
      
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setActiveModal(null);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing your data export...');
    
    try {
      await exportAccountData();
      
      toast.success('Your data has been downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Export data error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to export data. Please try again.';
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSavePrivacySettings = async (updates) => {
    setIsSavingPrivacy(true);
    try {
      await updateMyProfile(updates);
      setPrivacySettings(prev => ({ ...prev, ...updates }));
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update settings';
      toast.error(errorMessage);
    } finally {
      setIsSavingPrivacy(false);
    }
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
              <label htmlFor="settings-email" className="sr-only">New email address</label>
              <input
                id="settings-email"
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ email: e.target.value })}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                placeholder="New email address"
                aria-label="New email address"
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
          <SettingItem label="Name" value={user?.displayName || 'User Name'} />
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
          
          {is2FAEnabled() && (
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Two-Factor Authentication</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {twoFactorEnabled ? 'Enabled - Extra layer of security active' : 'Add an extra layer of security'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (twoFactorEnabled) {
                    setActiveModal('disable-2fa');
                  } else {
                    handleEnroll2FA();
                  }
                }}
                disabled={isEnrolling2FA}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnrolling2FA ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : twoFactorEnabled ? (
                  'Disable'
                ) : (
                  'Setup'
                )}
              </button>
            </div>
          )}
          
          <SettingItem label="Connected Accounts">
            <button className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-medium">
              Manage
            </button>
          </SettingItem>
        </SettingsSection>

        {/* Active Sessions */}
        {isSessionTrackingEnabled() && (
          <SettingsSection
            icon={Monitor}
            title="Active Sessions"
            description="Manage devices and locations where you're logged in"
          >
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active sessions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Monitor className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        <p className="font-medium text-neutral-900 dark:text-white text-sm">
                          {session.userAgent || 'Unknown Device'}
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{session.ipAddress || 'Unknown location'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Last active: {new Date(session.lastActivity || session.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      className="ml-4 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revokingSessionId === session.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Terminate'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SettingsSection>
        )}

        {/* Privacy & Messaging (Phase 2) */}
        <SettingsSection
          icon={Lock}
          title="Privacy & Messaging"
          description="Control your privacy and messaging preferences"
        >
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Visibility */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-3">
                  Profile Visibility
                </label>
                <div className="space-y-2">
                  <label className="flex items-start p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="PUBLIC"
                      checked={privacySettings.visibility === 'PUBLIC'}
                      onChange={(e) => handleSavePrivacySettings({ visibility: e.target.value })}
                      disabled={isSavingPrivacy}
                      className="mt-1 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">Public</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Everyone can see your full profile
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="FOLLOWERS_ONLY"
                      checked={privacySettings.visibility === 'FOLLOWERS_ONLY'}
                      onChange={(e) => handleSavePrivacySettings({ visibility: e.target.value })}
                      disabled={isSavingPrivacy}
                      className="mt-1 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">Followers only</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Only your followers can see your full profile
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Searchable Toggle */}
              <SettingToggle
                label="Searchable"
                description="Allow my profile to appear in search results"
                checked={privacySettings.isSearchable}
                onChange={(checked) => handleSavePrivacySettings({ isSearchable: checked })}
              />

              {/* Who can message you */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-3">
                  Who can message you?
                </label>
                <div className="space-y-2">
                  <label className="flex items-start p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
                    <input
                      type="radio"
                      name="messagePermission"
                      value="EVERYONE"
                      checked={privacySettings.messagePermission === 'EVERYONE'}
                      onChange={(e) => handleSavePrivacySettings({ messagePermission: e.target.value })}
                      disabled={isSavingPrivacy}
                      className="mt-1 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">Everyone</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Anyone can send you direct messages
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
                    <input
                      type="radio"
                      name="messagePermission"
                      value="FOLLOWERS_ONLY"
                      checked={privacySettings.messagePermission === 'FOLLOWERS_ONLY'}
                      onChange={(e) => handleSavePrivacySettings({ messagePermission: e.target.value })}
                      disabled={isSavingPrivacy}
                      className="mt-1 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">Followers only</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Only your followers can message you
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-[#0CCE6B] transition-colors">
                    <input
                      type="radio"
                      name="messagePermission"
                      value="NO_ONE"
                      checked={privacySettings.messagePermission === 'NO_ONE'}
                      onChange={(e) => handleSavePrivacySettings({ messagePermission: e.target.value })}
                      disabled={isSavingPrivacy}
                      className="mt-1 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">No one</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Block all direct messages
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
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
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
          ) : (
            <>
              <SettingToggle 
                label="Notify when someone follows me" 
                description="Receive notifications when you gain a new follower"
                checked={privacySettings.notifyOnFollow}
                onChange={(checked) => handleSavePrivacySettings({ notifyOnFollow: checked })}
              />
              <SettingToggle 
                label="Notify when I receive a new message" 
                description="Get notified when someone sends you a direct message"
                checked={privacySettings.notifyOnMessage}
                onChange={(checked) => handleSavePrivacySettings({ notifyOnMessage: checked })}
              />
              <SettingToggle 
                label="Notify when someone shares a post with me" 
                description="Receive notifications when posts are shared with you"
                checked={privacySettings.notifyOnPostShare}
                onChange={(checked) => handleSavePrivacySettings({ notifyOnPostShare: checked })}
              />
            </>
          )}
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Customize how Joint looks"
        >
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Theme</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}. Light mode is the default theme.
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
              disabled={isExporting}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                {isExporting ? (
                  <Loader2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                )}
                <div className="text-left">
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {isExporting ? 'Exporting...' : 'Download Your Data'}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Export your profile, posts, and media
                  </p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            
            <button
              onClick={() => setActiveModal('delete-account')}
              disabled={isDeleting}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 text-red-600 dark:text-red-400 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <div className="text-left">
                  <p className="font-medium text-red-600 dark:text-red-400">
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </p>
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

      {/* 2FA Setup Modal */}
      {activeModal === 'setup-2fa' && twoFactorQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              Setup Two-Factor Authentication
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                </p>
                <div className="bg-white p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 flex justify-center">
                  <img src={twoFactorQR} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  Or enter this code manually:
                </p>
                <code className="block bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded text-sm font-mono text-neutral-900 dark:text-white">
                  {twoFactorSecret}
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Enter the 6-digit code from your app:
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFactorCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Enable
                </button>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setTwoFactorCode('');
                    setTwoFactorQR(null);
                    setTwoFactorSecret(null);
                  }}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Codes Modal */}
      {activeModal === 'show-recovery-codes' && recoveryCodes.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              Save Your Recovery Codes
            </h3>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Save these recovery codes in a safe place. You'll need them to access your account if you lose your authenticator device.
                </p>
              </div>

              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {recoveryCodes.map((code, i) => (
                    <div key={i} className="text-neutral-900 dark:text-white">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveModal(null);
                  setRecoveryCodes([]);
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-semibold"
              >
                I've Saved My Codes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'disable-2fa'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleDisable2FA}
        title="Disable Two-Factor Authentication"
        message="Are you sure you want to disable 2FA? This will make your account less secure."
        confirmText="Disable 2FA"
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

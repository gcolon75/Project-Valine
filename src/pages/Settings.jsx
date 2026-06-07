// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Bell, Lock, Palette, Shield, Download,
  Trash2, Monitor, MapPin, Clock, Loader2, ExternalLink
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

  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);

  const [twoFactorQR, setTwoFactorQR] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [isEnrolling2FA, setIsEnrolling2FA] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: user?.email || '' });

  const [privacySettings, setPrivacySettings] = useState({
    visibility: 'PUBLIC',
    messagePermission: 'EVERYONE',
    isSearchable: true,
    notifyOnFollow: true,
    notifyOnMessage: true,
    notifyOnPostShare: true,
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  useEffect(() => { if (isSessionTrackingEnabled()) loadSessions(); }, []);
  useEffect(() => { if (is2FAEnabled()) load2FAStatus(); }, []);
  useEffect(() => { loadProfileSettings(); }, []);

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
        notifyOnPostShare: profile.notifyOnPostShare !== undefined ? profile.notifyOnPostShare : true,
      });
    } catch (err) {
      console.error('Failed to load profile settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      toast.error('Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeSession(sessionId);
      toast.success('Session terminated');
      await loadSessions();
    } catch (err) {
      console.error('Failed to revoke session:', err);
      toast.error('Failed to terminate session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const load2FAStatus = async () => {
    try {
      const status = await get2FAStatus();
      setTwoFactorEnabled(status.enabled);
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    }
  };

  const handleEnroll2FA = async () => {
    setIsEnrolling2FA(true);
    try {
      const result = await enroll2FA();
      setTwoFactorQR(result.qrCode);
      setTwoFactorSecret(result.secret);
      setActiveModal('setup-2fa');
    } catch (err) {
      console.error('Failed to start 2FA enrollment:', err);
      toast.error(err.response?.data?.message || 'Failed to start 2FA enrollment');
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
    } catch (err) {
      console.error('Failed to verify 2FA code:', err);
      toast.error(err.response?.data?.message || 'Invalid verification code');
    }
  };

  const handleDisable2FA = async (password) => {
    if (!password) { toast.error('Password is required'); return; }
    try {
      await disable2FA(password);
      setTwoFactorEnabled(false);
      toast.success('2FA disabled');
      setActiveModal(null);
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  const handleChangePassword = async () => {
    setActiveModal(null);
  };

  const handleDeleteAccount = async (password) => {
    if (!password) { toast.error('Password is required'); return; }
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      toast.success("Account deleted. We're sorry to see you go.");
      logout();
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete account.');
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
      toast.success('Download started!', { id: toastId });
    } catch (err) {
      console.error('Export data error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to export data.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSavePrivacy = async (updates) => {
    setIsSavingPrivacy(true);
    try {
      await updateMyProfile(updates);
      setPrivacySettings(prev => ({ ...prev, ...updates }));
      toast.success('Saved');
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-neutral-900 mb-8">Settings</h1>

      <div className="space-y-4">

        {/* Account */}
        <Section icon={User} title="Account" description="Manage your account information">
          <Row label="Email" value={emailForm.email || user?.email}>
            <button
              onClick={() => setEditingSection(editingSection === 'email' ? null : 'email')}
              className="text-xs font-medium text-[#0CCE6B] hover:text-[#0BBE60] transition-colors"
            >
              Change
            </button>
          </Row>
          {editingSection === 'email' && (
            <div className="px-6 pb-4 space-y-3">
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ email: e.target.value })}
                className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                placeholder="New email address"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-1.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-xs font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-1.5 border border-neutral-200 text-neutral-600 text-xs font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <Row label="Username" value={`@${user?.username || 'username'}`} />
          <Row label="Name" value={user?.displayName || 'User Name'} />
          <Row label="Member Since" value="January 2024" />
        </Section>

        {/* Security */}
        <Section icon={Shield} title="Security" description="Keep your account secure">
          <Row label="Password" description="Change your account password">
            <button
              onClick={() => setActiveModal('change-password')}
              className="px-3 py-1.5 border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors"
            >
              Change Password
            </button>
          </Row>

          {is2FAEnabled() && (
            <Row
              label="Two-Factor Authentication"
              description={twoFactorEnabled ? 'Enabled — extra layer of security active' : 'Add an extra layer of security'}
            >
              <button
                onClick={() => twoFactorEnabled ? setActiveModal('disable-2fa') : handleEnroll2FA()}
                disabled={isEnrolling2FA}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {isEnrolling2FA && <Loader2 className="w-3 h-3 animate-spin" />}
                {isEnrolling2FA ? 'Loading…' : twoFactorEnabled ? 'Disable' : 'Set Up'}
              </button>
            </Row>
          )}

          <Row label="Connected Accounts" description="Manage linked third-party accounts">
            <button className="text-xs font-medium text-[#0CCE6B] hover:text-[#0BBE60] transition-colors">
              Manage
            </button>
          </Row>
        </Section>

        {/* Active Sessions */}
        {isSessionTrackingEnabled() && (
          <Section icon={Monitor} title="Active Sessions" description="Devices and locations where you're logged in">
            {isLoadingSessions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Monitor className="w-7 h-7 mx-auto mb-2 text-neutral-300" />
                <p className="text-sm text-neutral-500">No active sessions found</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="px-6 py-4 flex items-start justify-between gap-4 border-b border-neutral-100 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {session.userAgent || 'Unknown Device'}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-xs text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span>{session.ipAddress || 'Unknown location'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Last active: {new Date(session.lastActivity || session.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingSessionId === session.id}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {revokingSessionId === session.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : 'Terminate'}
                  </button>
                </div>
              ))
            )}
          </Section>
        )}

        {/* Privacy & Messaging */}
        <Section icon={Lock} title="Privacy & Messaging" description="Control who can see and contact you">
          {isLoadingProfile ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-neutral-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Profile Visibility</p>
                <div className="space-y-3">
                  {[
                    { value: 'PUBLIC', label: 'Public', desc: 'Everyone can see your full profile' },
                    { value: 'FOLLOWERS_ONLY', label: 'Network only', desc: 'Only your connections can see your full profile' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.value}
                        checked={privacySettings.visibility === opt.value}
                        onChange={(e) => handleSavePrivacy({ visibility: e.target.value })}
                        disabled={isSavingPrivacy}
                        className="sr-only"
                      />
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        privacySettings.visibility === opt.value ? 'border-emerald-400' : 'border-neutral-300'
                      }`}>
                        {privacySettings.visibility === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{opt.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Toggle
                label="Searchable"
                description="Allow your profile to appear in search results"
                checked={privacySettings.isSearchable}
                onChange={(v) => handleSavePrivacy({ isSearchable: v })}
              />

              <div className="px-6 py-4 border-b border-neutral-100 last:border-b-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Who can message you</p>
                <div className="space-y-3">
                  {[
                    { value: 'EVERYONE', label: 'Everyone', desc: 'Anyone can send you direct messages' },
                    { value: 'FOLLOWERS_ONLY', label: 'Network only', desc: 'Only your connections can message you' },
                    { value: 'NO_ONE', label: 'No one', desc: 'Block all direct messages' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="messagePermission"
                        value={opt.value}
                        checked={privacySettings.messagePermission === opt.value}
                        onChange={(e) => handleSavePrivacy({ messagePermission: e.target.value })}
                        disabled={isSavingPrivacy}
                        className="sr-only"
                      />
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        privacySettings.messagePermission === opt.value ? 'border-emerald-400' : 'border-neutral-300'
                      }`}>
                        {privacySettings.messagePermission === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{opt.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications" description="Configure when you get notified">
          {isLoadingProfile ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
            </div>
          ) : (
            <>
              <Toggle
                label="New connection"
                description="When someone connects with you"
                checked={privacySettings.notifyOnFollow}
                onChange={(v) => handleSavePrivacy({ notifyOnFollow: v })}
              />
              <Toggle
                label="New message"
                description="When someone sends you a direct message"
                checked={privacySettings.notifyOnMessage}
                onChange={(v) => handleSavePrivacy({ notifyOnMessage: v })}
              />
              <Toggle
                label="Post shared with me"
                description="When someone shares a post directly with you"
                checked={privacySettings.notifyOnPostShare}
                onChange={(v) => handleSavePrivacy({ notifyOnPostShare: v })}
              />
            </>
          )}
        </Section>

        {/* Appearance */}
        <Section icon={Palette} title="Appearance" description="Customize how Joint looks">
          <Row label="Theme" description={`Currently ${theme === 'dark' ? 'dark' : 'light'} mode`}>
            <ThemeToggle />
          </Row>
        </Section>

        {/* Data & Export */}
        <Section icon={Download} title="Data & Export" description="Download your data or manage your account">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group border-b border-neutral-100"
          >
            <div className="flex items-center gap-3">
              {isExporting
                ? <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                : <Download className="w-4 h-4 text-neutral-400" />}
              <div>
                <p className="text-sm font-medium text-neutral-900">{isExporting ? 'Exporting…' : 'Download Your Data'}</p>
                <p className="text-xs text-neutral-500 mt-0.5">Export your profile, posts, and media</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
          </button>

          <button
            onClick={() => setActiveModal('delete-account')}
            disabled={isDeleting}
            className="w-full px-6 py-4 flex items-center gap-3 text-left hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting
              ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
              : <Trash2 className="w-4 h-4 text-red-400" />}
            <div>
              <p className="text-sm font-medium text-red-600">{isDeleting ? 'Deleting…' : 'Delete Account'}</p>
              <p className="text-xs text-red-400 mt-0.5">Permanently delete your account and all data</p>
            </div>
          </button>
        </Section>

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

      {activeModal === 'setup-2fa' && twoFactorQR && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-6 border border-neutral-200">
            <h3 className="text-base font-semibold text-neutral-900 mb-5">Set Up Two-Factor Authentication</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-3">Scan this QR code with your authenticator app:</p>
                <div className="border border-neutral-200 p-4 flex justify-center">
                  <img src={twoFactorQR} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-2">Or enter this code manually:</p>
                <code className="block bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm font-mono text-neutral-900 break-all">
                  {twoFactorSecret}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Enter the 6-digit code from your app:
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full border border-neutral-200 px-4 py-2.5 text-neutral-900 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFactorCode.length !== 6}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Verify & Enable
                </button>
                <button
                  onClick={() => { setActiveModal(null); setTwoFactorCode(''); setTwoFactorQR(null); setTwoFactorSecret(null); }}
                  className="px-4 py-2.5 border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {activeModal === 'show-recovery-codes' && recoveryCodes.length > 0 && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-6 border border-neutral-200">
            <h3 className="text-base font-semibold text-neutral-900 mb-5">Save Your Recovery Codes</h3>
            <div className="space-y-4">
              <div className="border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-800">
                  Save these codes in a safe place. You'll need them if you lose access to your authenticator.
                </p>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm text-neutral-900">
                  {recoveryCodes.map((code, i) => <div key={i}>{code}</div>)}
                </div>
              </div>
              <button
                onClick={() => { setActiveModal(null); setRecoveryCodes([]); }}
                className="w-full py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-medium transition-colors"
              >
                I've Saved My Codes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="border border-neutral-200 bg-white overflow-hidden">
      <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200 flex items-center gap-3">
        <Icon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value, description, children }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-6 border-b border-neutral-100 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-neutral-700">{label}</p>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {children || (value && <span className="text-sm font-medium text-neutral-900">{value}</span>)}
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange, defaultChecked = false }) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    const newValue = !isChecked;
    if (isControlled && onChange) onChange(newValue);
    else setInternalChecked(newValue);
  };

  return (
    <div className="px-6 py-4 flex items-center justify-between gap-6 border-b border-neutral-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={handleToggle}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${isChecked ? 'bg-[#0CCE6B]' : 'bg-neutral-200'}`}
        role="switch"
        aria-checked={isChecked}
        aria-label={`Toggle ${label}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

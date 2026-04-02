import { useState, useEffect, useRef } from 'react';
import { Phone, CheckCircle, Shield } from 'lucide-react';
import { sendVerificationCode, verifyPhoneCode } from '../../../services/phoneService';
import Button from '../../../components/ui/Button';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * PhoneVerification Step — required onboarding step.
 * Phase 1: user enters their phone number and requests a code.
 * Phase 2: user enters the 6-digit OTP.
 * Phase 3: verified — parent is notified via onVerified().
 */
export default function PhoneVerification({ onVerified }) {
  const [phase, setPhase] = useState('enter-phone'); // 'enter-phone' | 'enter-code' | 'verified'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef(null);
  const cooldownRef = useRef(null);

  // Tick down the resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // Auto-focus the code input when we enter the code phase
  useEffect(() => {
    if (phase === 'enter-code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [phase]);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    // Basic E.164 check — allow +1... formats as well as just digits for convenience
    const normalized = phone.trim().startsWith('+') ? phone.trim() : `+1${phone.trim().replace(/\D/g, '')}`;
    const e164 = /^\+[1-9]\d{7,14}$/.test(normalized);
    if (!e164) {
      setError('Enter a valid phone number (e.g. +15551234567 or a 10-digit US number).');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await sendVerificationCode(normalized);
      // Store normalized form for verify step
      setPhone(normalized);
      setPhase('enter-code');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.trim().length !== 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await verifyPhoneCode(phone, code.trim());
      setPhase('verified');
      onVerified();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Incorrect code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCode('');
    setError(null);
    setIsLoading(true);
    try {
      await sendVerificationCode(phone);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verified state ──────────────────────────────────────────────────────────
  if (phase === 'verified') {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-4">
        <div className="w-20 h-20 rounded-full bg-[#0CCE6B]/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-[#0CCE6B]" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Phone verified!
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-xs">
          {phone} has been verified. Click <strong>Complete</strong> to finish your profile.
        </p>
      </div>
    );
  }

  // ── Enter phone ─────────────────────────────────────────────────────────────
  if (phase === 'enter-phone') {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
          <Shield className="w-5 h-5 text-[#0CCE6B] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            We'll send a one-time code to verify your number. Standard messaging rates may apply.
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
            Phone Number <span className="text-red-500" aria-label="required">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-600" aria-hidden="true" />
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSendCode()}
              placeholder="+1 (555) 000-0000"
              className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-800 border rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-transparent ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-700 focus:ring-[#0CCE6B]'
              }`}
              aria-describedby={error ? 'phone-error' : 'phone-hint'}
            />
          </div>
          {error ? (
            <p id="phone-error" className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">{error}</p>
          ) : (
            <p id="phone-hint" className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              International format (e.g. +15551234567) or 10-digit US number
            </p>
          )}
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleSendCode}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Sending…' : 'Send Verification Code'}
        </Button>
      </div>
    );
  }

  // ── Enter code ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
        <Shield className="w-5 h-5 text-[#0CCE6B] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          We sent a 6-digit code to <strong>{phone}</strong>.{' '}
          <button
            onClick={() => { setPhase('enter-phone'); setCode(''); setError(null); }}
            className="text-[#0CCE6B] hover:underline font-medium"
          >
            Change number
          </button>
        </p>
      </div>

      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Verification Code <span className="text-red-500" aria-label="required">*</span>
        </label>
        <input
          id="otp"
          ref={codeInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
          placeholder="123456"
          className={`w-full px-4 py-3 bg-white dark:bg-neutral-800 border rounded-lg text-neutral-900 dark:text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-neutral-400 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:border-transparent ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-700 focus:ring-[#0CCE6B]'
          }`}
          aria-describedby={error ? 'code-error' : undefined}
          autoComplete="one-time-code"
        />
        {error && (
          <p id="code-error" className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">{error}</p>
        )}
      </div>

      <Button
        variant="primary"
        className="w-full"
        onClick={handleVerifyCode}
        disabled={isLoading || code.length !== 6}
        aria-busy={isLoading}
      >
        {isLoading ? 'Verifying…' : 'Verify Code'}
      </Button>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Didn't receive it?{' '}
        {cooldown > 0 ? (
          <span className="text-neutral-400">Resend in {cooldown}s</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={isLoading}
            className="text-[#0CCE6B] hover:underline font-medium disabled:opacity-50"
          >
            Resend code
          </button>
        )}
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles, Code, AtSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { isEmailAllowed, isAllowlistActive } from '../utils/allowlistConfig';
import RestrictedRegistrationNotice from '../components/RestrictedRegistrationNotice';

const Join = () => {
  const navigate = useNavigate();
  const { register, devLogin, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Show restriction notice if allowlist is active
  // (actual enforcement happens on backend, this is just UX improvement)
  const allowlistActive = isAllowlistActive();

  // Validate a single field
  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        if (!value) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 30) return 'Username must be 30 characters or less';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        return '';
      case 'displayName':
        if (!value.trim()) return 'Display name is required';
        if (value.length > 100) return 'Display name must be 100 characters or less';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must include at least one number';
        if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.email || !formData.password || !formData.displayName) {
      toast.error('Please fill in all fields');
      return;
    }

    // Check Terms acceptance
    if (!acceptedTerms) {
      toast.error('You must agree to the Terms of Service and acknowledge the Privacy Policy');
      return;
    }

    // Client-side allowlist check (for better UX, actual enforcement on backend)
    if (allowlistActive && !isEmailAllowed(formData.email)) {
      toast.error('Registration is restricted to pre-approved accounts only.');
      return;
    }
    
    try {
      const user = await register(formData);
      
      // Check if user needs email verification
      if (user.emailVerified === false) {
        toast.success('Account created! Please check your email to verify your account.');
        // Redirect to a verification pending page or show message
        navigate('/verify-email?registered=true');
      } else {
        // If no email verification required (dev mode or disabled)
        toast.success('Account created successfully!');
        // Navigate to onboarding for new users
        navigate('/onboarding');
      }
    } catch (err) {
      // Handle specific error types
      const status = err.response?.status;
      const responseData = err.response?.data || {};
      const errorMessage = responseData.message || err.message || 'Failed to create account. Please try again.';
      
      if (status === 409 || errorMessage.includes('already exists')) {
        toast.error('An account with this email or username already exists.');
      } else if (status === 400) {
        toast.error(errorMessage || 'Invalid registration data. Please check your input.');
      } else if (status === 429) {
        toast.error('Too many registration attempts. Please try again later.');
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        toast.error('No internet connection. Please check your network and try again.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // DEV BYPASS - Only available in development mode
  const handleDevSignup = () => {
    if (devLogin) {
      devLogin();
      toast.success('Dev mode: Logged in!');
      navigate('/onboarding');
    }
  };

  // If allowlist is active, show restriction notice instead of form
  if (allowlistActive) {
    return <RestrictedRegistrationNotice />;
  }

  return (
    <div className="min-h-screen text-[1.1rem]">
      
      {/* Header */}
      

      {/* Content */}
      <div className="pt-20 flex items-center justify-center px-4 py-12 min-h-screen">
        <div className="w-full max-w-md animate-fade-in">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
              <span className="text-lg font-bold text-[#0CCE6B]">
                Join Joint
              </span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              Create your account
            </h1>
            {/* Signup availability alert - prominent news-alert style */}
            <div
              role="status"
              aria-live="polite"
              className="w-full max-w-sm mx-auto mb-4 animate-fade-in border-l-4 border-[#0CCE6B] bg-[#0CCE6B]/10 rounded-lg px-5 py-4 text-center"
            >
              <p className="text-xl font-bold text-neutral-900 leading-snug">
                Account creation will be available in Q2 2026
              </p>
            </div>
            <p className="text-neutral-600">
              Start connecting with voice actors and artists today
            </p>
          </div>

          {/* Form */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username */}
            <div>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder="yourusername"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  onBlur={() => handleBlur('username')}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    errors.username && touched.username
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-neutral-200 focus:ring-emerald-500'
                  }`}
                  aria-invalid={!!(errors.username && touched.username)}
                  aria-describedby={errors.username && touched.username ? 'username-error' : 'username-hint'}
                />
              </div>
              {errors.username && touched.username ? (
                <p id="username-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.username}
                </p>
              ) : (
                <p id="username-hint" className="text-xs text-neutral-500 mt-1">
                  Used for mentions and your profile URL
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder="Name"
                  value={formData.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  onBlur={() => handleBlur('displayName')}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    errors.displayName && touched.displayName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-neutral-200 focus:ring-emerald-500'
                  }`}
                  aria-invalid={!!(errors.displayName && touched.displayName)}
                  aria-describedby={errors.displayName && touched.displayName ? 'displayName-error' : undefined}
                />
              </div>
              {errors.displayName && touched.displayName && (
                <p id="displayName-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.displayName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    errors.email && touched.email
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-neutral-200 focus:ring-emerald-500'
                  }`}
                  aria-invalid={!!(errors.email && touched.email)}
                  aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && touched.email && (
                <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    errors.password && touched.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-neutral-200 focus:ring-emerald-500'
                  }`}
                  aria-invalid={!!(errors.password && touched.password)}
                  aria-describedby={errors.password && touched.password ? 'password-error' : 'password-hint'}
                />
              </div>
              {errors.password && touched.password ? (
                <p id="password-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.password}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-neutral-500 mt-1">
                  8+ characters with uppercase, lowercase, number, and special character
                </p>
              )}
            </div>

            {/* Terms and Privacy Consent */}
            <div className="border border-neutral-300 rounded-lg p-4 bg-neutral-50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-400 bg-white text-emerald-600 focus:ring-emerald-600 focus:ring-offset-white"
                  required
                />
                <span className="text-sm text-neutral-700">
                  I agree to the{' '}
                  <Link to="/legal/terms" className="text-[#0CCE6B] hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>
                  {' '}and acknowledge the{' '}
                  <Link to="/legal/privacy" className="text-[#0CCE6B] hover:underline" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {!acceptedTerms && (
                <p className="text-xs text-red-600 mt-2" role="alert">
                  You must agree to continue
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* DEV MODE BUTTON */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <button
                onClick={handleDevSignup}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Code className="w-5 h-5" />
                <span>Dev Sign Up (Skip Auth)</span>
              </button>
              <p className="text-xs text-neutral-500 text-center mt-2">
                Development mode only - bypasses authentication
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-neutral-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0CCE6B] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      </div>

      {/* Footer */}
          </div>
  );
};

export default Join;

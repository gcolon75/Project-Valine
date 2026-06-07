import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AtSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { isEmailAllowed, isAllowlistActive } from '../utils/allowlistConfig';
import RestrictedRegistrationNotice from '../components/RestrictedRegistrationNotice';

const Join = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasSpecialAccess = searchParams.get('special') === 'true';
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const allowlistActive = isAllowlistActive();

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

    if (!formData.username || !formData.email || !formData.password || !formData.displayName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!acceptedTerms) {
      toast.error('You must agree to the Terms of Service and acknowledge the Privacy Policy');
      return;
    }
    if (allowlistActive && !isEmailAllowed(formData.email)) {
      toast.error('Registration is restricted to pre-approved accounts only.');
      return;
    }

    try {
      const user = await register(formData);
      if (user.emailVerified === false) {
        toast.success('Account created! Please check your email to verify your account.');
        navigate('/verify-email?registered=true');
      } else {
        toast.success('Account created successfully!');
        navigate('/onboarding');
      }
    } catch (err) {
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

  if (allowlistActive && !hasSpecialAccess) {
    return <RestrictedRegistrationNotice />;
  }

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-3 bg-neutral-50 border text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 transition-colors ${
      errors[field] && touched[field]
        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
        : 'border-neutral-200 focus:ring-[#0CCE6B]/30 focus:border-[#0CCE6B]'
    }`;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create your account</h1>
          <p className="text-neutral-500 text-sm">Start connecting with voice actors and artists</p>
        </div>

        {/* Availability notice */}
        <div className="bg-[#0CCE6B]/10 border border-[#0CCE6B]/20 px-5 py-4 mb-6 text-center">
          <Clock className="w-5 h-5 text-[#0CCE6B] mx-auto mb-2" />
          <p className="text-neutral-800 text-sm font-medium leading-snug mb-3">
            Account creation will be available in Q2 2026. Get preapproved to get early access.
          </p>
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-5 py-2 text-sm font-semibold transition-all shadow-md"
          >
            Get Preapproved
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Form card */}
        <div className="bg-white border border-neutral-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="yourusername"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  onBlur={() => handleBlur('username')}
                  className={inputClass('username')}
                  aria-invalid={!!(errors.username && touched.username)}
                  aria-describedby={errors.username && touched.username ? 'username-error' : 'username-hint'}
                />
              </div>
              {errors.username && touched.username ? (
                <p id="username-error" className="mt-1 text-xs text-red-600" role="alert">{errors.username}</p>
              ) : (
                <p id="username-hint" className="mt-1 text-xs text-neutral-500">Used for mentions and your profile URL</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="displayName"
                  type="text"
                  required
                  placeholder="Your Name"
                  value={formData.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  onBlur={() => handleBlur('displayName')}
                  className={inputClass('displayName')}
                  aria-invalid={!!(errors.displayName && touched.displayName)}
                  aria-describedby={errors.displayName && touched.displayName ? 'displayName-error' : undefined}
                />
              </div>
              {errors.displayName && touched.displayName && (
                <p id="displayName-error" className="mt-1 text-xs text-red-600" role="alert">{errors.displayName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={inputClass('email')}
                  aria-invalid={!!(errors.email && touched.email)}
                  aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && touched.email && (
                <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={inputClass('password')}
                  aria-invalid={!!(errors.password && touched.password)}
                  aria-describedby={errors.password && touched.password ? 'password-error' : 'password-hint'}
                />
              </div>
              {errors.password && touched.password ? (
                <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">{errors.password}</p>
              ) : (
                <p id="password-hint" className="mt-1 text-xs text-neutral-500">8+ characters with uppercase, lowercase, number, and special character</p>
              )}
            </div>

            {/* Terms */}
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 border-neutral-400 bg-white text-[#0CCE6B] focus:ring-[#0CCE6B] focus:ring-offset-white"
                  required
                />
                <span className="text-sm text-neutral-700">
                  I agree to the{' '}
                  <Link to="/legal/terms" className="text-[#0CCE6B] hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
                  {' '}and acknowledge the{' '}
                  <Link to="/legal/privacy" className="text-[#0CCE6B] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 font-semibold transition-all flex items-center justify-center gap-2 shadow-md"
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

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0CCE6B] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

      </div>
    </main>
  );
};

export default Join;

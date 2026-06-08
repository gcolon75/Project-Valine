import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';
import { isValidEmail } from '../utils/validation';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors = {};
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors below');
      return;
    }

    try {
      const user = await login(formData.email, formData.password);
      toast.success('Welcome back!');
      if (!user.onboardingComplete) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      const status = err.response?.status;
      const responseData = err.response?.data || {};

      if (status === 401 || errorMessage.includes('Invalid credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (status === 429 || errorMessage.includes('rate limit')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (status === 403 && (errorMessage.includes('verify') || responseData.requiresVerification)) {
        setError('Please verify your email address before logging in. Check your inbox for the verification link.');
        setTimeout(() => navigate('/verify-email?unverified=true'), 3000);
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError(responseData.message || 'Unable to sign in. Please try again later.');
      }

      toast.error(errorMessage);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Sign in to your account</h1>
          <p className="text-neutral-500 text-sm">Continue your journey with Joint</p>
        </div>

        {/* Beta notice */}
        <div className="bg-[#0CCE6B]/10 border border-[#0CCE6B]/20 px-5 py-4 mb-6 text-center">
          <Clock className="w-5 h-5 text-[#0CCE6B] mx-auto mb-2" />
          <p className="text-neutral-800 text-sm font-medium leading-snug mb-3">
            Only admin and approved beta users can log in until Q2 2026.
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

          {error && (
            <Alert
              variant="error"
              dismissible
              onDismiss={() => setError(null)}
              className="mb-6"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                  }}
                  aria-invalid={fieldErrors.email ? 'true' : 'false'}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral-200 focus:ring-[#0CCE6B]/30 focus:border-[#0CCE6B]'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-[#0CCE6B] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                  }}
                  aria-invalid={fieldErrors.password ? 'true' : 'false'}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral-200 focus:ring-[#0CCE6B]/30 focus:border-[#0CCE6B]'
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 font-semibold transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {import.meta.env.VITE_ENABLE_REGISTRATION === 'true' && (
            <p className="mt-6 text-center text-sm text-neutral-500">
              Don't have an account?{' '}
              <Link to="/join" className="text-[#0CCE6B] font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          )}
        </div>

      </div>
    </main>
  );
};

export default Login;

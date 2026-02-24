import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sparkles, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';
import { isValidEmail } from '../utils/validation';

const Login = () => {
  const navigate = useNavigate();
  const { login, devLogin, devBypass, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Check if dev bypass should be shown (localhost + env flag)
  const showDevBypass = typeof window !== 'undefined' && 
                        window.location.hostname === 'localhost' && 
                        import.meta.env.VITE_ENABLE_DEV_BYPASS === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    
    // Client-side validation
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
      
      // Check if email is verified (if auth is enabled)
      if (user.emailVerified === false) {
        // Redirect to verify page with message
        toast.error('Please verify your email address to continue');
        navigate('/verify-email?unverified=true');
        return;
      }
      
      // Always go directly to dashboard after sign in - no onboarding redirect
      navigate('/dashboard');
    } catch (err) {
      // Handle specific error types
      const errorMessage = err.message || 'An error occurred';
      const status = err.response?.status;
      const responseData = err.response?.data || {};
      
      if (status === 401 || errorMessage.includes('Invalid credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (status === 429 || errorMessage.includes('rate limit')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (status === 403 && (errorMessage.includes('verify') || responseData.requiresVerification)) {
        setError('Please verify your email address before logging in. Check your inbox for the verification link.');
        // Option to navigate to verify page
        setTimeout(() => {
          navigate('/verify-email?unverified=true');
        }, 3000);
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError(responseData.message || 'Unable to sign in. Please try again later.');
      }
      
      toast.error(errorMessage);
    }
  };

  // DEV BYPASS - Only available on localhost when VITE_ENABLE_DEV_BYPASS=true
  const handleDevBypass = () => {
    if (devBypass) {
      devBypass();
      toast.success('🚀 Dev Bypass Activated - NO REAL AUTH');
      navigate('/dashboard');
    }
  };

  // Legacy DEV LOGIN - For backward compatibility
  const handleDevLogin = () => {
    if (devLogin) {
      devLogin();
      toast.success('Dev mode: Logged in!');
      navigate('/dashboard');
    }
  };

  return (
    <main className="min-h-screen text-[1.1rem]">
      
      {/* Content */}
      <div className="flex items-center justify-center px-4 py-12 min-h-screen">
        <div className="w-full max-w-md animate-fade-in">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
              <span className="text-sm font-medium text-[#0CCE6B]">
                Welcome back
              </span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Sign in to your account
            </h1>
            <p className="text-neutral-600">
              Continue your journey with Joint
            </p>
          </div>

          {/* Admin/beta-only access notice */}
          <div
            role="status"
            aria-live="polite"
            className="w-full mb-6 animate-fade-in border-l-4 border-[#0CCE6B] bg-[#0CCE6B]/10 rounded-lg px-5 py-4 text-center"
          >
            <p className="text-base font-semibold text-[#0CCE6B] leading-snug mb-1">
              Only admin and approved beta users can log in until Q2 2026. If you are part of our beta, use your invite credentials.
            </p>
            {/* TODO: Replace placeholder email with real support address once available */}
            <a
              href="mailto:support@joint-networking"
              className="text-sm text-[#0CCE6B] underline hover:text-[#0BBE60] transition-colors"
            >
              Need access? Contact support@joint-networking
            </a>
          </div>

          {/* Form */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 animate-slide-up">
          
          {/* Error Alert */}
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
          
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" 
                  aria-hidden="true"
                />
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
                    if (fieldErrors.email) {
                      setFieldErrors({ ...fieldErrors, email: null });
                    }
                  }}
                  aria-invalid={fieldErrors.email ? 'true' : 'false'}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-neutral-200 focus:ring-[#0CCE6B] focus:border-[#0CCE6B]'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" 
                  aria-hidden="true"
                />
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
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: null });
                    }
                  }}
                  aria-invalid={fieldErrors.password ? 'true' : 'false'}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`w-full pl-10 pr-4 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-neutral-200 focus:ring-[#0CCE6B] focus:border-[#0CCE6B]'
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-[#0CCE6B] hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
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

          {/* DEV BYPASS BUTTON - Only on localhost with VITE_ENABLE_DEV_BYPASS=true */}
          {showDevBypass && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <button
                onClick={handleDevBypass}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
              >
                <Code className="w-5 h-5" />
                <span>Dev Bypass</span>
              </button>
              <p className="text-xs text-neutral-500 text-center mt-2">
                ⚠️ Localhost only - No real authentication
              </p>
            </div>
          )}

          {/* Legacy DEV MODE BUTTON - For backward compatibility when auth disabled */}
          {!showDevBypass && import.meta.env.DEV && devLogin && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <button
                onClick={handleDevLogin}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Code className="w-5 h-5" />
                <span>Dev Login (Bypass Auth)</span>
              </button>
              <p className="text-xs text-neutral-500 text-center mt-2">
                Development mode only - bypasses authentication
              </p>
            </div>
          )}

          {/* Footer */}
          {import.meta.env.VITE_ENABLE_REGISTRATION === 'true' && (
            <p className="mt-6 text-center text-neutral-600 text-sm">
              Don't have an account?{' '}
              <Link to="/join" className="text-[#0CCE6B] font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          )}
        </div>

        </div>
      </div>
    </main>
  );
};

export default Login;

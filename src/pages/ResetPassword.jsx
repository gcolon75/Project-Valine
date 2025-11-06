// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { validatePassword, passwordsMatch } from '../utils/validation';

/**
 * Reset Password Page
 * Allows users to set a new password using a reset token
 */

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [state, setState] = useState('idle'); // idle | verifying | success | error
  const [tokenValid, setTokenValid] = useState(false);
  const [errorType, setErrorType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorType('invalid');
      return;
    }
    
    verifyResetToken(token);
  }, [token]);

  const verifyResetToken = async (token) => {
    setState('verifying');
    
    try {
      // TODO: Replace with actual API call
      // await apiClient.post('/auth/verify-reset-token', { token });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock validation
      const isValid = Math.random() > 0.2;
      
      if (isValid) {
        setTokenValid(true);
        setState('idle');
      } else {
        throw new Error('Token expired');
      }
    } catch (err) {
      console.error('Token verification error:', err);
      setState('error');
      
      const message = err.message || err.response?.data?.message || '';
      
      if (message.includes('expired') || err.response?.status === 410) {
        setErrorType('expired');
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        setErrorType('network');
      } else {
        setErrorType('invalid');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    // Validate passwords
    const errors = {};
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.errors[0]; // Show first error
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (!passwordsMatch(formData.password, formData.confirmPassword)) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    setState('loading');
    
    try {
      // TODO: Replace with actual API call
      // await apiClient.post('/auth/reset-password', { token, password: formData.password });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setState('success');
      toast.success('Password reset successfully!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setState('idle');
      
      if (err.response?.status === 410) {
        setState('error');
        setErrorType('expired');
        toast.error('Reset link has expired');
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        toast.error('No internet connection');
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    }
  };

  // Verifying token
  if (state === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Verifying Reset Link
            </h1>
            <p className="text-neutral-600">
              Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Password Reset Successfully!
            </h1>
            <p className="text-neutral-600 mb-6">
              Your password has been reset. Redirecting to sign in...
            </p>
            <Alert variant="success">
              You can now sign in with your new password.
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    const getErrorContent = () => {
      switch (errorType) {
        case 'expired':
          return {
            title: 'Reset Link Expired',
            message: 'This password reset link has expired for security reasons. Please request a new one.'
          };
        case 'invalid':
          return {
            title: 'Invalid Reset Link',
            message: 'This password reset link is invalid or has already been used. Please request a new one.'
          };
        case 'network':
          return {
            title: 'Connection Error',
            message: 'Unable to verify reset link due to a network error. Please check your internet connection and try again.'
          };
        default:
          return {
            title: 'Reset Failed',
            message: 'We were unable to process your password reset. Please try again or contact support.'
          };
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              {getErrorContent().title}
            </h1>
            <p className="text-neutral-600 mb-6">
              {getErrorContent().message}
            </p>

            <div className="space-y-3">
              {errorType === 'network' ? (
                <Button
                  onClick={() => verifyResetToken(token)}
                  variant="secondary"
                  className="w-full"
                >
                  Try Again
                </Button>
              ) : (
                <Button
                  as={Link}
                  to="/forgot-password"
                  className="w-full"
                >
                  Request New Reset Link
                </Button>
              )}
              
              <Link
                to="/login"
                className="block text-sm text-neutral-600 hover:text-[#0CCE6B] transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Set New Password
          </h1>
          <p className="text-neutral-600">
            Choose a strong password for your account.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" 
                  aria-hidden="true"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: null });
                    }
                  }}
                  aria-invalid={fieldErrors.password ? 'true' : 'false'}
                  aria-describedby={fieldErrors.password ? 'password-error' : 'password-help'}
                  className={`w-full pl-10 pr-12 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-200 focus:ring-[#0CCE6B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.password}
                </p>
              ) : (
                <p id="password-help" className="mt-1 text-xs text-neutral-500">
                  At least 8 characters with uppercase, lowercase, and numbers
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" 
                  aria-hidden="true"
                />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors({ ...fieldErrors, confirmPassword: null });
                    }
                  }}
                  aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                  className={`w-full pl-10 pr-12 py-3 bg-neutral-50 border rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-200 focus:ring-[#0CCE6B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={state === 'loading'}
              className="w-full"
            >
              {state === 'loading' ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-sm text-neutral-600 hover:text-[#0CCE6B] transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

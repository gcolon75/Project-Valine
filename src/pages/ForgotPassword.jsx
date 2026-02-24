// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { isValidEmail } from '../utils/validation';

/**
 * Forgot Password Page
 * Allows users to request a password reset email
 */

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | success
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validate email
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setState('loading');
    
    try {
      // TODO: Replace with actual API call
      // await apiClient.post('/auth/forgot-password', { email });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setState('success');
      toast.success('Password reset email sent!');
    } catch (err) {
      console.error('Forgot password error:', err);
      setState('idle');
      
      // Handle different error types
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else {
        // For security, don't reveal if email exists or not
        setState('success');
      }
    }
  };

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Check Your Email
              </h1>
              <p className="text-neutral-600 mb-6">
                If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              
              <Alert variant="info" className="text-left mb-6">
                <p className="mb-2">Didn't receive the email?</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>Check your spam or junk folder</li>
                  <li>Verify you entered the correct email address</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </Alert>

              <Button
                as={Link}
                to="/login"
                variant="secondary"
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-neutral-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8">
          
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={state === 'loading'}
              className="w-full"
            >
              {state === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-sm text-neutral-600 hover:text-[#0CCE6B] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Help */}
        <p className="mt-6 text-center text-sm text-neutral-600">
          Need help?{' '}
          {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
          <a 
            href="mailto:support@joint-networking.com" 
            className="text-[#0CCE6B] font-medium hover:underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

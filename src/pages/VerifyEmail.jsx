// src/pages/VerifyEmail.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';

/**
 * Email Verification Page
 * Handles email verification with token validation
 * 
 * States:
 * - verifying: Checking token with backend
 * - success: Email verified successfully
 * - error: Verification failed (expired, invalid, or already verified)
 */

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [state, setState] = useState('verifying'); // verifying | success | error
  const [errorType, setErrorType] = useState(null); // expired | invalid | already_verified | network
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorType('invalid');
      return;
    }
    
    verifyEmailToken(token);
  }, [token]);

  const verifyEmailToken = async (token) => {
    setState('verifying');
    
    try {
      // TODO: Replace with actual API call
      // const response = await apiClient.post('/auth/verify-email', { token });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response - replace with actual logic
      const mockSuccess = Math.random() > 0.3;
      
      if (mockSuccess) {
        setState('success');
        toast.success('Email verified successfully!');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        throw new Error('Token expired');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setState('error');
      
      // Determine error type
      const message = err.message || err.response?.data?.message || '';
      
      if (message.includes('expired') || err.response?.status === 410) {
        setErrorType('expired');
        setCanResend(true);
      } else if (message.includes('already verified') || err.response?.status === 409) {
        setErrorType('already_verified');
      } else if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        setErrorType('network');
      } else {
        setErrorType('invalid');
      }
      
      toast.error('Email verification failed');
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    
    try {
      // TODO: Replace with actual API call
      // await apiClient.post('/auth/resend-verification');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Verification email sent! Please check your inbox.');
      setCanResend(false);
    } catch (err) {
      console.error('Resend error:', err);
      toast.error('Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const getErrorContent = () => {
    switch (errorType) {
      case 'expired':
        return {
          title: 'Verification Link Expired',
          message: 'This verification link has expired for security reasons. Please request a new verification email.',
          showResend: true
        };
      case 'invalid':
        return {
          title: 'Invalid Verification Link',
          message: 'This verification link is invalid or has already been used. Please check your email for the correct link or request a new one.',
          showResend: true
        };
      case 'already_verified':
        return {
          title: 'Email Already Verified',
          message: 'Your email address has already been verified. You can sign in to your account.',
          showResend: false
        };
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to verify your email due to a network error. Please check your internet connection and try again.',
          showResend: false
        };
      default:
        return {
          title: 'Verification Failed',
          message: 'We were unable to verify your email address. Please try again or contact support.',
          showResend: true
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8">
          
          {/* Verifying State */}
          {state === 'verifying' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Verifying Your Email
              </h1>
              <p className="text-neutral-600">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Email Verified!
              </h1>
              <p className="text-neutral-600 mb-6">
                Your email has been successfully verified. Redirecting you to your dashboard...
              </p>
              <Alert variant="success">
                You can now access all features of your account.
              </Alert>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                {getErrorContent().title}
              </h1>
              <p className="text-neutral-600 mb-6">
                {getErrorContent().message}
              </p>

              <Alert variant="error" className="mb-6 text-left">
                {getErrorContent().message}
              </Alert>

              {/* Actions */}
              <div className="space-y-3">
                {getErrorContent().showResend && canResend && (
                  <Button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full"
                    startIcon={isResending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                )}
                
                {errorType === 'already_verified' && (
                  <Button
                    as={Link}
                    to="/login"
                    className="w-full"
                    endIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Go to Sign In
                  </Button>
                )}
                
                {errorType === 'network' && (
                  <Button
                    onClick={() => verifyEmailToken(token)}
                    variant="secondary"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                )}
              </div>

              {/* Help Link */}
              <p className="mt-6 text-sm text-neutral-600">
                Need help?{' '}
                <a 
                  href="mailto:support@projectvaline.com" 
                  className="text-[#0CCE6B] font-medium hover:underline"
                >
                  Contact Support
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Back to Login */}
        {state !== 'success' && (
          <p className="mt-6 text-center text-sm text-neutral-600">
            <Link to="/login" className="text-[#0CCE6B] font-medium hover:underline">
              Back to Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

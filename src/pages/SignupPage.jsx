import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { isValidEmail, validatePassword, passwordsMatch } from '../utils/validation';

/**
 * SignupPage - New user registration form
 * 
 * Features:
 * - Email, password, and confirm password fields
 * - Client-side validation
 * - POST to /api/users endpoint
 * - Accessible form with proper labels and aria attributes
 * - Test IDs for Playwright automation
 */
const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get API base URL from environment or use fallback
  const apiBase = import.meta.env.VITE_API_BASE || '/api';

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.errors[0];
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (!passwordsMatch(formData.password, formData.confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMessage(null);

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // POST to /api/users
      const response = await apiClient.post(`${apiBase}/users`, {
        email: formData.email,
        password: formData.password
      });

      // Display success message from server
      setServerMessage({
        type: 'success',
        text: response.data.message || 'Account created successfully! Please check your email to verify your account.'
      });

      // Clear form on success
      setFormData({
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      // Display error message from server
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || 'Failed to create account. Please try again.';
      
      setServerMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">
            Sign Up
          </h1>

          {/* Server message area (aria-live for screen readers) */}
          {serverMessage && (
            <div 
              role="alert"
              aria-live="polite"
              className={`mb-4 p-3 rounded-md ${
                serverMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {serverMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email field */}
            <div className="mb-4">
              <label 
                htmlFor="signup-email" 
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="signup-email"
                data-testid="signup-email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-neutral-300 focus:ring-[#0CCE6B]'
                }`}
                placeholder="your@email.com"
              />
              {errors.email && (
                <p 
                  id="signup-email-error"
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="mb-4">
              <label 
                htmlFor="signup-password" 
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Password
              </label>
              <input
                id="signup-password"
                data-testid="signup-password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'signup-password-error' : undefined}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-neutral-300 focus:ring-[#0CCE6B]'
                }`}
                placeholder="Enter password"
              />
              {errors.password && (
                <p 
                  id="signup-password-error"
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password field */}
            <div className="mb-6">
              <label 
                htmlFor="signup-confirm-password" 
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                data-testid="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-neutral-300 focus:ring-[#0CCE6B]'
                }`}
                placeholder="Re-enter password"
              />
              {errors.confirmPassword && (
                <p 
                  id="signup-confirm-password-error"
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              data-testid="signup-submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {/* Link to login */}
          <p className="mt-4 text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link 
              to="/login-page" 
              className="text-[#0CCE6B] hover:text-[#0BBE60] font-medium focus:outline-none focus:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default SignupPage;

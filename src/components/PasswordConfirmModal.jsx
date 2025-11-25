// src/components/PasswordConfirmModal.jsx
import { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import * as authService from '../services/authService';
import { useAuth } from '../context/AuthContext';

/**
 * PasswordConfirmModal Component
 * Modal for re-confirming user password before sensitive actions like editing profile
 */
export default function PasswordConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Confirm Your Password",
  message = "Please enter your password to continue."
}) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Verify password by attempting login with current user's email
      await authService.login(user.email, password);
      
      // Password verified successfully
      setPassword('');
      onSuccess();
    } catch (err) {
      // Handle specific error types
      const status = err.response?.status;
      if (status === 401 || err.message?.includes('Invalid credentials')) {
        setError('Incorrect password. Please try again.');
      } else if (status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError('Unable to verify password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-neutral-700 dark:text-neutral-300">
              {message}
            </p>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" 
                  aria-hidden="true"
                />
                <input
                  type="password"
                  id="confirm-password"
                  name="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] disabled:opacity-50"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="px-6 py-2 rounded-lg font-semibold transition-all bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Confirm</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

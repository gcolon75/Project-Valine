import { Link } from 'react-router-dom';

/**
 * LoginPage - Login form placeholder
 * 
 * This is a placeholder component with disabled fields until
 * the backend login endpoint is implemented.
 * 
 * Features:
 * - Email and password fields (disabled)
 * - Test IDs for Playwright automation
 * - Accessible form with proper labels
 */
const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">
            Log In
          </h1>

          {/* Info banner */}
          <div 
            role="alert"
            aria-live="polite"
            className="mb-4 p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
          >
            Login functionality is currently disabled. Backend implementation pending.
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            {/* Email field */}
            <div className="mb-4">
              <label 
                htmlFor="login-email" 
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="login-email"
                data-testid="login-email"
                type="email"
                disabled
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-100 cursor-not-allowed opacity-60"
                placeholder="your@email.com"
              />
            </div>

            {/* Password field */}
            <div className="mb-6">
              <label 
                htmlFor="login-password" 
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Password
              </label>
              <input
                id="login-password"
                data-testid="login-password"
                type="password"
                disabled
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-100 cursor-not-allowed opacity-60"
                placeholder="Enter password"
              />
            </div>

            {/* Submit button (disabled) */}
            <button
              type="submit"
              data-testid="login-submit"
              disabled
              className="w-full bg-neutral-400 text-white py-2 px-4 rounded-md cursor-not-allowed opacity-60"
            >
              Log In (Disabled)
            </button>
          </form>

          {/* Link to signup */}
          <p className="mt-4 text-center text-sm text-neutral-600">
            Don't have an account?{' '}
            <Link 
              to="/signup-page" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

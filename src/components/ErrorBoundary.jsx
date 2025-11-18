// src/components/ErrorBoundary.jsx
import React from 'react';

/**
 * ErrorBoundary component to catch React errors and prevent white screen
 * Shows a friendly error message with retry option
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo
    });

    // Log to our error instrumentation
    if (window.__errorInstrumentation) {
      window.__errorInstrumentation.logError(error, {
        componentStack: errorInfo.componentStack,
        location: window.location.href,
        boundary: 'ErrorBoundary'
      });
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state and try again
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    // Full page reload to clear any stuck state
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    // Clear localStorage, sessionStorage, and reload with cache bypass
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    // Force reload from server, bypassing cache
    window.location.reload(true);
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We've encountered an unexpected error. Don't worry, our team has been notified and is looking into it.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-40 text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Reload
              </button>
            </div>

            <div className="mt-3">
              <button
                onClick={this.handleClearCacheAndReload}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
              >
                Clear cache & reload
              </button>
            </div>

            <div className="mt-6">
              <a 
                href="/"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
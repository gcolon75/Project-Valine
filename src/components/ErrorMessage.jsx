// src/components/ErrorMessage.jsx
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ error, onRetry, className = '' }) => (
  <div role="alert" className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
    <div className="flex items-start space-x-3">
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
          {error?.message || 'Something went wrong'}
        </h3>
        {error?.details && (
          <p className="text-sm text-red-700 dark:text-red-300">
            {error.details}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry"
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          <RefreshCw className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  </div>
);

export default ErrorMessage;

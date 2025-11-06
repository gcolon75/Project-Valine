// src/components/ui/Alert.jsx
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Alert Component for displaying errors, warnings, success, and info messages
 * 
 * Features:
 * - Multiple variants (error, warning, success, info)
 * - Optional dismissible functionality
 * - Icon support
 * - Proper ARIA attributes for accessibility
 */

const Alert = ({ 
  variant = 'info', 
  title, 
  children, 
  dismissible = false, 
  onDismiss,
  className = '',
  role = 'alert',
  ...props 
}) => {
  const variants = {
    error: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-300',
      text: 'text-red-700 dark:text-red-300',
      IconComponent: AlertCircle
    },
    warning: {
      container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-300',
      text: 'text-yellow-700 dark:text-yellow-300',
      IconComponent: AlertTriangle
    },
    success: {
      container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-800 dark:text-green-300',
      text: 'text-green-700 dark:text-green-300',
      IconComponent: CheckCircle
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-300',
      text: 'text-blue-700 dark:text-blue-300',
      IconComponent: Info
    }
  };

  const styles = variants[variant] || variants.info;
  const IconComponent = styles.IconComponent;

  return (
    <div 
      className={`p-4 border rounded-lg flex items-start gap-3 ${styles.container} ${className}`}
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      {...props}
    >
      <IconComponent 
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} 
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className={`font-semibold mb-1 ${styles.title}`}>
            {title}
          </h3>
        )}
        <div className={`text-sm ${styles.text}`}>
          {children}
        </div>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${styles.icon}`}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;

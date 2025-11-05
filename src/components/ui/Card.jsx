// src/components/ui/Card.jsx
import { forwardRef } from 'react';

/**
 * Design System Card Component
 * 
 * Features:
 * - Uses surface tokens for proper depth hierarchy
 * - Consistent spacing and rounded corners
 * - Optional hover effects
 * - Support for header with actions
 * - Light mode optimized with subtle shadows
 * - Proper semantic HTML structure
 */
const Card = forwardRef(({
  title,
  children,
  actions,
  className = '',
  hover = false,
  padding = 'default',
  as: Component = 'div',
  ...props
}, ref) => {
  const baseStyles = `
    bg-surface-2 
    border border-subtle 
    rounded-xl 
    shadow-sm
    transition-all duration-200
  `;

  const hoverStyles = hover ? 'hover:shadow-lg hover:border-default' : '';

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  };

  const paddingClass = paddingStyles[padding] || paddingStyles.default;

  return (
    <Component
      ref={ref}
      className={`${baseStyles} ${hoverStyles} ${paddingClass} ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {title}
            </h3>
          )}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

export default Card;

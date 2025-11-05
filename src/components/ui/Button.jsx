// src/components/ui/Button.jsx
import { forwardRef } from 'react';

/**
 * Design System Button Component
 * 
 * Variants:
 * - primary: Main call-to-action with brand gradient
 * - secondary: Secondary actions with subtle styling
 * - ghost: Minimal, text-based actions
 * 
 * Features:
 * - Proper focus-visible states for accessibility
 * - 44x44 minimum touch target for mobile
 * - Disabled state handling
 * - Icon support (start and end)
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  startIcon,
  endIcon,
  as: Component = 'button',
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-medium
    transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    rounded-lg
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-[#474747] to-[#0CCE6B]
      text-white
      hover:shadow-lg hover:scale-[1.02]
      active:scale-[0.98]
    `,
    secondary: `
      bg-surface-2 dark:bg-white/5
      border border-neutral-200 dark:border-neutral-700
      text-neutral-900 dark:text-neutral-100
      hover:bg-neutral-50 dark:hover:bg-white/10
      hover:shadow-md
      active:scale-[0.98]
    `,
    ghost: `
      text-neutral-700 dark:text-neutral-300
      hover:bg-neutral-100 dark:hover:bg-white/5
      active:scale-[0.95]
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]', // 44x44 touch target
    lg: 'px-6 py-3 text-lg min-h-[48px]',
  };

  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;

  const componentProps = {
    ref,
    className: `${baseStyles} ${variantClass} ${sizeClass} ${className}`,
    ...props
  };

  if (Component === 'button') {
    componentProps.disabled = disabled;
  }

  return (
    <Component {...componentProps}>
      {startIcon && <span className="flex-shrink-0" aria-hidden="true">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex-shrink-0" aria-hidden="true">{endIcon}</span>}
    </Component>
  );
});

Button.displayName = 'Button';

export default Button;

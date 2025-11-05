/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    // nice centered container defaults for marketing pages
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        lg: '1.5rem',
      },
    },
    extend: {
      // your brand = emerald (no more red)
      colors: {
        brand: {
          DEFAULT: '#059669',   // emerald-600
          hover:   '#10B981',   // emerald-500
          dark:    '#047857',   // emerald-700
          light:   '#D1FAE5',   // emerald-100
          fg:      '#ECFDF5'    // on-brand foreground
        },
        // Surface tier tokens for depth and separation
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
      },
      // wider max widths for that "pro" feel
      maxWidth: {
        '8xl': '88rem',  // ~1408px
        '9xl': '96rem',  // ~1536px (use if you want super wide)
      },
      // Shadow tokens for depth (overriding Tailwind defaults)
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'DEFAULT': 'var(--shadow-md)',
      },
      // Border color tokens
      borderColor: {
        'subtle': 'var(--border-subtle)',
        'default': 'var(--border-default)',
      },
      // UX Transformation: Custom animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [
    // keep empty for now (drop in forms/typography later if you want)
  ],
}

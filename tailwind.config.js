/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- add this line
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
      },
      // wider max widths for that “pro” feel
      maxWidth: {
        '8xl': '88rem',  // ~1408px
        '9xl': '96rem',  // ~1536px (use if you want super wide)
      },
    },
  },
  plugins: [
    // keep empty for now (drop in forms/typography later if you want)
  ],
}

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }) {
  const getInitial = () => {
    try {
      const saved = localStorage.getItem('theme');
      // Respect user's saved preference if it exists, otherwise default to light
      if (saved === 'light' || saved === 'dark') return saved;
      // Changed: Default to light mode instead of system preference
      return 'light';
    } catch {
      // Changed: Default to light mode on error
      return 'light';
    }
  };

  const [theme, setTheme] = useState(getInitial);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');   // Tailwind's dark: variant
    root.setAttribute('data-theme', theme);            // CSS variables for theme.css

    // sync mobile browser UI color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#181D21' : '#10B981');
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

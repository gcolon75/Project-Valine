import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getPreferences, updateThemePreference, syncThemeToBackend } from '../services/preferencesService';

const ThemeContext = createContext({ theme: 'light', toggle: () => {}, syncToBackend: async () => {} });

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
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');   // Tailwind's dark: variant
    root.setAttribute('data-theme', theme);            // CSS variables for theme.css

    // sync mobile browser UI color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#181D21' : '#10B981');
  }, [theme]);

  /**
   * Load theme preference from backend on login
   * Called by AuthContext when user logs in
   */
  const loadFromBackend = useCallback(async () => {
    try {
      const preferences = await getPreferences();
      const backendTheme = preferences.theme || 'light';
      if (backendTheme !== theme) {
        setTheme(backendTheme);
      }
    } catch (error) {
      // Silently handle errors - keep current theme
    }
  }, [theme]);

  /**
   * Sync localStorage theme to backend (migration on first login after feature deployment)
   */
  const syncToBackend = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await syncThemeToBackend();
    } catch {
      // Silently handle errors
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  /**
   * Toggle theme and persist to backend
   */
  const toggle = useCallback(async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    // Optimistic update
    setTheme(newTheme);

    // Persist to backend (silently handle errors)
    try {
      await updateThemePreference(newTheme);
    } catch {
      // Keep the new theme even if backend fails
    }
  }, [theme]);

  /**
   * Set theme explicitly and persist to backend
   */
  const setThemeWithBackend = useCallback(async (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') {
      return;
    }

    // Optimistic update
    setTheme(newTheme);

    // Persist to backend (silently handle errors)
    try {
      await updateThemePreference(newTheme);
    } catch {
      // Keep the new theme even if backend fails
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: setThemeWithBackend, 
      toggle, 
      loadFromBackend,
      syncToBackend,
      isSyncing
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

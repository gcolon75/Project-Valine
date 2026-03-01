// Preferences service - API client for user preferences (theme, etc.)
import { apiClient } from './api.js';

/**
 * Get user preferences (theme, etc.)
 * @returns {Promise<Object>} User preferences
 * @returns {string|null} preferences.theme - Theme preference ('light', 'dark', or null for system)
 */
export const getPreferences = async () => {
  try {
    const { data } = await apiClient.get('/me/preferences');
    return data;
  } catch (error) {
    // Silently handle 401 - user not authenticated
    if (error.response?.status === 401) {
      return { theme: null };
    }
    throw error;
  }
};

/**
 * Update user theme preference
 * @param {string|null} theme - Theme preference ('light', 'dark', or null for system)
 * @returns {Promise<Object>} Updated preferences
 */
export const updateThemePreference = async (theme) => {
  try {
    const { data } = await apiClient.put('/me/preferences', { theme });
    return data;
  } catch (error) {
    // Silently handle 401 - user not authenticated
    if (error.response?.status === 401) {
      return { theme };
    }
    throw error;
  }
};

/**
 * Sync localStorage theme to backend on login
 * Migrates localStorage theme to backend and clears localStorage
 * @returns {Promise<Object|null>} Updated preferences or null if no migration needed
 */
export const syncThemeToBackend = async () => {
  try {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
      const result = await updateThemePreference(storedTheme);
      // Clear localStorage after successful sync
      localStorage.removeItem('theme');
      return result;
    }
    return null;
  } catch {
    // Silently handle errors - don't clear localStorage if sync failed
    return null;
  }
};

/**
 * Load theme preference from backend on login
 * Falls back to localStorage if backend request fails
 * @returns {Promise<string>} Theme preference ('light' or 'dark')
 */
export const loadThemePreference = async () => {
  try {
    const preferences = await getPreferences();
    return preferences.theme || 'light'; // Default to light if null
  } catch {
    // Fallback to localStorage
    const storedTheme = localStorage.getItem('theme');
    return (storedTheme === 'light' || storedTheme === 'dark') ? storedTheme : 'light';
  }
};

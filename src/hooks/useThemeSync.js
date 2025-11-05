// Hook to sync theme preferences with backend on login
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Syncs theme preferences with backend when user logs in
 * - Loads theme from backend on login
 * - Migrates localStorage theme to backend if needed
 */
export function useThemeSync() {
  const { user, isAuthenticated } = useAuth();
  const { loadFromBackend, syncToBackend } = useTheme();
  const hasSync = useRef(false);

  useEffect(() => {
    const syncTheme = async () => {
      if (isAuthenticated && user && !hasSync.current) {
        hasSync.current = true;
        
        // First, sync any localStorage theme to backend (migration)
        await syncToBackend();
        
        // Then load theme from backend
        await loadFromBackend();
      }
    };

    syncTheme();
  }, [isAuthenticated, user, loadFromBackend, syncToBackend]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasSync.current = false;
    }
  }, [isAuthenticated]);
}

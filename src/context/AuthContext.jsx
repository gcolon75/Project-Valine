import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import { getMyProfile } from "../services/profileService";
import { trackLogin, trackSignup, trackLogout } from "../analytics/client";
import { isEmailAllowed, isAllowlistActive } from "../utils/allowlistConfig";

const AuthCtx = createContext(null);
export const AuthContext = AuthCtx;
export const useAuth = () => useContext(AuthCtx);

const LS_KEY = "valine-demo-user";
const AUTH_ENABLED = import.meta.env.VITE_ENABLE_AUTH === 'true';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      // If auth is enforced or in production, check for valid token
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          // Store user data including emailVerified status
          // Note: /auth/me returns { user: {...} }, so extract the user object
          setUser(userData.user);
        } catch (err) {
          console.error('Failed to fetch current user:', err);
          // Clear invalid token
          await authService.logout();
          setUser(null);
        }
      }
      setIsInitialized(true);
    };

    initAuth();
  }, []);

  // Listen for auth:unauthorized events (fired when token refresh also fails)
  useEffect(() => {
    const handleUnauthorized = async () => {
      console.warn('[AuthContext] Session expired, logging out and redirecting to login');
      try {
        await authService.logout();
      } catch (_) {
        // ignore logout errors
      }
      setUser(null);
      // Redirect to login immediately so user never sees empty/broken UI
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Persist user to localStorage
  useEffect(() => {
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user));
    else localStorage.removeItem(LS_KEY);
  }, [user]);

  const login = async (email, password, role = "artist") => {
    setLoading(true);
    try {
      // Client-side allowlist check (actual enforcement on backend)
      if (isAllowlistActive() && !isEmailAllowed(email)) {
        throw new Error('Account not authorized for access');
      }

      // Call API login directly - errors should be handled by the caller
      const data = await authService.login(email, password);
      
      setUser(data.user);
      
      // Track successful login
      trackLogin('password', true);
      
      return data.user;
    } catch (error) {
      // Log diagnostic info
      console.error('[AuthContext.login] Login failed:', {
        status: error.response?.status,
        message: error.message,
        code: error.code
      });
      
      // Track failed login
      trackLogin('password', false);
      
      // Re-throw error so UI can handle it (don't swallow with fallback)
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      // Client-side allowlist check (actual enforcement on backend)
      if (isAllowlistActive() && !isEmailAllowed(userData.email)) {
        throw new Error('Registration is restricted to pre-approved accounts only');
      }

      // Call API register directly - errors should be handled by the caller
      const data = await authService.register(userData);
      
      setUser(data.user);
      
      // Track successful signup
      trackSignup('password', true);
      
      return data.user;
    } catch (error) {
      // Log diagnostic info
      console.error('[AuthContext.register] Registration failed:', {
        status: error.response?.status,
        message: error.message,
        code: error.code
      });
      
      // Track failed signup
      trackSignup('password', false);
      
      // Re-throw error so UI can handle it (don't swallow with fallback)
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);

      // Track logout
      trackLogout();
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Refresh user data from the backend
   * Fetches /me/profile and updates the user state
   * @returns {Promise<Object|null>} Updated user data or null on error
   */
  const refreshUser = async () => {
    try {
      const profileData = await getMyProfile();
      if (profileData) {
        setUser(profileData);
        return profileData;
      }
      console.warn('[AuthContext.refreshUser] getMyProfile returned no data');
      return null;
    } catch (error) {
      console.error('[AuthContext.refreshUser] Failed to refresh user data:', error);
      return null;
    }
  };

  return (
    <AuthCtx.Provider value={{
      user,
      loading,
      isInitialized,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      isAuthenticated: !!user,
      authEnabled: AUTH_ENABLED
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

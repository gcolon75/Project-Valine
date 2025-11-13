import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import { apiFallback } from "../hooks/useApiFallback";
import { trackLogin, trackSignup, trackLogout } from "../analytics/client";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const LS_KEY = "valine-demo-user";
const DEV_USER_KEY = "devUserSession";
const IS_DEV = import.meta.env.DEV;
const AUTH_ENABLED = import.meta.env.VITE_ENABLE_AUTH === 'true';
const DEV_BYPASS_ENABLED = import.meta.env.VITE_ENABLE_DEV_BYPASS === 'true';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Check for dev bypass session first (only on localhost)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && DEV_BYPASS_ENABLED) {
      const devUser = localStorage.getItem(DEV_USER_KEY);
      if (devUser) {
        try {
          return JSON.parse(devUser);
        } catch (e) {
          console.error('Failed to parse dev user session:', e);
        }
      }
    }
    
    // Otherwise check normal user session
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      // If auth is not enforced and we're in dev mode, skip initialization
      if (!AUTH_ENABLED && IS_DEV) {
        console.log('[AuthContext] Auth enforcement disabled, using dev mode');
        setIsInitialized(true);
        return;
      }

      // If auth is enforced or in production, check for valid token
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          // Store user data including emailVerified status
          setUser(userData);
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

  // Persist user to localStorage
  useEffect(() => {
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user));
    else localStorage.removeItem(LS_KEY);
  }, [user]);

  const login = async (email, password, role = "artist") => {
    setLoading(true);
    try {
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
      // Try API register with fallback to demo mode
      const data = await apiFallback(
        () => authService.register(userData),
        {
          user: {
            id: crypto.randomUUID?.() || String(Date.now()),
            ...userData,
            profileComplete: false
          },
          token: 'demo-token'
        },
        'AuthContext.register'
      );
      
      setUser(data.user);
      
      // Track successful signup
      trackSignup('password', true);
      
      return data.user;
    } catch (error) {
      // Track failed signup
      trackSignup('password', false);
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
      
      // Clear dev bypass session if exists
      localStorage.removeItem(DEV_USER_KEY);
      
      // Track logout
      trackLogout();
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  // Dev Bypass function - localhost only, explicit flag required
  const devBypass = () => {
    // Triple-gate security check
    if (typeof window === 'undefined' || window.location.hostname !== 'localhost') {
      console.warn('[devBypass] Only available on localhost');
      return;
    }
    
    if (!DEV_BYPASS_ENABLED) {
      console.warn('[devBypass] VITE_ENABLE_DEV_BYPASS must be "true"');
      return;
    }
    
    const devUser = {
      id: 'dev-user',
      email: 'dev@local',
      username: 'dev-bypass',
      displayName: 'Dev Bypass User',
      name: 'Dev Bypass User',
      role: 'artist',
      onboardingComplete: true,
      profileComplete: true,
      emailVerified: true,
      roles: ['DEV_BYPASS'], // Special role to show banner
      avatar: 'https://i.pravatar.cc/150?img=68'
    };
    
    setUser(devUser);
    localStorage.setItem(DEV_USER_KEY, JSON.stringify(devUser));
    console.log('[devBypass] Dev session activated - NO REAL AUTH');
    return devUser;
  };

  // Legacy dev login (kept for backward compatibility but now calls devBypass)
  const devLogin = () => {
    // Only allow dev login if auth is not enforced and we're in dev mode
    if (AUTH_ENABLED) {
      console.warn('Dev login is disabled when VITE_ENABLE_AUTH is true');
      return;
    }
    
    if (!IS_DEV) {
      console.warn('Dev login is only available in development mode');
      return;
    }
    
    // Use the new devBypass function if available
    if (DEV_BYPASS_ENABLED) {
      return devBypass();
    }
    
    const demoUser = {
      id: 'dev-user-123',
      username: 'developer',
      email: 'dev@valine.com',
      displayName: 'Dev User',
      name: 'Dev User',
      role: 'artist',
      avatar: 'https://i.pravatar.cc/150?img=68',
      profileComplete: true
    };
    
    setUser(demoUser);
    localStorage.setItem('auth_token', 'dev-token');
    return demoUser;
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
      devLogin: (IS_DEV && !AUTH_ENABLED) ? devLogin : undefined,
      devBypass: (DEV_BYPASS_ENABLED && typeof window !== 'undefined' && window.location?.hostname === 'localhost') ? devBypass : undefined,
      isAuthenticated: !!user,
      authEnabled: AUTH_ENABLED
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

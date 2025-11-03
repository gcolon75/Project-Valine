import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import { apiFallback } from "../hooks/useApiFallback";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const LS_KEY = "valine-demo-user";
const IS_DEV = import.meta.env.DEV;

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
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (err) {
          console.error('Failed to fetch current user:', err);
          // Clear invalid token
          authService.logout();
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
      // Try API login with fallback to demo mode
      const data = await apiFallback(
        () => authService.login(email, password),
        {
          user: {
            id: crypto.randomUUID?.() || String(Date.now()),
            email,
            role,
            name: role === "artist" ? "Demo Artist" : "Demo Observer",
            displayName: role === "artist" ? "Demo Artist" : "Demo Observer",
            username: email.split('@')[0],
            profileComplete: false
          },
          token: 'demo-token'
        },
        'AuthContext.login'
      );
      
      setUser(data.user);
      return data.user;
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
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  // Dev-only bypass function
  const devLogin = () => {
    if (!IS_DEV) {
      console.warn('Dev login is only available in development mode');
      return;
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
      devLogin: IS_DEV ? devLogin : undefined,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

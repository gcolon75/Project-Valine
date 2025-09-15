import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

// Create an authentication context for the application. The default
// user is null (not logged in) until the login function is invoked.
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  /**
   * Initialise user from localStorage so sessions persist across refreshes.
   * If no stored user exists, default to null. We namespace the key
   * with "joint_user" to avoid collisions with other applications.
   */
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('joint_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Persist user to localStorage whenever it changes. On logout (user === null)
  // remove the key entirely.
  useEffect(() => {
    if (user) {
      localStorage.setItem('joint_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('joint_user');
    }
  }, [user]);

  /**
   * Perform a login against the backend. The API will create or
   * return a user record based on the provided email and role. An
   * empty password is accepted for demo purposes. After login, the
   * user state is updated and returned. New users default to
   * profileComplete: false so they go through the onboarding wizard.
   */
  const login = async (email, password, role = 'artist') => {
    const { user: u } = await api.login({ email, password, role });
    // Ensure profileComplete is defined on every user object
    const withProfile = u.profileComplete === undefined ? { ...u, profileComplete: false } : u;
    setUser(withProfile);
    return withProfile;
  };

  /**
   * Update the current user's profile. Accepts a partial user object and
   * merges it into the existing user. Marks profileComplete true when
   * called by the profile setup wizard. Also persists to localStorage.
   */
  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      return updated;
    });
  };

  /**
   * Switch the current user's role between artist and observer. This
   * updates the role on the user object and persists the change. Only
   * available when a user is logged in.
   */
  const switchRole = (role) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, role };
      return updated;
    });
  };

  /**
   * Clears the current user, effectively logging out.
   */
  const logout = () => {
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, login, logout, switchRole, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

// Hook to access the authentication context. Returns the user and
// authentication functions. Components can call login or logout
// without importing the context directly.
export const useAuth = () => useContext(Ctx);
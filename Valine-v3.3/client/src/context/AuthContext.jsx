import { createContext, useContext, useState } from 'react';
import * as api from '../services/api';

// Create an authentication context for the application. The default
// user is null (not logged in) until the login function is invoked.
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  // Start with no authenticated user. After login, this state will
  // contain the user object returned from the API.
  const [user, setUser] = useState(null);

  /**
   * Perform a login against the backend. The API will create or
   * return a user record based on the provided email and role. An
   * empty password is accepted for demo purposes. After login, the
   * user state is updated and returned.
   *
   * @param {string} email - user email (used as identifier)
   * @param {string} password - unused but kept for signature
   * @param {string} role - 'artist' or 'observer'
   */
  const login = async (email, password, role = 'artist') => {
    const { user: u } = await api.login({ email, password, role });
    setUser(u);
    return u;
  };

  /**
   * Clears the current user, effectively logging out.
   */
  const logout = () => setUser(null);

  return (
    <Ctx.Provider value={{ user, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// Hook to access the authentication context. Returns the user and
// authentication functions. Components can call login or logout
// without importing the context directly.
export const useAuth = () => useContext(Ctx);
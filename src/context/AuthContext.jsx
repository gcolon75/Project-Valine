import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const LS_KEY = "valine-demo-user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user));
    else localStorage.removeItem(LS_KEY);
  }, [user]);

  const login = async (email, _password = "", role = "artist") => {
    // demo login: create or “return” a user; first time is incomplete
    const firstTimer = { 
      id: crypto.randomUUID?.() || String(Date.now()),
      email, role,
      name: role === "artist" ? "Demo Artist" : "Demo Observer",
      profileComplete: false
    };
    setUser(firstTimer);
    return firstTimer; // important so caller can branch on profileComplete
  };

  const logout = () => setUser(null);

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

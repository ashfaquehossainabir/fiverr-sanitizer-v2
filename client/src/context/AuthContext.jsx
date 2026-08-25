import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "sanitizer_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    // Registration no longer logs the user in — new accounts are created
    // pending admin approval, so we just hand back the server's response
    // (message + safe user object) for the Register page to display.
    const { data } = await api.post("/auth/register", { name, email, password });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put("/users/profile", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const updatePassword = useCallback(async (payload) => {
    const { data } = await api.put("/users/password", payload);
    return data;
  }, []);

  const deleteAccount = useCallback(async (password) => {
    const { data } = await api.delete("/users/account", { data: { password } });
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    return data;
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    deleteAccount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

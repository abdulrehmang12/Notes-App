import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("lumina_token"));
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    let alive = true;

    async function loadMe() {
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (alive) {
          setUser(data.user);
        }
      } catch (_error) {
        localStorage.removeItem("lumina_token");
        if (alive) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (alive) {
          setBooting(false);
        }
      }
    }

    loadMe();
    return () => {
      alive = false;
    };
  }, [token]);

  async function authenticate(path, payload) {
    const { data } = await api.post(path, payload);
    localStorage.setItem("lumina_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("lumina_token");
    setToken(null);
    setUser(null);
  }

  function updateSession(nextToken, nextUser) {
    localStorage.setItem("lumina_token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      login: (payload) => authenticate("/auth/login", payload),
      signup: (payload) => authenticate("/auth/signup", payload),
      updateSession,
      logout
    }),
    [token, user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

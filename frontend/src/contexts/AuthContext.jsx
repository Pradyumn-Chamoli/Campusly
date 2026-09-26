import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { ensureSocket, teardownSocket } from "../services/socket";

const AuthContext = createContext(null);

function useInitialAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((res) => {
        if (!cancelled) {
          setUser(res.data.data);
          // Real-time chat is only available to signed-in users.
          ensureSocket();
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("token");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem("token", token);
    setUser(userData);
    ensureSocket();
    return userData;
  }, []);

  const register = useCallback(async (email, password, name) => {
    await api.post("/auth/register", { email, password, name });
  }, []);

  // Keeps the signed-in user in sync after a profile update so the header,
  // avatar and profile page all reflect the new details immediately.
  const updateProfile = useCallback(async (payload) => {
    const res = await api.put("/users/profile", payload);
    const userData = res.data.data;
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem("token");
      teardownSocket();
      setUser(null);
    }
  }, []);

  return { user, loading, login, register, updateProfile, logout };
}

export function AuthProvider({ children }) {
  const auth = useInitialAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

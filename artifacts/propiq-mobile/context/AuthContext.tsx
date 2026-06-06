import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "propiq_auth_token";
const USER_KEY = "propiq_user";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  plan: "starter" | "analyst" | "pro";
  analysesUsedThisMonth: number;
  planResetDate?: string | null;
  createdAt?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
setAuthTokenGetter(async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newUser: AuthUser, newToken: string) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updated: AuthUser) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

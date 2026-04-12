import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken, getUser, clearAuth, setToken, setUser } from "@/lib/auth";

export type UserType = "tourist" | "associate" | null;

interface AuthCtx {
  isLoggedIn: boolean;
  userType: UserType;
  user: any;
  token: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginAsAssociate: (associate: any, accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  isLoggedIn: false,
  userType: null,
  user: null,
  token: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  loginAsAssociate: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await getToken();
    const u = await getUser();
    setTokenState(t);
    setUserState(u);
    setIsLoggedIn(!!t);
    setUserType(u?.type ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await clearAuth();
    setIsLoggedIn(false);
    setTokenState(null);
    setUserState(null);
    setUserType(null);
  };

  const loginAsAssociate = async (associate: any, accessToken: string) => {
    const userData = { ...associate, type: "associate" };
    await setToken(accessToken);
    await setUser(userData);
    setTokenState(accessToken);
    setUserState(userData);
    setIsLoggedIn(true);
    setUserType("associate");
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, userType, user, token, loading, refresh, logout, loginAsAssociate }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

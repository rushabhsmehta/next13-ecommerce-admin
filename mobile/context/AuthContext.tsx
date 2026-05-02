import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { getToken, getUser, clearAuth, setToken, setUser } from "@/lib/auth";
import { setClerkTokenProvider } from "@/lib/clerk-token-provider";
import { API_BASE_URL } from "@/constants/api";

export type UserType = "tourist" | "associate" | "admin" | null;

interface AuthCtx {
  isLoggedIn: boolean;
  userType: UserType;
  user: any;
  token: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginAsAssociate: (associate: any, accessToken: string) => Promise<void>;
  loginAsAdmin: (adminData: any, accessToken: string) => Promise<void>;
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
  loginAsAdmin: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken: clerkGetToken, signOut: clerkSignOut } = useClerkAuth();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  // Wire Clerk token provider for non-component modules (whatsapp-api, notifications)
  useEffect(() => {
    if (isSignedIn) {
      setClerkTokenProvider(() => clerkGetToken());
    } else {
      setClerkTokenProvider(() => Promise.resolve(null));
    }
  }, [isSignedIn, clerkGetToken]);

  // Auto-detect admin role when Clerk signs in
  useEffect(() => {
    if (!isSignedIn) {
      setAdminRole(null);
      return;
    }
    (async () => {
      try {
        const jwt = await clerkGetToken();
        if (!jwt) return;
        const res = await fetch(`${API_BASE_URL}/api/mobile/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAdminRole(data.role);
          setUserState({ name: data.name, userId: data.userId, role: data.role, type: "admin" });
          setTokenState(jwt);
          setIsLoggedIn(true);
          setUserType("admin");
        }
      } catch {
        // not an admin — ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn, clerkGetToken]);

  const refresh = useCallback(async () => {
    // Admin session is managed by Clerk — only load stored token for associate/tourist
    if (isSignedIn) {
      setLoading(false);
      return;
    }
    const t = await getToken();
    const u = await getUser();
    setTokenState(t);
    setUserState(u);
    setIsLoggedIn(!!t);
    setUserType(u?.type ?? null);
    setLoading(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      refresh();
    }
  }, [refresh, isSignedIn]);

  const logout = async () => {
    if (isSignedIn) {
      try { await clerkSignOut(); } catch {}
    }
    await clearAuth();
    setIsLoggedIn(false);
    setTokenState(null);
    setUserState(null);
    setUserType(null);
    setAdminRole(null);
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

  // Kept as no-op stub — admin login is now handled by Clerk
  const loginAsAdmin = async (_adminData: any, _accessToken: string) => {};

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, userType, user, token, loading, refresh, logout, loginAsAssociate, loginAsAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

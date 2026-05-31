import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/constants/api";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";
import {
  APP_VARIANT,
  filterNavigationForAppVariant,
  filterPermissionsForAppVariant,
  mobileAppVariantHeaders,
} from "@/lib/app-variant";

export interface TravelUser {
  id: string;
  name: string;
  email: string;
  isApproved: boolean;
}

export interface AssociatePartner {
  id: string;
  name: string;
  email: string | null;
  mobileNumber: string;
}

export type OrganizationRole = "OWNER" | "ADMIN" | "FINANCE" | "OPERATIONS" | "VIEWER";

export interface MobileAdminModule {
  id: string;
  title: string;
  description: string;
  category: string;
  phase: string;
  icon: string;
  status: "foundation" | "ready" | "planned" | "in-development" | "restricted";
  requiredPermission: string;
  offlinePolicy: "read_cache" | "draft_only" | "online_only";
  acceptanceTarget: string;
  webRoutes: string[];
  workflows: string[];
}

export interface CurrentUserState {
  organizationRole: OrganizationRole | null;
  organizationId: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isFinance: boolean;
  isOperations: boolean;
  isAssociate: boolean;
  canUseAdmin: boolean;
  canUseFinance: boolean;
  permissions: string[];
  mobileNavigation: MobileAdminModule[];
  associatePartner: AssociatePartner | null;
  travelUser: TravelUser | null;
  isLoading: boolean;
}

interface CurrentUserContextValue extends CurrentUserState {
  refresh: () => Promise<void>;
}

const AUTH_STATUS_CACHE_KEY = `mobile-auth-status:${APP_VARIANT}`;
const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);
let memorySnapshot: CurrentUserState | null = null;

function emptyCurrentUserState(isLoading: boolean): CurrentUserState {
  return {
    organizationRole: null,
    organizationId: null,
    isOwner: false,
    isAdmin: false,
    isFinance: false,
    isOperations: false,
    isAssociate: false,
    canUseAdmin: false,
    canUseFinance: false,
    permissions: [],
    mobileNavigation: [],
    associatePartner: null,
    travelUser: null,
    isLoading,
  };
}

function normalizeCurrentUserState(data: any): CurrentUserState {
  const permissions = filterPermissionsForAppVariant(
    Array.isArray(data.permissions) ? data.permissions : [],
    APP_VARIANT
  );
  const rawMobileNavigation: MobileAdminModule[] = Array.isArray(data.mobileNavigation)
    ? data.mobileNavigation
    : [];
  const mobileNavigation = filterNavigationForAppVariant(
    rawMobileNavigation,
    APP_VARIANT
  );

  return {
    organizationRole: data.organizationRole ?? null,
    organizationId: data.organizationId ?? null,
    isOwner: APP_VARIANT === "public" ? false : data.isOwner ?? false,
    isAdmin: APP_VARIANT === "public" ? false : data.isAdmin ?? false,
    isFinance: APP_VARIANT === "finance" ? data.isFinance ?? false : false,
    isOperations: APP_VARIANT === "public" ? false : data.isOperations ?? false,
    isAssociate: APP_VARIANT === "public" ? false : data.isAssociate ?? false,
    canUseAdmin: APP_VARIANT === "staff" ? Boolean(data.canUseAdmin) : false,
    canUseFinance: APP_VARIANT === "finance" ? Boolean(data.canUseFinance) : false,
    permissions,
    mobileNavigation,
    associatePartner: APP_VARIANT === "public" ? null : data.associatePartner ?? null,
    travelUser: data.travelUser ?? null,
    isLoading: false,
  };
}

function cacheableState(state: CurrentUserState): CurrentUserState {
  return { ...state, isLoading: false };
}

async function readStoredSnapshot(): Promise<CurrentUserState | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STATUS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentUserState;
    return cacheableState(parsed);
  } catch {
    return null;
  }
}

async function writeStoredSnapshot(state: CurrentUserState | null): Promise<void> {
  try {
    if (!state) {
      await SecureStore.deleteItemAsync(AUTH_STATUS_CACHE_KEY);
      return;
    }
    await SecureStore.setItemAsync(
      AUTH_STATUS_CACHE_KEY,
      JSON.stringify(cacheableState(state))
    );
  } catch {}
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const requestSeqRef = useRef(0);
  const [state, setState] = useState<CurrentUserState>(
    () => memorySnapshot ?? emptyCurrentUserState(true)
  );

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchAuthStatus = useCallback(
    async (quiet = false) => {
      if (!isLoaded) return;
      const seq = requestSeqRef.current + 1;
      requestSeqRef.current = seq;

      if (!quiet) {
        setState((prev) => ({
          ...prev,
          isLoading: !memorySnapshot,
        }));
      }

      try {
        const token = await resolveMobileAuthToken(() => getTokenRef.current());
        if (requestSeqRef.current !== seq) return;

        if (!token) {
          const empty = emptyCurrentUserState(false);
          memorySnapshot = null;
          setState(empty);
          void writeStoredSnapshot(null);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/mobile/auth-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...mobileAppVariantHeaders(),
          },
        });
        if (requestSeqRef.current !== seq) return;

        if (!res.ok) {
          const empty = emptyCurrentUserState(false);
          memorySnapshot = null;
          setState(empty);
          void writeStoredSnapshot(null);
          return;
        }

        const next = normalizeCurrentUserState(await res.json());
        memorySnapshot = cacheableState(next);
        setState(next);
        void writeStoredSnapshot(next);
      } catch {
        if (requestSeqRef.current !== seq) return;
        if (memorySnapshot) {
          setState(cacheableState(memorySnapshot));
          return;
        }
        setState(emptyCurrentUserState(false));
      }
    },
    [isLoaded]
  );

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    async function hydrateThenRefresh() {
      if (isSignedIn || __DEV__) {
        const stored = await readStoredSnapshot();
        if (!cancelled && stored) {
          memorySnapshot = stored;
          setState(stored);
        }
      }
      if (!cancelled) {
        await fetchAuthStatus(Boolean(memorySnapshot));
      }
    }

    void hydrateThenRefresh();
    return () => {
      cancelled = true;
    };
  }, [fetchAuthStatus, isLoaded, isSignedIn]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      ...state,
      refresh: () => fetchAuthStatus(false),
    }),
    [fetchAuthStatus, state]
  );

  return createElement(CurrentUserContext.Provider, { value }, children);
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  return context ?? { ...emptyCurrentUserState(false), refresh: async () => {} };
}

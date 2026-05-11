import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { API_BASE_URL } from "@/constants/api";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";

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
  status: "foundation" | "ready" | "planned" | "restricted";
  requiredPermission: string;
  offlinePolicy: "read_cache" | "draft_only" | "online_only";
  acceptanceTarget: string;
  webRoutes: string[];
  workflows: string[];
}

interface CurrentUserState {
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

export function useCurrentUser(): CurrentUserState {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [state, setState] = useState<CurrentUserState>(emptyCurrentUserState(true));

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    async function fetchAuthStatus() {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const token = await resolveMobileAuthToken(() => getTokenRef.current());
        if (!token) {
          setState(emptyCurrentUserState(false));
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/mobile/auth-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setState(emptyCurrentUserState(false));
          return;
        }
        const data = await res.json();
        setState({
          organizationRole: data.organizationRole ?? null,
          organizationId: data.organizationId ?? null,
          isOwner: data.isOwner ?? false,
          isAdmin: data.isAdmin ?? false,
          isFinance: data.isFinance ?? false,
          isOperations: data.isOperations ?? false,
          isAssociate: data.isAssociate ?? false,
          canUseAdmin: data.canUseAdmin ?? false,
          canUseFinance: data.canUseFinance ?? false,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          mobileNavigation: Array.isArray(data.mobileNavigation)
            ? data.mobileNavigation
            : [],
          associatePartner: data.associatePartner ?? null,
          travelUser: data.travelUser ?? null,
          isLoading: false,
        });
      } catch {
        setState(emptyCurrentUserState(false));
      }
    }

    void fetchAuthStatus();
  }, [isSignedIn, isLoaded]);

  return state;
}

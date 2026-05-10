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

interface CurrentUserState {
  isAdmin: boolean;
  isAssociate: boolean;
  associatePartner: AssociatePartner | null;
  travelUser: TravelUser | null;
  isLoading: boolean;
}

export function useCurrentUser(): CurrentUserState {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [state, setState] = useState<CurrentUserState>({
    isAdmin: false,
    isAssociate: false,
    associatePartner: null,
    travelUser: null,
    isLoading: true,
  });

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
          setState({
            isAdmin: false,
            isAssociate: false,
            associatePartner: null,
            travelUser: null,
            isLoading: false,
          });
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/mobile/auth-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setState({
            isAdmin: false,
            isAssociate: false,
            associatePartner: null,
            travelUser: null,
            isLoading: false,
          });
          return;
        }
        const data = await res.json();
        setState({
          isAdmin: data.isAdmin ?? false,
          isAssociate: data.isAssociate ?? false,
          associatePartner: data.associatePartner ?? null,
          travelUser: data.travelUser ?? null,
          isLoading: false,
        });
      } catch {
        setState({
          isAdmin: false,
          isAssociate: false,
          associatePartner: null,
          travelUser: null,
          isLoading: false,
        });
      }
    }

    void fetchAuthStatus();
  }, [isSignedIn, isLoaded]);

  return state;
}

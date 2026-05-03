import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export interface TravelUser {
  id: string;
  name: string;
  email: string;
  isApproved: boolean;
}

interface CurrentUserState {
  isAdmin: boolean;
  travelUser: TravelUser | null;
  isLoading: boolean;
}

export function useCurrentUser(): CurrentUserState {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [state, setState] = useState<CurrentUserState>({
    isAdmin: false,
    travelUser: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState({ isAdmin: false, travelUser: null, isLoading: false });
      return;
    }

    async function fetchAuthStatus() {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const token = await getToken();
        if (!token) {
          setState({ isAdmin: false, travelUser: null, isLoading: false });
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/mobile/auth-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setState({ isAdmin: false, travelUser: null, isLoading: false });
          return;
        }
        const data = await res.json();
        setState({
          isAdmin: data.isAdmin ?? false,
          travelUser: data.travelUser ?? null,
          isLoading: false,
        });
      } catch {
        setState({ isAdmin: false, travelUser: null, isLoading: false });
      }
    }

    fetchAuthStatus();
  }, [isSignedIn, isLoaded]);

  return state;
}

/**
 * Shared network state for mobile.
 *
 * Single source of truth for "am I online?" used by:
 * - <OfflineBanner /> (shows the warning bar)
 * - <OfflineGate /> (prevents rendering write UIs while offline)
 * - `requireOnline()` / `apiFetch({ requireOnline: true })` (hard-blocks
 *   online_only writes per Phase F rules in mobile-admin-access.ts).
 *
 * Network probing is delegated to expo-network. We poll every 8s and also
 * refresh on demand so callers can decide whether to trust the cached
 * snapshot or pay the cost of a fresh probe.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import { ApiError, setOfflineChecker } from "@/lib/api";

const POLL_INTERVAL_MS = 8000;

type NetworkSnapshot = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  checkedAt: number;
};

const INITIAL: NetworkSnapshot = {
  isOnline: true,
  isInternetReachable: null,
  type: null,
  checkedAt: 0,
};

async function probe(): Promise<NetworkSnapshot> {
  try {
    const state = await Network.getNetworkStateAsync();
    const isConnected = __DEV__ ? true : state?.isConnected !== false;
    const isReachable = __DEV__ ? true : (
      state?.isInternetReachable === null || state?.isInternetReachable === undefined
        ? null
        : !!state.isInternetReachable
    );
    return {
      isOnline: isConnected && isReachable !== false,
      isInternetReachable: isReachable,
      type: state?.type ?? null,
      checkedAt: Date.now(),
    };
  } catch {
    return { ...INITIAL, checkedAt: Date.now() };
  }
}

// Module-level cache so `requireOnline()` works outside React (e.g. inside
// API fetchers) without prop-drilling the context.
let cachedSnapshot: NetworkSnapshot = INITIAL;

export async function refreshNetworkSnapshot(): Promise<NetworkSnapshot> {
  cachedSnapshot = await probe();
  return cachedSnapshot;
}

export function getNetworkSnapshot(): NetworkSnapshot {
  return cachedSnapshot;
}

/**
 * Hard-block a non-idempotent write when the device is offline.
 * Throws an ApiError with code "OFFLINE" — the API client treats this as
 * non-retryable (we never auto-retry writes anyway, but this makes the
 * intent explicit to UI code).
 */
export async function requireOnline(): Promise<void> {
  const snapshot = await refreshNetworkSnapshot();
  if (!snapshot.isOnline) {
    throw new ApiError(
      "You appear to be offline. Reconnect to continue.",
      null,
      false,
      "OFFLINE"
    );
  }
}

type NetworkContextValue = NetworkSnapshot & {
  refresh: () => Promise<void>;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(INITIAL);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const next = await probe();
    cachedSnapshot = next;
    if (mountedRef.current) setSnapshot(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setOfflineChecker(async () => {
      const next = await probe();
      cachedSnapshot = next;
      return !next.isOnline;
    });
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      sub.remove();
      setOfflineChecker(null);
    };
  }, [refresh]);

  const value = useMemo<NetworkContextValue>(
    () => ({ ...snapshot, refresh }),
    [snapshot, refresh]
  );

  return createElement(NetworkContext.Provider, { value }, children);
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (ctx) return ctx;
  return {
    ...cachedSnapshot,
    refresh: async () => {
      await refreshNetworkSnapshot();
    },
  };
}

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { chatCache } from "@/lib/chat/cache";

interface UnreadCounts {
  [groupId: string]: number;
}

interface UnreadContextValue {
  counts: UnreadCounts;
  total: number;
  increment: (groupId: string, delta?: number) => void;
  clear: (groupId: string) => void;
  set: (groupId: string, count: number) => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<UnreadCounts>({});

  // Hydrate from SQLite on mount so badges survive app restarts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const states = await chatCache.getAllGroupStates();
      if (cancelled) return;
      const hydrated: UnreadCounts = {};
      for (const s of states) {
        if (s.unreadCount > 0) hydrated[s.groupId] = s.unreadCount;
      }
      setCounts(hydrated);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const increment = useCallback((groupId: string, delta = 1) => {
    setCounts((prev) => {
      const next = (prev[groupId] ?? 0) + delta;
      void chatCache.setUnread(groupId, next);
      return { ...prev, [groupId]: next };
    });
  }, []);

  const clear = useCallback((groupId: string) => {
    setCounts((prev) => {
      const next = { ...prev };
      delete next[groupId];
      void chatCache.setUnread(groupId, 0);
      return next;
    });
  }, []);

  const set = useCallback((groupId: string, count: number) => {
    setCounts((prev) => {
      void chatCache.setUnread(groupId, count);
      return { ...prev, [groupId]: count };
    });
  }, []);

  return (
    <UnreadContext.Provider value={{ counts, total, increment, clear, set }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used within UnreadProvider");
  return ctx;
}

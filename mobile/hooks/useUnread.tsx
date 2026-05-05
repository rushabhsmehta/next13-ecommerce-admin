import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const increment = useCallback((groupId: string, delta = 1) => {
    setCounts((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? 0) + delta,
    }));
  }, []);

  const clear = useCallback((groupId: string) => {
    setCounts((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const set = useCallback((groupId: string, count: number) => {
    setCounts((prev) => ({ ...prev, [groupId]: count }));
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
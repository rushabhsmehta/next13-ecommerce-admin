import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface WhatsAppUnreadContextValue {
  total: number;
  setTotal: (n: number) => void;
  increment: (delta?: number) => void;
  clear: () => void;
}

const WhatsAppUnreadContext = createContext<WhatsAppUnreadContextValue | null>(null);

export function WhatsAppUnreadProvider({ children }: { children: ReactNode }) {
  const [total, setTotalState] = useState(0);

  const setTotal = useCallback((n: number) => {
    setTotalState(Math.max(0, Math.floor(n)));
  }, []);

  const increment = useCallback((delta = 1) => {
    setTotalState((prev) => Math.max(0, prev + Math.floor(delta)));
  }, []);

  const clear = useCallback(() => setTotalState(0), []);

  return (
    <WhatsAppUnreadContext.Provider value={{ total, setTotal, increment, clear }}>
      {children}
    </WhatsAppUnreadContext.Provider>
  );
}

export function useWhatsAppUnread() {
  const ctx = useContext(WhatsAppUnreadContext);
  if (!ctx) {
    throw new Error("useWhatsAppUnread must be used within WhatsAppUnreadProvider");
  }
  return ctx;
}

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface WhatsAppUnreadContextValue {
  total: number;
  setTotal: (n: number) => void;
  clear: () => void;
}

const WhatsAppUnreadContext = createContext<WhatsAppUnreadContextValue | null>(null);

export function WhatsAppUnreadProvider({ children }: { children: ReactNode }) {
  const [total, setTotalState] = useState(0);

  const setTotal = useCallback((n: number) => {
    setTotalState(Math.max(0, Math.floor(n)));
  }, []);

  const clear = useCallback(() => setTotalState(0), []);

  return (
    <WhatsAppUnreadContext.Provider value={{ total, setTotal, clear }}>
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

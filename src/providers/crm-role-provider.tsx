"use client";

import * as React from "react";
import type { AppRole } from "@/lib/authz";

const CrmRoleContext = React.createContext<AppRole | null | undefined>(undefined);

export function CrmRoleProvider({
  role,
  children,
}: {
  role: AppRole | null;
  children: React.ReactNode;
}) {
  return <CrmRoleContext.Provider value={role}>{children}</CrmRoleContext.Provider>;
}

/** `undefined` = outside `(dashboard)` layout; `null` = no org membership (associate portal uses this). */
export function useCrmOrgRole(): AppRole | null | undefined {
  return React.useContext(CrmRoleContext);
}

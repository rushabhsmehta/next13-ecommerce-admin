"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { travelHref, travelHomeHref } from "@/lib/travel-paths";

const TravelPathContext = createContext<string>("/travel");

export function TravelPathProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <TravelPathContext.Provider value={basePath}>
      {children}
    </TravelPathContext.Provider>
  );
}

export function useTravelPath() {
  const basePath = useContext(TravelPathContext);
  const pathname = usePathname() ?? "";
  const resolvedBasePath = pathname.startsWith("/travel")
    ? "/travel"
    : basePath;

  return {
    basePath: resolvedBasePath,
    home: travelHomeHref(resolvedBasePath),
    href: (subpath: string) => travelHref(subpath, resolvedBasePath),
  };
}

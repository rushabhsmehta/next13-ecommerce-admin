"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { DebugLogPanel } from "@/components/DebugLogPanel";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { isTravelPublicBrowserPath } from "@/lib/travel-paths";

// Public, chrome-less pages: PDF generator + display pages rendered
// unauthenticated by the internal PDF pipeline (Puppeteer). They must NOT mount
// the dashboard sidebar, which polls auth-protected APIs and triggers a
// client-side redirect to /sign-in for the (sessionless) headless browser —
// previously yielding blank/"damaged" PDFs. Match the public prefixes in
// `src/proxy.ts` / `CRM_PUBLIC_DASHBOARD_PREFIXES`.
const CHROMELESS_PREFIXES = [
  "/tourpackagequerydisplay",
  "/tourpackagequeryvariantdisplay",
  "/tourpackagequerypdfgenerator",
  "/tourpackagequerypdfgeneratorwithvariants",
  "/tourpackagequeryvoucherdisplay",
  "/tourpackagepdfgenerator",
  "/tourpackagepdfgeneratorwithvariants",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTravelRoute =
    pathname?.startsWith("/travel") ||
    (pathname ? isTravelPublicBrowserPath(pathname) : false);
  const isAuthRoute =
    pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");
  const lowerPath = (pathname || "").toLowerCase();
  const isChromelessRoute = CHROMELESS_PREFIXES.some((p) =>
    lowerPath.startsWith(p)
  );

  if (isTravelRoute || isAuthRoute || isChromelessRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <DebugLogPanel />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-auto">
          <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 backdrop-blur px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
          </div>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

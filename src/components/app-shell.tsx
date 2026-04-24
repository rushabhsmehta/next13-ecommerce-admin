"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { DebugLogPanel } from "@/components/DebugLogPanel";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTravelRoute = pathname?.startsWith("/travel");

  if (isTravelRoute) {
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

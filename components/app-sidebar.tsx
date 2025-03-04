"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutGrid, type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Sidebar Navigation Data with appropriate structure for Collapsible components
const NAV_ITEMS = [
  {
    title: "Dashboard",
    items: [
      { title: "Inquiries", url: "/inquiries" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { title: "Locations", url: "/locations" },
      { title: "Hotels", url: "/hotels" },
      { title: "Itineraries", url: "/itinerariesMaster" },
      { title: "Activities", url: "/activitiesMaster" },
      { title: "Tour Packages", url: "/tourPackages" },
    ],
  },
  {
    title: "Business",
    items: [
      { title: "Associates", url: "/associate-partners" },
      { title: "Customers", url: "/customers" },
      { title: "Suppliers", url: "/suppliers" },       
      { title: "Tour Package Query", url: "/tourPackageQuery" },
      { title: "Cash Account", url: "/cashaccounts" },
      { title: "Bank Account", url: "/bankaccounts" },
    ],
  },
 
  {
    title: "Reports",
    items: [
      { title: "Inquiry Summary", url: "/reports/inquirySummary" },
      { title: "Confirmed Queries", url: "/reports/confirmedQueries" },
      { title: "Unconfirmed Queries", url: "/reports/unconfirmedQueries" },
      { title: "Associate Performance", url: "/reports/associatePerformance" },
      { title: "Cash Book", url: "/cash-book" },
      { title: "Bank Book", url: "/bank-book" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Admin Panel</span>
                  <span className="">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((section) => (
              <Collapsible
                key={section.title}
                asChild
                defaultOpen={section.items.some(item => pathname === item.url)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <span className="font-semibold text-gray-700">{section.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {section.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

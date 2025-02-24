"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { LayoutGrid } from "lucide-react"; // Replaced invalid `GalleryVerticalEnd` icon

// Sidebar Navigation Data
const NAV_ITEMS = [
  {
    title: "Dashboard",
    items: [
      { title: "Overview", url: "/" },
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
      { title: "Inquiries", url: "/inquiries" },
      { title: "Associate Partners", url: "/associates" },
      { title: "Tour Package Query", url: "/tourPackageQuery" },
    ],
  },
  {
    title: "Users",
    items: [
      { title: "Customers", url: "/customers" },
      { title: "Suppliers", url: "/suppliers" },
      { title: "Associates", url: "/associate-partners" },
    ],
  },
  {
    title: "Reports",
    items: [
      { title: "Inquiry Summary", url: "/reports/inquirySummary" },
      { title: "Confirmed Queries", url: "/reports/confirmedQueries" },
      { title: "Unconfirmed Queries", url: "/reports/unconfirmedQueries" },
      { title: "Associate Performance", url: "/reports/associatePerformance" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      {/* Sidebar Header */}
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

      {/* Sidebar Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((section) => (
              <SidebarMenuItem key={section.title}>
                <SidebarMenuButton asChild>
                  <span className="font-semibold text-gray-700">{section.title}</span>
                </SidebarMenuButton>
                {section.items.length ? (
                  <SidebarMenuSub>
                    {section.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                          <Link href={item.url}>{item.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Rail for Collapsing */}
      <SidebarRail />
    </Sidebar>
  );
}

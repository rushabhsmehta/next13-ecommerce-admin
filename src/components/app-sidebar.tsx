"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutGrid, LogOutIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "./theme-toggle";
import { SignOutButton } from "@clerk/nextjs";
import router from "next/router";


// Sidebar Navigation Data with appropriate structure for Collapsible components
const NAV_ITEMS = [
  {
    title: "Dashboard",
    items: [
      { title: "Inquiries", url: "/inquiries" },
      { title: "Tour Package Query", url: "/tourPackageQuery" },
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
      { title: "Cash Account", url: "/cashaccounts" },
      { title: "Bank Account", url: "/bankaccounts" },
      { title: "Fund Transfers", url: "/transfers" },
    ],
  },
  {
    title: "Categories",
    items: [
      { title: "Income Categories", url: "/income-categories" },
      { title: "Expense Categories", url: "/expense-categories" },
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Incomes", url: "/incomes" },
      { title: "Expenses", url: "/expenses" },
      { title: "Sales Ledger", url: "/sales/ledger" },
      { title: "Purchase Ledger", url: "/purchases/ledger" },
      { title: "Receipt Ledger", url: "/receipts/ledger" },
      { title: "Payment Ledger", url: "/payments/ledger" },
      { title: "Expense Ledger", url: "/expenses/ledger" },
      { title: "Income Ledger", url: "/incomes/ledger" },
      { title: "Customer Statements", url: "/customers/ledger" },
      { title: "Supplier Statements", url: "/suppliers/ledger" },
      { title: "Cash Book", url: "/cash-book" },
      { title: "Bank Book", url: "/bank-book" },
    ],
  },
  {
    title: "Reports",
    items: [
      /*       { title: "Profit Report", url: "/reports/profit" },
      { title: "GST Report", url: "/reports/gst" }, */
      { title: "Upcoming Trips", url: "/reports/upcomingTrips" },
      { title: "Inquiry Summary", url: "/reports/inquirySummary" },
      { title: "Confirmed Queries", url: "/reports/confirmedQueries" },
      { title: "Unconfirmed Queries", url: "/reports/unconfirmedQueries" },
      { title: "Associate Performance", url: "/reports/associatePerformance" },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Organization Profile", url: "/settings/organization" },
      { title: "Units of Measure", url: "/settings/units" },
      { title: "Tax Slabs", url: "/settings/tax-slabs" },
      { title: "Invoice Settings", url: "/settings/invoice" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Check if a section should be expanded
  const isSectionActive = (section: { title: string, items: { url: string }[] }) => {
    return section.items.some(item => pathname === item.url || pathname.startsWith(item.url + '/'));
  };

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
                  <span className="font-semibold">Finance Manager</span>
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
                defaultOpen={isSectionActive(section)}
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
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                          >
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


      {/* Add a footer with the theme switcher */}
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between mt-4">
          <SignOutButton signOutCallback={()=> { router.replace("/sign-in"); }}>
            <LogOutIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-muted-foreground">Sign out</span>
          </SignOutButton>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar >
  );
}


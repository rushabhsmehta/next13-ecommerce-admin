"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  ArrowLeftRight,
  BarChart3,
  Building2,
  ChevronRight, 
  Coins, 
  CreditCard, 
  DollarSign, 
  FileText, 
  LayoutGrid, 
  ListOrdered, 
  PackageSearch, 
  Receipt, 
  ShoppingBag, 
  Tags, 
  Users, 
  Wallet 
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarSection } from "@/types";

// Enhanced Sidebar Navigation Data with icons and additional routes
const NAV_ITEMS: SidebarSection[] = [
  {
    title: "Dashboard",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
      { title: "Inquiries", url: "/inquiries", icon: FileText },
      { title: "Tour Package Query", url: "/tourPackageQuery", icon: ShoppingBag },
    ],
  },
  {
    title: "Master Data",
    items: [
      { title: "Locations", url: "/locations", icon: LayoutGrid },
      { title: "Hotels", url: "/hotels", icon: Building2 },
      { title: "Itineraries", url: "/itinerariesMaster", icon: ListOrdered },
      { title: "Activities", url: "/activitiesMaster", icon: ShoppingBag },
      { title: "Tour Packages", url: "/tourPackages", icon: ShoppingBag },
    ],
  },
  {
    title: "Business",
    items: [
      { title: "Associates", url: "/associate-partners", icon: Users },
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Suppliers", url: "/suppliers", icon: PackageSearch },
    ],
  },
  {
    title: "Accounts",
    items: [
      { title: "Bank Accounts", url: "/bank-accounts", icon: Building2 },
      { title: "Cash Accounts", url: "/cash-accounts", icon: Wallet },
      { title: "Fund Transfers", url: "/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Categories",
    items: [
      { title: "Expense Categories", url: "/expense-categories", icon: Tags },
      { title: "Income Categories", url: "/income-categories", icon: ListOrdered },
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Sales Ledger", url: "/sales/ledger", icon: DollarSign },
      { title: "Purchase Ledger", url: "/purchases/ledger", icon: CreditCard },
      { title: "Receipt Ledger", url: "/receipts/ledger", icon: Receipt },
      { title: "Payment Ledger", url: "/payments/ledger", icon: Coins },
      { title: "Expense Ledger", url: "/expenses/ledger", icon: CreditCard },
      { title: "Income Ledger", url: "/incomes/ledger", icon: DollarSign },
      { title: "Customer Statements", url: "/customers/ledger", icon: FileText },
      { title: "Supplier Statements", url: "/suppliers/ledger", icon: FileText },
      { title: "Cash Book", url: "/cash-book", icon: Wallet },
      { title: "Bank Book", url: "/bank-book", icon: Building2 },
    ],
  },
  {
    title: "Reports",
    items: [
      { title: "Upcoming Trips", url: "/reports/upcomingTrips", icon: BarChart3 },
      { title: "Inquiry Summary", url: "/reports/inquirySummary", icon: BarChart3 },
      { title: "Confirmed Queries", url: "/reports/confirmedQueries", icon: BarChart3 },
      { title: "Unconfirmed Queries", url: "/reports/unconfirmedQueries", icon: BarChart3 },
      { title: "Associate Performance", url: "/reports/associatePerformance", icon: BarChart3 },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Check if a section should be expanded
  const isSectionActive = (section: SidebarSection) => {
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

      <SidebarContent className="pb-4">
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
                            <Link href={item.url} className="flex items-center">
                              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                              {item.title}
                            </Link>
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

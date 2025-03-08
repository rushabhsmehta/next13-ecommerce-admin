"use client";

import * as React from "react";
import Link from "next/link";

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
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, BarChart3, Building2, Coins, CreditCard, DollarSign, LayoutDashboard, ListOrdered, PackageSearch, Receipt, Tags, Users, Wallet } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Separator } from "./ui/separator";

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
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Sales Ledger", url: "/sales/ledger" },
      { title: "Purchase Ledger", url: "/purchases/ledger" },
      { title: "Receipt Ledger", url: "/receipts/ledger" },
      { title: "Payment Ledger", url: "/payments/ledger" },
      { title: "Expense Ledger", url: "/expenses/ledger" },
      { title: "Income Ledger", url: "/incomes/ledger" },  // Add Income Ledger
      { title: "Customer Statements", url: "/customers/ledger" },
      { title: "Supplier Statements", url: "/suppliers/ledger" },
      { title: "Cash Book", url: "/cash-book" },
      { title: "Bank Book", url: "/bank-book" },
    ],
  },
  {
    title: "Reports",
    items: [
      { title: "Upcoming Trips", url: "/reports/upcomingTrips" },
      { title: "Inquiry Summary", url: "/reports/inquirySummary" },
      { title: "Confirmed Queries", url: "/reports/confirmedQueries" },
      { title: "Unconfirmed Queries", url: "/reports/unconfirmedQueries" },
      { title: "Associate Performance", url: "/reports/associatePerformance" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const params = useParams();
  const [financialOpen, setFinancialOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const routes = [
    {
      href: `/dashboard`,
      label: 'Dashboard',
      active: pathname === `/dashboard`,
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />
    },
    {
      href: `/tourPackageQuery`,
      label: 'Tour Package',
      active: pathname === `/tourPackageQuery` || pathname.includes(`/tourPackageQuery`),
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />
    },
    {
      href: `/inquiries`,
      label: 'Inquiries',
      active: pathname.includes(`/inquiries`),
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />
    },
    {
      href: `/customers`,
      label: 'Customers',
      active: pathname.includes(`/customers`),
      icon: <Users className="w-5 h-5 mr-3" />
    },
    {
      href: `/locations`,
      label: 'Locations',
      active: pathname.includes(`/locations`),
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />
    },
  ];

  // Financial routes section
  const financialRoutes = [
    // Bank & Cash Management
    {
      href: `/bank-accounts`,
      label: 'Bank Accounts',
      active: pathname.includes(`/bank-accounts`),
      icon: <Building2 className="w-5 h-5 mr-3" />
    },
    {
      href: `/cash-accounts`,
      label: 'Cash Accounts',
      active: pathname.includes(`/cash-accounts`),
      icon: <Wallet className="w-5 h-5 mr-3" />
    },
    {
      href: `/transfers`,
      label: 'Fund Transfers',
      active: pathname.includes(`/transfers`),
      icon: <ArrowLeftRight className="w-5 h-5 mr-3" />
    },
    {
      href: `/suppliers`,
      label: 'Suppliers',
      active: pathname.includes(`/suppliers`),
      icon: <PackageSearch className="w-5 h-5 mr-3" />
    },
    {
      href: `/purchases/ledger`,
      label: 'Purchase Ledger',
      active: pathname.includes(`/purchases/ledger`),
      icon: <CreditCard className="w-5 h-5 mr-3" />
    },
    {
      href: `/sales/ledger`,
      label: 'Sales Ledger',
      active: pathname.includes(`/sales/ledger`),
      icon: <DollarSign className="w-5 h-5 mr-3" />
    },
    {
      href: `/receipts/ledger`,
      label: 'Receipt Ledger',
      active: pathname.includes(`/receipts/ledger`),
      icon: <Receipt className="w-5 h-5 mr-3" />
    },
    {
      href: `/payments/ledger`,
      label: 'Payment Ledger',
      active: pathname.includes(`/payments/ledger`),
      icon: <Coins className="w-5 h-5 mr-3" />
    },
    {
      href: `/expenses/ledger`,
      label: 'Expense Ledger',
      active: pathname.includes(`/expenses/ledger`),
      icon: <CreditCard className="w-5 h-5 mr-3" />
    },
    {
      href: `/incomes/ledger`,
      label: 'Income Ledger',
      active: pathname.includes(`/incomes/ledger`),
      icon: <DollarSign className="w-5 h-5 mr-3" />
    },
  ];

  // Categories routes section
  const categoryRoutes = [
    {
      href: `/expense-categories`,
      label: 'Expense Categories',
      active: pathname.includes(`/expense-categories`),
      icon: <Tags className="w-5 h-5 mr-3" />
    },
    {
      href: `/income-categories`,
      label: 'Income Categories',
      active: pathname.includes(`/income-categories`),
      icon: <ListOrdered className="w-5 h-5 mr-3" />
    },
  ];

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

      <div className={cn("pb-12 min-h-screen", props.className)}>
        <div className="space-y-4 py-4">
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
              Finance Manager
            </h2>
            <div className="space-y-1">
              {routes.map((route) => (
                <Button
                  key={route.href}
                  variant={route.active ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={route.href}>
                    {route.icon}
                    {route.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Financial Management Section */}
          <Collapsible
            open={financialOpen}
            onOpenChange={setFinancialOpen}
            className="px-4 py-2"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between"
              >
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3" />
                  <span>Financial Management</span>
                </div>
                <span className={`transition-transform ${financialOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {financialRoutes.map((route) => (
                <Button
                  key={route.href}
                  variant={route.active ? "secondary" : "ghost"}
                  className="w-full justify-start pl-8"
                  asChild
                >
                  <Link href={route.href}>
                    {route.icon}
                    {route.label}
                  </Link>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Categories Management Section */}
          <Collapsible
            open={categoriesOpen}
            onOpenChange={setCategoriesOpen}
            className="px-4 py-2"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between"
              >
                <div className="flex items-center">
                  <Tags className="w-5 h-5 mr-3" />
                  <span>Categories</span>
                </div>
                <span className={`transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {categoryRoutes.map((route) => (
                <Button
                  key={route.href}
                  variant={route.active ? "secondary" : "ghost"}
                  className="w-full justify-start pl-8"
                  asChild
                >
                    <Link href={route.href}>
                      {route.icon}
                      {route.label}
                    </Link>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />
        </div>
      </div>

      <SidebarRail />
    </Sidebar>
  );
}

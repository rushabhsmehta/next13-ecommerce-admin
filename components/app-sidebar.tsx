"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftRight, 
  BarChart3, 
  Building2, 
  Coins, 
  CreditCard, 
  DollarSign, 
  LayoutDashboard, 
  ListOrdered, 
  PackageSearch, 
  Receipt, 
  Tags, 
  Users, 
  Wallet,
  Map,
  Store,
  Hotel,
  Plane,
  FileQuestion,
  Settings,
  BriefcaseBusiness
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState } from "react";
import { Separator } from "./ui/separator";

export function AppSidebar({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname();
  const params = useParams();
  
  // State for collapsible sections
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [tourManagementOpen, setTourManagementOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [ledgersOpen, setLedgersOpen] = useState(false);

  // Main Dashboard routes
  const dashboardRoutes = [
    {
      href: `/dashboard`,
      label: 'Dashboard',
      active: pathname === `/dashboard`,
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />
    }
  ];

  // Tour Management routes
  const tourManagementRoutes = [
    {
      href: `/tourPackageQuery`,
      label: 'Tour Packages',
      active: pathname === `/tourPackageQuery` || pathname.includes(`/tourPackageQuery`),
      icon: <BriefcaseBusiness className="w-5 h-5 mr-3" />
    },
    {
      href: `/inquiries`,
      label: 'Inquiries',
      active: pathname.includes(`/inquiries`),
      icon: <FileQuestion className="w-5 h-5 mr-3" />
    },
    {
      href: `/locations`,
      label: 'Locations',
      active: pathname.includes(`/locations`),
      icon: <Map className="w-5 h-5 mr-3" />
    },
    {
      href: `/hotels`,
      label: 'Hotels',
      active: pathname.includes(`/hotels`),
      icon: <Hotel className="w-5 h-5 mr-3" />
    }
  ];

  // Accounts management routes
  const accountsRoutes = [
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
    }
  ];

  // Categories routes
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
    }
  ];

  // Ledger routes
  const ledgerRoutes = [
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
    }
  ];

  // Customer / Suppliers routes
  const contactsRoutes = [
    {
      href: `/customers`,
      label: 'Customers',
      active: pathname.includes(`/customers`),
      icon: <Users className="w-5 h-5 mr-3" />
    },
    {
      href: `/suppliers`,
      label: 'Suppliers',
      active: pathname.includes(`/suppliers`),
      icon: <PackageSearch className="w-5 h-5 mr-3" />
    }
  ];

  return (
    <div className={cn("pb-12 min-h-screen", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-4 px-2 text-xl font-semibold tracking-tight">
            Travel Manager
          </h2>
          
          {/* Dashboard Section */}
          <div className="space-y-1">
            {dashboardRoutes.map((route) => (
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
        
        {/* Tour Management Section */}
        <Collapsible
          open={tourManagementOpen}
          onOpenChange={setTourManagementOpen}
          className="px-4 py-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between"
            >
              <div className="flex items-center">
                <Plane className="w-5 h-5 mr-3" />
                <span>Tour Management</span>
              </div>
              <span className={`transition-transform ${tourManagementOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {tourManagementRoutes.map((route) => (
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

        {/* Contacts Section */}
        <div className="px-4 py-2">
          <div className="space-y-1">
            {contactsRoutes.map((route) => (
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

        <Separator className="my-2" />
        
        {/* Financial Management - Main Section */}
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
          <CollapsibleContent className="space-y-1 pt-1">
            {/* Account Management Sub-Section */}
            <Collapsible
              open={accountsOpen}
              onOpenChange={setAccountsOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between pl-8"
                >
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 mr-3" />
                    <span>Accounts</span>
                  </div>
                  <span className={`transition-transform ${accountsOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                {accountsRoutes.map((route) => (
                  <Button
                    key={route.href}
                    variant={route.active ? "secondary" : "ghost"}
                    className="w-full justify-start pl-12"
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

            {/* Categories Sub-Section */}
            <Collapsible
              open={categoriesOpen}
              onOpenChange={setCategoriesOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between pl-8"
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
                    className="w-full justify-start pl-12"
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

            {/* Ledgers Sub-Section */}
            <Collapsible
              open={ledgersOpen}
              onOpenChange={setLedgersOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between pl-8"
                >
                  <div className="flex items-center">
                    <Receipt className="w-5 h-5 mr-3" />
                    <span>Ledgers</span>
                  </div>
                  <span className={`transition-transform ${ledgersOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                {ledgerRoutes.map((route) => (
                  <Button
                    key={route.href}
                    variant={route.active ? "secondary" : "ghost"}
                    className="w-full justify-start pl-12"
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
          </CollapsibleContent>
        </Collapsible>

        <Separator />
      </div>
    </div>
  );
}

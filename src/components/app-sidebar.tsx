"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutGrid, LogOutIcon, User } from "lucide-react";
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
import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";

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

// Sidebar items for associate users - only show inquiries
const ASSOCIATE_NAV_ITEMS = [
  {
    title: "Dashboard",
    items: [
      { title: "Inquiries", url: "/inquiries" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isAssociateDomain, setIsAssociateDomain] = useState(false);
  const [navItems, setNavItems] = useState(NAV_ITEMS);
  const [associateName, setAssociateName] = useState<string | null>(null);

  // Check if the domain is associate domain
  useEffect(() => {
    const hostname = window.location.hostname;
    const isAssociate = hostname.includes('associate.aagamholidays.com');
    setIsAssociateDomain(isAssociate);

    // Set nav items based on domain
    if (isAssociate) {
      setNavItems(ASSOCIATE_NAV_ITEMS);

      // Fetch associate information
      fetch('/api/associate-partners/me')
        .then(response => {
          if (response.ok) return response.json();
          return null;
        })
        .then(data => {
          if (data && data.name) {
            setAssociateName(data.name);
          }
        })
        .catch(err => {
          console.error("Error fetching associate details:", err);
        });
    } else {
      setNavItems(NAV_ITEMS);
    }
  }, []);

  // Check if a section should be expanded
  const isSectionActive = (section: { title: string; items: { url: string }[] }) =>
    section.items.some(
      (item) => pathname === item.url || pathname.startsWith(item.url + "/")
    );

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get user display name
  const userFullName = user?.fullName || user?.firstName || "User";
  const userInitials = user?.firstName?.charAt(0) || "U";

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              {/* User info section */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {isAssociateDomain && associateName ? associateName : userFullName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isAssociateDomain ? 'Associate Partner' : 'Admin User'}
                    </span>
                  </div>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>



      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((section) => (
              <Collapsible
                key={section.title}
                asChild
                defaultOpen={isSectionActive(section)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <span className="font-semibold text-gray-700">
                        {section.title}
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {section.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={
                              pathname === item.url ||
                              pathname.startsWith(item.url + "/")
                            }
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

      {/* Add a footer with the notification bell, theme switcher and sign out button */}
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Notifications</span>
          <NotificationBell />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <div className="mt-4">
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center"
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
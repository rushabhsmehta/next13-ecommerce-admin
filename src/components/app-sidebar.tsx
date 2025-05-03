"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  SidebarTrigger,
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
      { title: "Operational Staff", url: "/operational-staff" },
      { title: "Customers", url: "/customers" },
      { title: "Suppliers", url: "/suppliers" },
      { title: "Cash Account", url: "/cashaccounts" },
      { title: "Bank Account", url: "/bankaccounts" },
      { title: "Fund Transfers", url: "/transfers" },
    ],
  },  {
    title: "Categories",
    items: [
      { title: "Income Categories", url: "/income-categories" },
      { title: "Expense Categories", url: "/expense-categories" },
    ],
  },  {
    title: "Configuration",
    items: [
      { title: "Meal Plans", url: "/settings/meal-plans" },
      { title: "Room Types", url: "/settings/room-types" },
      { title: "Occupancy Types", url: "/settings/occupancy-types" },
      { title: "Vehicle Types", url: "/settings/vehicle-types" },
      { title: "Pricing Attributes", url: "/settings/pricing-attributes" },
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
  },  {
    title: "Tools",
    items: [
      { title: "AI Image Generator", url: "/ai-image-generator" },
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


import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isAssociateDomain, setIsAssociateDomain] = useState(false);
  const [navItems, setNavItems] = useState(NAV_ITEMS);
  const [associateName, setAssociateName] = useState<string | null>(null);
  const isMobile = useIsMobile();

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
    <>
      {/* Mobile sidebar trigger button */}
      {isMobile && (
        <div className="fixed top-2 left-2 z-50 md:hidden">
          <SidebarTrigger />
        </div>
      )}
      <Sidebar {...props}>
        <SidebarHeader className="pb-0">
          {/* More compact user info section without logo */}
          <div className="px-3 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-col">
                    <span className="font-medium text-xs">
                      {isAssociateDomain && associateName ? associateName : userFullName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isAssociateDomain ? (
                        <>
                          Associate Portal<br />
                          Aagam Holidays
                        </>
                      ) : 'Admin Dashboard'}
                    </span>                  
                  </div>
                </div>
              </div>
              {/* Only show notification bell in admin domain, not in associate domain */}
              {!isAssociateDomain && <NotificationBell />}
            </div>
          </div>
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

        {/* Footer with combined theme toggle and sign out buttons */}
        <SidebarFooter className="border-t p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              <span>Sign out</span>
            </Button>
            <ThemeToggle />
          </div>
          
          {/* Copyright footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Aagam Holidays
            </p>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
"use client";

import Link from "next/link"
import { useParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const params = useParams();

  const routes = [
    {
      href: `/`,
      label: 'Dashboard',
      active: pathname === `/`,
    },
    {
      href: `/locations`,
      label: 'Locations',
      active: pathname === `/locations`,
    },
    {
      href: `/tour-packages-query`,
      label: 'Tour Packages Queries',
      active: pathname === `/tour-packages-query`,
    },
    {
      href: `/inquiries`,
      label: 'Inquiries',
      active: pathname === `/inquiries`,
    },
    {
      href: `/associate-partners`,
      label: 'Associate Partners',
      active: pathname === `/associate-partners`,
    },
    {
      href: `/customers`,
      label: 'Customers',
      active: pathname === `/customers`,
    },
    {
      href: `/suppliers`,
      label: 'Suppliers',
      active: pathname === `/suppliers`,
    },
    {
      href: `/sales/ledger`,
      label: 'Sales Ledger',
      active: pathname === `/sales/ledger`,
    },
    {
      href: `/purchases/ledger`,
      label: 'Purchase Ledger',
      active: pathname === `/purchases/ledger`,
    },
    // Add other routes as needed
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6 overflow-auto", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
            route.active ? "text-black dark:text-white" : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
};

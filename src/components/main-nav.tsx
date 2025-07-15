"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

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
    {
      href: `/receipts/ledger`,
      label: 'Receipt Ledger',
      active: pathname === `/receipts/ledger`,
    },
    {
      href: `/payments/ledger`,
      label: 'Payment Ledger',
      active: pathname === `/payments/ledger`,
    },
    {
      href: `/expenses/ledger`,
      label: 'Expense Ledger',
      active: pathname === `/expenses/ledger`,
    },
    {
      href: `/incomes/ledger`,
      label: 'Income Ledger',
      active: pathname === `/incomes/ledger`,
    },
    {
      href: `/customers/ledger`,
      label: 'Customer Statements',
      active: pathname === `/customers/ledger`,
    },
    {
      href: `/suppliers/ledger`,
      label: 'Supplier Statements',
      active: pathname === `/suppliers/ledger`,
    },
    {
      href: `/transfers`,
      label: 'Fund Transfers',
      active: pathname === `/transfers`,
    },
    {
      href: `/expense-categories`,
      label: 'Expense Categories',
      active: pathname === `/expense-categories`,
    },
    {
      href: `/income-categories`,
      label: 'Income Categories',
      active: pathname === `/income-categories`,
    },
    {
      href: `/whatsapp`,
      label: 'WhatsApp Business',
      active: pathname === `/whatsapp`,
    },
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


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
      href: `/${params.storeId}`,
      label: 'Overview',
      active: pathname === `/${params.storeId}`,
    },
    /*  {
      href: `/${params.storeId}/billboards`,
      label: 'Billboards',
      active: pathname === `/${params.storeId}/bill boards`,
    },  */   
    {
      href: `/${params.storeId}/locations`,
      label: 'Locations',
      active: pathname === `/${params.storeId}/locations`,
    },
    {
      href: `/${params.storeId}/hotels`,
      label: 'Hotels',
      active: pathname === `/${params.storeId}/hotels`,
    },
    {
      href: `/${params.storeId}/itinerariesMaster`,
      label: 'Itineraries',
      active: pathname === `/${params.storeId}/itinerariesMaster`,
    },
    {
      href: `/${params.storeId}/activitiesMaster`,
      label: 'Activities',
      active: pathname === `/${params.storeId}/activitiesMaster`,
    },
    {
      href: `/${params.storeId}/tourPackages`,
      label: 'Tour Packages',
      active: pathname === `/${params.storeId}/tourPackages`,
    },
    {
      href: `/${params.storeId}/tourPackageQuery`,
      label: 'Tour Package Query',
      active: pathname === `/${params.storeId}/tourPackageQuery`,
    },

    {
      href: `/${params.storeId}/reports`,
      label: 'Reports',
      active: pathname === `/${params.storeId}/reports`,
    },
    
    /* {
      href: `/${params.storeId}/itineraries`,
      label: 'Itineraries',
      active: pathname === `/${params.storeId}/itineraries`,
    },

    {
      href: `/${params.storeId}/categories`,
      label: 'Categories',
      active: pathname === `/${params.storeId}/categories`,
    },
     {
      href: `/${params.storeId}/sizes`,
      label: 'Sizes',
      active: pathname === `/${params.storeId}/sizes`,
    },
    {
      href: `/${params.storeId}/colors`,
      label: 'Colors',
      active: pathname === `/${params.storeId}/colors`,
    },
    {
      href: `/${params.storeId}/products`,
      label: 'Products',
      active: pathname === `/${params.storeId}/products`,
    }, 
    
    {
      href: `/${params.storeId}/orders`,
      label: 'Orders',
      active: pathname === `/${params.storeId}/orders`,
    }, */
    {
      href: `/${params.storeId}/settings`,
      label: 'Settings',
      active: pathname === `/${params.storeId}/settings`,
    },
  ]

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            route.active ? 'text-black dark:text-white' : 'text-muted-foreground'
          )}
        >
          {route.label}
      </Link>
      ))}
    </nav>
  )
};

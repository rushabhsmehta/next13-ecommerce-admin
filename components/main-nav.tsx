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
   /* {
      href: ``,
      label: 'Overview',
      active: pathname === ``,
    },
      {
      href: `/billboards`,
      label: 'Billboards',
      active: pathname === `/bill boards`,
    },  */   
    {
      href: `/locations`,
      label: 'Locations',
      active: pathname === `/locations`,
    },
    {
      href: `/hotels`,
      label: 'Hotels',
      active: pathname === `/hotels`,
    },
    {
      href: `/itinerariesMaster`,
      label: 'Itineraries',
      active: pathname === `/itinerariesMaster`,
    },
    {
      href: `/activitiesMaster`,
      label: 'Activities',
      active: pathname === `/activitiesMaster`,
    },
    {
      href: `/tourPackages`,
      label: 'Tour Packages',
      active: pathname === `/tourPackages`,
    },
    {
      href: `/tourPackageQuery`,
      label: 'Tour Package Query',
      active: pathname === `/tourPackageQuery`,
    },

    {
      href: `/reports`,
      label: 'Reports',
      active: pathname === `/reports`,
    },
    
    /* {
      href: `/itineraries`,
      label: 'Itineraries',
      active: pathname === `/itineraries`,
    },

    {
      href: `/categories`,
      label: 'Categories',
      active: pathname === `/categories`,
    },
     {
      href: `/sizes`,
      label: 'Sizes',
      active: pathname === `/sizes`,
    },
    {
      href: `/colors`,
      label: 'Colors',
      active: pathname === `/colors`,
    },
    {
      href: `/products`,
      label: 'Products',
      active: pathname === `/products`,
    }, 
    
    {
      href: `/orders`,
      label: 'Orders',
      active: pathname === `/orders`,
    }, 
    {
      href: `/settings`,
      label: 'Settings',
      active: pathname === `/settings`,
    },*/
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

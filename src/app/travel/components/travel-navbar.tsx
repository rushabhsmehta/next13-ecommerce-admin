"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleUserRound, Home } from "lucide-react";

export function TravelNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/travel" && pathname?.startsWith(href));

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-orange-500/5 border-b border-orange-100/50"
          : "bg-white/80 backdrop-blur-md border-b border-gray-100/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link href="/travel" className="flex items-center group">
            <div className="relative w-24 h-8 sm:w-32 sm:h-11 transition-transform duration-300 group-hover:scale-[1.02]">
              <Image
                src="/aagamholidays.png"
                alt="Aagam Holidays"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 96px, 128px"
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {[
              { href: "/travel", label: "Home", icon: Home },
              { href: "/travel/account", label: "Account", icon: CircleUserRound },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
